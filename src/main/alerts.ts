// src/main/alerts.ts

import { dbHelpers } from './database';

interface Proyecto {
  id: number;
  fecha_fin_estimada: string;
  avance_actual: number;
}

interface Material {
  id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  proveedor_id: number;
  es_critico: boolean;
}

interface Proveedor {
  id: number;
  tiempo_entrega_dias: number;
}

interface ActividadConMateriales {
  avance_real: number;
  material_id: number;
  cantidad_estimada: number;
  cantidad_consumida: number;
}

/**
 * Genera alertas automáticas para un proyecto específico
 */
export function generarAlertasProyecto(proyectoId: number): void {
  try {
    console.log(`🔍 Generando alertas para proyecto ${proyectoId}...`);

    let alertasGeneradas = 0;

    // Limpiar alertas antiguas del proyecto
    const deleted = dbHelpers.run(
      `DELETE FROM alertas WHERE proyecto_id = ? AND estado = 'pendiente'`,
      [proyectoId]
    );
    console.log(`   Alertas eliminadas: ${deleted.changes}`);

    const proyecto = dbHelpers.get<Proyecto>(
      'SELECT id, fecha_fin_estimada, avance_actual FROM proyectos WHERE id = ?',
      [proyectoId]
    );

    if (!proyecto) {
      console.log('   ❌ Proyecto no encontrado');
      return;
    }

    const hoy = new Date();
    const fechaFin = new Date(proyecto.fecha_fin_estimada);
    const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`   Proyecto: avance=${proyecto.avance_actual}%, días restantes=${diasRestantes}`);

    if (diasRestantes <= 0) {
      console.log('   ❌ Proyecto ya finalizado');
      return;
    }

    // Obtener materiales del proyecto
    const materiales = dbHelpers.all<Material>(`
      SELECT DISTINCT m.* 
      FROM materiales m
      JOIN materiales_actividad ma ON m.id = ma.material_id
      JOIN actividades a ON ma.actividad_id = a.id
      WHERE a.proyecto_id = ?
    `, [proyectoId]);

    console.log(`   Materiales encontrados: ${materiales.length}`);
    
    // Obtener proveedores
    const proveedores = new Map<number, Proveedor>();
    dbHelpers.all<Proveedor>('SELECT id, tiempo_entrega_dias FROM proveedores').forEach(p => {
      proveedores.set(p.id, p);
    });

    // Calcular consumo pendiente por material
    const consumoPendiente = calcularConsumoPendiente(proyectoId);

    // Generar alertas para cada material
    for (const material of materiales) {
      const proveedor = proveedores.get(material.proveedor_id);
      if (!proveedor) continue;

      const consumo = consumoPendiente.get(material.id) || 0;
      const margenSeguridad = material.es_critico ? 5 : 3;

      // REGLA 1: Stock por debajo del mínimo
      if (material.stock_actual < material.stock_minimo) {
        const diasConStock = calcularDiasConStock(
          material.stock_actual,
          consumo,
          diasRestantes
        );

        const nivel = determinarNivelUrgencia(
          diasConStock,
          proveedor.tiempo_entrega_dias,
          material.es_critico
        );

        // REGLA 2: Desabastecimiento inminente
        if (diasConStock <= proveedor.tiempo_entrega_dias + margenSeguridad) {
          insertarAlerta(
            proyectoId,
            material.id,
            'desabastecimiento_inminente',
            nivel === 'baja' ? 'media' : nivel,
            `Stock de ${material.nombre} por debajo del mínimo. Se estima desabastecimiento en ${diasConStock} días considerando avance actual y plazo de entrega de ${proveedor.tiempo_entrega_dias} días.`,
            diasConStock,
            calcularCantidadSugerida(consumo, material.stock_actual),
            calcularFechaPedido(hoy, diasConStock, proveedor.tiempo_entrega_dias)
          );
          alertasGeneradas++;
        } else {
          // Stock bajo pero no crítico
          insertarAlerta(
            proyectoId,
            material.id,
            'stock_minimo',
            nivel,
            `Stock de ${material.nombre} por debajo del mínimo establecido. Considerar reabastecimiento.`,
            diasConStock,
            material.stock_minimo - material.stock_actual + consumo * 0.3,
            calcularFechaPedido(hoy, diasConStock, proveedor.tiempo_entrega_dias)
          );
          alertasGeneradas++;
        }
      }
      // REGLA 3: Punto de reorden preventivo
      else if (consumo > 0) {
        const proyeccionStock = material.stock_actual - consumo;
        const diasEstimadosConsumo = calcularDiasConStock(
          material.stock_actual,
          consumo,
          diasRestantes
        );

        if (proyeccionStock < material.stock_minimo && 
            diasEstimadosConsumo <= proveedor.tiempo_entrega_dias + margenSeguridad + 7) {
          insertarAlerta(
            proyectoId,
            material.id,
            'reorden_sugerido',
            material.es_critico ? 'media' : 'baja',
            `Basado en consumo proyectado, se sugiere ordenar ${material.nombre} para evitar desabastecimiento futuro.`,
            diasEstimadosConsumo,
            consumo + (material.stock_minimo - proyeccionStock),
            calcularFechaPedidoPreventivo(hoy, diasEstimadosConsumo, proveedor.tiempo_entrega_dias, margenSeguridad)
          );
          alertasGeneradas++;
        }
      }
    }

    console.log(`✅ ${alertasGeneradas} alertas generadas para proyecto ${proyectoId}`);
  } catch (error) {
    console.error('❌ Error generando alertas:', error);
  }
}

