// src/main/simulator.ts

import { dbHelpers } from './database';

interface SimulacionResultado {
  material_id: number;
  material_nombre: string;
  unidad_abrev: string;
  stock_actual: number;
  stock_minimo: number;
  consumo_proyectado: number;
  stock_proyectado: number;
  porcentaje_stock: number;
  estado: 'critico' | 'bajo' | 'alerta' | 'ok';
  dias_hasta_agotamiento: number | null;
  requiere_orden: boolean;
  cantidad_ordenar: number;
  proveedor_nombre: string;
  tiempo_entrega_dias: number;
}

interface ResultadoSimulacion {
  avance_simulado: number;
  materiales: SimulacionResultado[];
  resumen: {
    total_materiales: number;
    materiales_criticos: number;
    materiales_requieren_orden: number;
    costo_estimado_ordenes: number;
  };
}

/**
 * Simula el consumo de materiales si el proyecto avanza hasta un porcentaje específico
 */
export function simularConsumoProyecto(
  proyectoId: number,
  avanceSimulado: number
): ResultadoSimulacion {
  // Obtener avance actual del proyecto
  const proyecto = dbHelpers.get<{ avance_actual: number }>(
    'SELECT avance_actual FROM proyectos WHERE id = ?',
    [proyectoId]
  );

  if (!proyecto) {
    throw new Error('Proyecto no encontrado');
  }

  const avanceActual = proyecto.avance_actual;
  const incrementoAvance = avanceSimulado - avanceActual;

  if (incrementoAvance < 0) {
    throw new Error('El avance simulado debe ser mayor o igual al avance actual');
  }

  // Obtener actividades con sus materiales
  const actividades = dbHelpers.all<{
    actividad_id: number;
    avance_real: number;
    avance_planificado: number;
    material_id: number;
    material_nombre: string;
    unidad_abrev: string;
    cantidad_estimada: number;
    cantidad_consumida: number;
    stock_actual: number;
    stock_minimo: number;
    precio_unitario: number;
    proveedor_nombre: string;
    tiempo_entrega_dias: number;
  }>(`
    SELECT 
      a.id as actividad_id,
      a.avance_real,
      a.avance_planificado,
      ma.material_id,
      m.nombre as material_nombre,
      u.abreviatura as unidad_abrev,
      ma.cantidad_estimada,
      ma.cantidad_consumida,
      m.stock_actual,
      m.stock_minimo,
      m.precio_unitario,
      p.nombre as proveedor_nombre,
      p.tiempo_entrega_dias
    FROM actividades a
    JOIN materiales_actividad ma ON a.id = ma.actividad_id
    JOIN materiales m ON ma.material_id = m.id
    LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
    LEFT JOIN proveedores p ON m.proveedor_id = p.id
    WHERE a.proyecto_id = ?
  `, [proyectoId]);

  // Agrupar por material y calcular consumo proyectado
  const materialesMap = new Map<number, SimulacionResultado>();

  for (const act of actividades) {
    if (!materialesMap.has(act.material_id)) {
      materialesMap.set(act.material_id, {
        material_id: act.material_id,
        material_nombre: act.material_nombre,
        unidad_abrev: act.unidad_abrev,
        stock_actual: act.stock_actual,
        stock_minimo: act.stock_minimo,
        consumo_proyectado: 0,
        stock_proyectado: act.stock_actual,
        porcentaje_stock: 0,
        estado: 'ok',
        dias_hasta_agotamiento: null,
        requiere_orden: false,
        cantidad_ordenar: 0,
        proveedor_nombre: act.proveedor_nombre,
        tiempo_entrega_dias: act.tiempo_entrega_dias
      });
    }

    const material = materialesMap.get(act.material_id)!;

    // Calcular cuánto se consumirá con el avance simulado
    const avanceActividadSimulado = Math.min(100, act.avance_real + incrementoAvance);
    const porcentajeConsumo = avanceActividadSimulado / 100;
    const consumoEstimado = act.cantidad_estimada * porcentajeConsumo;
    const consumoAdicional = consumoEstimado - act.cantidad_consumida;

    material.consumo_proyectado += Math.max(0, consumoAdicional);
  }

  // Calcular estados y recomendaciones
  const resultados: SimulacionResultado[] = [];
  let materialesCriticos = 0;
  let materialesRequierenOrden = 0;
  let costoEstimadoOrdenes = 0;

  for (const material of materialesMap.values()) {
    material.stock_proyectado = material.stock_actual - material.consumo_proyectado;
    material.porcentaje_stock = (material.stock_proyectado / material.stock_minimo) * 100;

    // Determinar estado
    if (material.stock_proyectado <= 0) {
      material.estado = 'critico';
      materialesCriticos++;
    } else if (material.stock_proyectado < material.stock_minimo * 0.5) {
      material.estado = 'critico';
      materialesCriticos++;
    } else if (material.stock_proyectado < material.stock_minimo) {
      material.estado = 'bajo';
    } else if (material.stock_proyectado < material.stock_minimo * 1.2) {
      material.estado = 'alerta';
    } else {
      material.estado = 'ok';
    }

    // Calcular días hasta agotamiento (estimación simplificada)
    if (material.consumo_proyectado > 0 && material.stock_proyectado > 0) {
      const tasaConsumo = material.consumo_proyectado / incrementoAvance;
      material.dias_hasta_agotamiento = Math.floor(material.stock_proyectado / tasaConsumo);
    }

    // Determinar si requiere orden
    if (material.stock_proyectado < material.stock_minimo) {
      material.requiere_orden = true;
      material.cantidad_ordenar = material.stock_minimo * 1.5 - material.stock_proyectado;
      materialesRequierenOrden++;
      
      // Calcular costo (usando precio_unitario de la BD)
      const precioUnitario = dbHelpers.get<{ precio_unitario: number }>(
        'SELECT precio_unitario FROM materiales WHERE id = ?',
        [material.material_id]
      );
      if (precioUnitario) {
        costoEstimadoOrdenes += material.cantidad_ordenar * precioUnitario.precio_unitario;
      }
    }

    resultados.push(material);
  }

  // Ordenar por criticidad
  resultados.sort((a, b) => {
    const ordenEstado = { critico: 0, bajo: 1, alerta: 2, ok: 3 };
    return ordenEstado[a.estado] - ordenEstado[b.estado];
  });

  return {
    avance_simulado: avanceSimulado,
    materiales: resultados,
    resumen: {
      total_materiales: resultados.length,
      materiales_criticos: materialesCriticos,
      materiales_requieren_orden: materialesRequierenOrden,
      costo_estimado_ordenes: costoEstimadoOrdenes
    }
  };
}