/**
 * Calcula el consumo pendiente de materiales según actividades no completadas
 */
function calcularConsumoPendiente(proyectoId: number): Map<number, number> {
  const consumoPendiente = new Map<number, number>();

  const actividades = dbHelpers.all<ActividadConMateriales>(`
    SELECT 
      a.avance_real,
      ma.material_id,
      ma.cantidad_estimada,
      ma.cantidad_consumida
    FROM actividades a
    JOIN materiales_actividad ma ON a.id = ma.actividad_id
    WHERE a.proyecto_id = ? AND a.avance_real < 100
  `, [proyectoId]);

  for (const act of actividades) {
    const porcentajePendiente = (100 - act.avance_real) / 100;
    const pendiente = (act.cantidad_estimada - act.cantidad_consumida) * porcentajePendiente;
    
    const actual = consumoPendiente.get(act.material_id) || 0;
    consumoPendiente.set(act.material_id, actual + pendiente);
  }

  return consumoPendiente;
}

/**
 * Estima cuántos días durará el stock actual dado el consumo proyectado
 */
function calcularDiasConStock(
  stockActual: number,
  consumoPendiente: number,
  diasRestantes: number
): number {
  if (consumoPendiente === 0 || stockActual <= 0) return diasRestantes;
  const tasaConsumo = consumoPendiente / diasRestantes;
  return Math.floor(stockActual / tasaConsumo);
}

/**
 * Determina el nivel de urgencia de la alerta
 */
function determinarNivelUrgencia(
  diasConStock: number,
  tiempoEntrega: number,
  esCritico: boolean
): 'baja' | 'media' | 'alta' | 'critica' {
  const margen = esCritico ? 2 : 1;

  if (diasConStock <= tiempoEntrega) return 'critica';
  if (diasConStock <= tiempoEntrega + margen * 3) return 'alta';
  if (diasConStock <= tiempoEntrega + margen * 7) return 'media';
  return 'baja';
}

/**
 * Calcula cantidad sugerida de reorden
 */
function calcularCantidadSugerida(consumoPendiente: number, stockActual: number): number {
  return Math.max(0, consumoPendiente * 1.3 - stockActual);
}

/**
 * Calcula fecha sugerida para realizar el pedido
 */
function calcularFechaPedido(
  hoy: Date,
  diasConStock: number,
  tiempoEntrega: number
): string {
  const diasAntesDeOrdenar = Math.max(1, diasConStock - tiempoEntrega - 2);
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diasAntesDeOrdenar);
  return fecha.toISOString().split('T')[0];
}

/**
 * Calcula fecha sugerida preventiva
 */
function calcularFechaPedidoPreventivo(
  hoy: Date,
  diasEstimados: number,
  tiempoEntrega: number,
  margen: number
): string {
  const diasAntes = Math.max(1, diasEstimados - tiempoEntrega - margen);
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diasAntes);
  return fecha.toISOString().split('T')[0];
}

/**
 * Inserta una alerta en la base de datos
 */
function insertarAlerta(
  proyectoId: number,
  materialId: number,
  tipo: string,
  nivel: string,
  mensaje: string,
  diasHastaDesabastecimiento: number | null,
  cantidadSugerida: number,
  fechaSugeridaPedido: string
): void {
  dbHelpers.run(
    `INSERT INTO alertas (
      proyecto_id, material_id, tipo, nivel, mensaje, 
      dias_hasta_desabastecimiento, cantidad_sugerida, fecha_sugerida_pedido, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [
      proyectoId,
      materialId,
      tipo,
      nivel,
      mensaje,
      diasHastaDesabastecimiento,
      cantidadSugerida,
      fechaSugeridaPedido
    ]
  );
}