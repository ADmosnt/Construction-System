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
  es_perecedero: boolean;
  fecha_vencimiento: string | null;
  dias_aviso_vencimiento: number;
}

interface Proveedor {
  id: number;
  tiempo_entrega_dias: number;
}

interface ActividadConMateriales {
  actividad_id: number;
  actividad_nombre: string;
  avance_real: number;
  material_id: number;
  material_nombre: string;
  cantidad_estimada: number;
  cantidad_consumida: number;
}

interface Dependencia {
  actividad_id: number;
  actividad_nombre: string;
  precedente_id: number;
  precedente_nombre: string;
  precedente_avance: number;
  tipo_dependencia: string;
}

// =====================================================================
// GENERADOR PRINCIPAL: Alertas por proyecto
// =====================================================================

/**
 * Genera alertas automaticas para un proyecto especifico
 * Incluye: stock_minimo, desabastecimiento, reorden, desviacion_consumo, dependencia_bloqueada
 */
export function generarAlertasProyecto(proyectoId: number): void {
  try {
    console.log(`Generando alertas para proyecto ${proyectoId}...`);

    let alertasGeneradas = 0;

    // Limpiar alertas antiguas del proyecto (solo tipos por proyecto)
    dbHelpers.run(
      `DELETE FROM alertas WHERE proyecto_id = ? AND estado = 'pendiente'
       AND tipo IN ('stock_minimo', 'desabastecimiento_inminente', 'reorden_sugerido', 'desviacion_consumo', 'dependencia_bloqueada')`,
      [proyectoId]
    );

    const proyecto = dbHelpers.get<Proyecto>(
      'SELECT id, fecha_fin_estimada, avance_actual FROM proyectos WHERE id = ?',
      [proyectoId]
    );

    if (!proyecto) return;

    const hoy = new Date();
    const fechaFin = new Date(proyecto.fecha_fin_estimada);
    const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasRestantes <= 0) return;

    // Obtener materiales del proyecto
    const materiales = dbHelpers.all<Material>(`
      SELECT DISTINCT m.*
      FROM materiales m
      JOIN materiales_actividad ma ON m.id = ma.material_id
      JOIN actividades a ON ma.actividad_id = a.id
      WHERE a.proyecto_id = ?
    `, [proyectoId]);

    // Obtener proveedores
    const proveedores = new Map<number, Proveedor>();
    dbHelpers.all<Proveedor>('SELECT id, tiempo_entrega_dias FROM proveedores').forEach(p => {
      proveedores.set(p.id, p);
    });

    // Calcular consumo pendiente por material
    const consumoPendiente = calcularConsumoPendiente(proyectoId);

    // --- ALERTAS DE STOCK (existentes) ---
    for (const material of materiales) {
      const proveedor = proveedores.get(material.proveedor_id);
      if (!proveedor) continue;

      const consumo = consumoPendiente.get(material.id) || 0;
      const margenSeguridad = material.es_critico ? 5 : 3;

      if (material.stock_actual < material.stock_minimo) {
        const diasConStock = calcularDiasConStock(material.stock_actual, consumo, diasRestantes);
        const nivel = determinarNivelUrgencia(diasConStock, proveedor.tiempo_entrega_dias, material.es_critico);

        if (diasConStock <= proveedor.tiempo_entrega_dias + margenSeguridad) {
          insertarAlerta({
            proyectoId,
            materialId: material.id,
            tipo: 'desabastecimiento_inminente',
            nivel: nivel === 'baja' ? 'media' : nivel,
            mensaje: `Stock de ${material.nombre} por debajo del minimo. Se estima desabastecimiento en ${diasConStock} dias considerando plazo de entrega de ${proveedor.tiempo_entrega_dias} dias.`,
            diasDesabastecimiento: diasConStock,
            cantidadSugerida: calcularCantidadSugerida(consumo, material.stock_actual),
            fechaPedido: calcularFechaPedido(hoy, diasConStock, proveedor.tiempo_entrega_dias)
          });
          alertasGeneradas++;
        } else {
          insertarAlerta({
            proyectoId,
            materialId: material.id,
            tipo: 'stock_minimo',
            nivel,
            mensaje: `Stock de ${material.nombre} por debajo del minimo establecido. Considerar reabastecimiento.`,
            diasDesabastecimiento: diasConStock,
            cantidadSugerida: material.stock_minimo - material.stock_actual + consumo * 0.3,
            fechaPedido: calcularFechaPedido(hoy, diasConStock, proveedor.tiempo_entrega_dias)
          });
          alertasGeneradas++;
        }
      } else if (consumo > 0) {
        const proyeccionStock = material.stock_actual - consumo;
        const diasEstimados = calcularDiasConStock(material.stock_actual, consumo, diasRestantes);

        if (proyeccionStock < material.stock_minimo &&
            diasEstimados <= proveedor.tiempo_entrega_dias + margenSeguridad + 7) {
          insertarAlerta({
            proyectoId,
            materialId: material.id,
            tipo: 'reorden_sugerido',
            nivel: material.es_critico ? 'media' : 'baja',
            mensaje: `Basado en consumo proyectado, se sugiere ordenar ${material.nombre} para evitar desabastecimiento futuro.`,
            diasDesabastecimiento: diasEstimados,
            cantidadSugerida: consumo + (material.stock_minimo - proyeccionStock),
            fechaPedido: calcularFechaPedidoPreventivo(hoy, diasEstimados, proveedor.tiempo_entrega_dias, margenSeguridad)
          });
          alertasGeneradas++;
        }
      }
    }

    // --- #1: DESVIACION DE CONSUMO ---
    alertasGeneradas += generarAlertasDesviacionConsumo(proyectoId);

    // --- #6: DEPENDENCIAS BLOQUEADAS ---
    alertasGeneradas += generarAlertasDependencias(proyectoId);

    console.log(`${alertasGeneradas} alertas generadas para proyecto ${proyectoId}`);
  } catch (error) {
    console.error('Error generando alertas:', error);
  }
}

// =====================================================================
// GENERADOR GLOBAL: Alertas no asociadas a un proyecto especifico
// =====================================================================

/**
 * Genera alertas globales del sistema
 * Incluye: stock_estancado, vencimiento_material, variacion_precio, lead_time
 */
export function generarAlertasGlobales(): number {
  let total = 0;

  // Limpiar alertas globales pendientes anteriores
  dbHelpers.run(
    `DELETE FROM alertas WHERE estado = 'pendiente'
     AND tipo IN ('stock_estancado', 'vencimiento_material', 'variacion_precio')`
  );

  total += generarAlertasStockEstancado();
  total += generarAlertasVencimiento();
  total += generarAlertasVariacionPrecio();

  console.log(`${total} alertas globales generadas`);
  return total;
}

// =====================================================================
// #1: DESVIACION DE CONSUMO (Anti-Robo/Desperdicio)
// =====================================================================

function generarAlertasDesviacionConsumo(proyectoId: number): number {
  let count = 0;

  // Obtener actividades con materiales que estan en progreso (avance > 0 y < 100)
  const datos = dbHelpers.all<ActividadConMateriales>(`
    SELECT
      a.id as actividad_id,
      a.nombre as actividad_nombre,
      a.avance_real,
      ma.material_id,
      m.nombre as material_nombre,
      ma.cantidad_estimada,
      ma.cantidad_consumida
    FROM actividades a
    JOIN materiales_actividad ma ON a.id = ma.actividad_id
    JOIN materiales m ON ma.material_id = m.id
    WHERE a.proyecto_id = ?
      AND a.avance_real > 0
      AND a.avance_real < 100
      AND ma.cantidad_estimada > 0
  `, [proyectoId]);

  for (const d of datos) {
    const porcentajeAvance = d.avance_real / 100;
    const porcentajeConsumo = d.cantidad_consumida / d.cantidad_estimada;

    // Desviacion: consumio mucho mas de lo esperado para su avance
    // Umbral: consumio >30% mas de lo proporcional al avance
    const desviacion = porcentajeConsumo - porcentajeAvance;
    const ratio = porcentajeAvance > 0 ? porcentajeConsumo / porcentajeAvance : 0;

    if (desviacion > 0.30 && ratio > 1.5) {
      // Sobreconsumo grave: posible robo o desperdicio
      const proyeccionDeficit = d.cantidad_estimada * porcentajeConsumo / porcentajeAvance - d.cantidad_estimada;
      const nivel = desviacion > 0.50 ? 'critica' : desviacion > 0.40 ? 'alta' : 'media';

      insertarAlerta({
        proyectoId,
        materialId: d.material_id,
        actividadId: d.actividad_id,
        tipo: 'desviacion_consumo',
        nivel,
        mensaje: `Ineficiencia: "${d.actividad_nombre}" tiene ${d.avance_real}% de avance pero consumio ${(porcentajeConsumo * 100).toFixed(0)}% de ${d.material_nombre}. Se proyecta un deficit de ${proyeccionDeficit.toFixed(1)} unidades al finalizar.`,
        datosExtra: JSON.stringify({
          avance_real: d.avance_real,
          consumo_porcentaje: +(porcentajeConsumo * 100).toFixed(1),
          desviacion: +(desviacion * 100).toFixed(1),
          deficit_proyectado: +proyeccionDeficit.toFixed(2)
        })
      });
      count++;
    }
  }

  return count;
}

// =====================================================================
// #2: STOCK ESTANCADO (Capital parado)
// =====================================================================

function generarAlertasStockEstancado(): number {
  let count = 0;
  const DIAS_ESTANCAMIENTO = 30;

  // Materiales con stock > 0 cuyo ultimo movimiento fue hace mas de X dias
  const materiales = dbHelpers.all<{
    id: number;
    nombre: string;
    stock_actual: number;
    ultimo_movimiento: string | null;
    dias_sin_movimiento: number;
    valor_parado: number;
  }>(`
    WITH materiales_movimiento AS (
      SELECT
        m.id,
        m.nombre,
        m.stock_actual,
        m.precio_unitario,
        (SELECT MAX(fecha) FROM movimientos_inventario WHERE material_id = m.id) as ultimo_movimiento,
        m.created_at
      FROM materiales m
      WHERE m.stock_actual > 0
    )
    SELECT
      id,
      nombre,
      stock_actual,
      ultimo_movimiento,
      CAST(julianday('now') - julianday(COALESCE(ultimo_movimiento, created_at)) AS INTEGER) as dias_sin_movimiento,
      stock_actual * precio_unitario as valor_parado
    FROM materiales_movimiento
    WHERE CAST(julianday('now') - julianday(COALESCE(ultimo_movimiento, created_at)) AS INTEGER) >= ${DIAS_ESTANCAMIENTO}
  `);

  for (const m of materiales) {
    const nivel = m.dias_sin_movimiento > 90 ? 'alta' :
                  m.dias_sin_movimiento > 60 ? 'media' : 'baja';

    insertarAlerta({
      materialId: m.id,
      tipo: 'stock_estancado',
      nivel,
      mensaje: `Inventario estancado: ${m.nombre} tiene ${m.stock_actual.toFixed(1)} unidades sin movimiento desde hace ${m.dias_sin_movimiento} dias. Capital parado: $${m.valor_parado.toFixed(2)}.`,
      datosExtra: JSON.stringify({
        dias_sin_movimiento: m.dias_sin_movimiento,
        ultimo_movimiento: m.ultimo_movimiento,
        valor_parado: +m.valor_parado.toFixed(2)
      })
    });
    count++;
  }

  return count;
}

// =====================================================================
// #3: VENCIMIENTO DE MATERIAL (Perecederos)
// =====================================================================

function generarAlertasVencimiento(): number {
  let count = 0;

  // Consultar LOTES individuales en vez del material completo
  // Esto permite alertas precisas por lote (ej: "Lote #001 de Cemento vence en 3 dias")
  const lotes = dbHelpers.all<{
    lote_id: number;
    material_id: number;
    material_nombre: string;
    codigo_lote: string;
    cantidad_actual: number;
    fecha_vencimiento: string;
    dias_aviso_vencimiento: number;
    dias_para_vencer: number;
  }>(`
    SELECT
      l.id as lote_id,
      m.id as material_id,
      m.nombre as material_nombre,
      l.codigo_lote,
      l.cantidad_actual,
      l.fecha_vencimiento,
      m.dias_aviso_vencimiento,
      CAST(julianday(l.fecha_vencimiento) - julianday('now') AS INTEGER) as dias_para_vencer
    FROM lotes_inventario l
    JOIN materiales m ON l.material_id = m.id
    WHERE m.es_perecedero = 1
      AND l.fecha_vencimiento IS NOT NULL
      AND l.cantidad_actual > 0
      AND l.activo = 1
      AND julianday(l.fecha_vencimiento) - julianday('now') <= m.dias_aviso_vencimiento * 2
  `);

  for (const l of lotes) {
    let nivel: string;
    let mensaje: string;
    const loteLabel = l.codigo_lote || `Lote #${l.lote_id}`;

    if (l.dias_para_vencer <= 0) {
      nivel = 'critica';
      mensaje = `LOTE VENCIDO: ${loteLabel} de ${l.material_nombre} vencio hace ${Math.abs(l.dias_para_vencer)} dias. Bloquear su uso. Stock afectado: ${l.cantidad_actual.toFixed(1)} unidades.`;
    } else if (l.dias_para_vencer <= 7) {
      nivel = 'alta';
      mensaje = `${loteLabel} de ${l.material_nombre} vence en ${l.dias_para_vencer} dias (${l.fecha_vencimiento}). Priorizar su uso. Cantidad: ${l.cantidad_actual.toFixed(1)} unidades.`;
    } else if (l.dias_para_vencer <= l.dias_aviso_vencimiento) {
      nivel = 'media';
      mensaje = `${loteLabel} de ${l.material_nombre} vence en ${l.dias_para_vencer} dias (${l.fecha_vencimiento}). Planificar uso prioritario. Cantidad: ${l.cantidad_actual.toFixed(1)} unidades.`;
    } else {
      nivel = 'baja';
      mensaje = `Aviso preventivo: ${loteLabel} de ${l.material_nombre} vence el ${l.fecha_vencimiento} (${l.dias_para_vencer} dias). Cantidad: ${l.cantidad_actual.toFixed(1)} unidades.`;
    }

    insertarAlerta({
      materialId: l.material_id,
      tipo: 'vencimiento_material',
      nivel,
      mensaje,
      datosExtra: JSON.stringify({
        lote_id: l.lote_id,
        codigo_lote: loteLabel,
        fecha_vencimiento: l.fecha_vencimiento,
        dias_para_vencer: l.dias_para_vencer,
        stock_afectado: +l.cantidad_actual.toFixed(2)
      })
    });
    count++;
  }

  return count;
}

// =====================================================================
// #4: LEAD TIME - Mejora (tracking real vs estimado)
// Se integra como parte del calculo existente en generarAlertasProyecto
// y tambien verifica ordenes entregadas tarde
// =====================================================================

// (Ya integrado en el calculo de desabastecimiento_inminente)
// Adicionalmente, el trigger registrar_recepcion_orden trackea la fecha real.

// =====================================================================
// #5: VARIACION DE PRECIOS
// =====================================================================

function generarAlertasVariacionPrecio(): number {
  let count = 0;
  const UMBRAL_VARIACION = 0.10; // 10% de variacion

  // Comparar precio de la ultima orden con la penultima para cada material
  const variaciones = dbHelpers.all<{
    material_id: number;
    material_nombre: string;
    proveedor_nombre: string;
    precio_anterior: number;
    precio_actual: number;
    variacion_porcentaje: number;
    fecha_anterior: string;
    fecha_actual: string;
  }>(`
    WITH ordenes_precio AS (
      SELECT
        d.material_id,
        m.nombre as material_nombre,
        prov.nombre as proveedor_nombre,
        d.precio_unitario,
        o.fecha_emision,
        ROW_NUMBER() OVER (PARTITION BY d.material_id ORDER BY o.fecha_emision DESC) as rn
      FROM detalle_orden_compra d
      JOIN ordenes_compra o ON d.orden_compra_id = o.id
      JOIN materiales m ON d.material_id = m.id
      JOIN proveedores prov ON o.proveedor_id = prov.id
      WHERE o.estado != 'cancelada'
    )
    SELECT
      actual.material_id,
      actual.material_nombre,
      actual.proveedor_nombre,
      anterior.precio_unitario as precio_anterior,
      actual.precio_unitario as precio_actual,
      ROUND((actual.precio_unitario - anterior.precio_unitario) / anterior.precio_unitario * 100, 2) as variacion_porcentaje,
      anterior.fecha_emision as fecha_anterior,
      actual.fecha_emision as fecha_actual
    FROM ordenes_precio actual
    JOIN ordenes_precio anterior ON actual.material_id = anterior.material_id AND anterior.rn = 2
    WHERE actual.rn = 1
      AND ABS(actual.precio_unitario - anterior.precio_unitario) / anterior.precio_unitario > ${UMBRAL_VARIACION}
  `);

  for (const v of variaciones) {
    const subida = v.variacion_porcentaje > 0;
    const nivel = Math.abs(v.variacion_porcentaje) > 30 ? 'alta' :
                  Math.abs(v.variacion_porcentaje) > 20 ? 'media' : 'baja';

    insertarAlerta({
      materialId: v.material_id,
      tipo: 'variacion_precio',
      nivel,
      mensaje: `Variacion de costo: ${v.material_nombre} ${subida ? 'subio' : 'bajo'} ${Math.abs(v.variacion_porcentaje).toFixed(1)}% (de $${v.precio_anterior.toFixed(2)} a $${v.precio_actual.toFixed(2)}) segun ultima orden con ${v.proveedor_nombre}.`,
      datosExtra: JSON.stringify({
        precio_anterior: v.precio_anterior,
        precio_actual: v.precio_actual,
        variacion_porcentaje: v.variacion_porcentaje,
        proveedor: v.proveedor_nombre,
        fecha_anterior: v.fecha_anterior,
        fecha_actual: v.fecha_actual
      })
    });
    count++;
  }

  return count;
}

// =====================================================================
// #6: DEPENDENCIAS BLOQUEADAS
// =====================================================================

function generarAlertasDependencias(proyectoId: number): number {
  let count = 0;

  // Buscar actividades que tienen dependencias no cumplidas
  const dependencias = dbHelpers.all<Dependencia>(`
    SELECT
      a.id as actividad_id,
      a.nombre as actividad_nombre,
      prec.id as precedente_id,
      prec.nombre as precedente_nombre,
      prec.avance_real as precedente_avance,
      dep.tipo_dependencia
    FROM actividad_dependencias dep
    JOIN actividades a ON dep.actividad_id = a.id
    JOIN actividades prec ON dep.actividad_precedente_id = prec.id
    WHERE a.proyecto_id = ?
      AND a.avance_real < 100
  `, [proyectoId]);

  // Agrupar por actividad
  const porActividad = new Map<number, {
    nombre: string;
    bloqueadores: Array<{ nombre: string; avance: number; tipo: string }>;
  }>();

  for (const dep of dependencias) {
    let bloqueada = false;

    switch (dep.tipo_dependencia) {
      case 'FS': // Fin-a-Inicio: precedente debe estar al 100%
        bloqueada = dep.precedente_avance < 100;
        break;
      case 'SS': // Inicio-a-Inicio: precedente debe haber iniciado (>0%)
        bloqueada = dep.precedente_avance === 0;
        break;
      case 'FF': // Fin-a-Fin: no aplica bloqueo directo (info)
        break;
      case 'SF': // Inicio-a-Fin: precedente debe haber iniciado
        bloqueada = dep.precedente_avance === 0;
        break;
    }

    if (bloqueada) {
      if (!porActividad.has(dep.actividad_id)) {
        porActividad.set(dep.actividad_id, { nombre: dep.actividad_nombre, bloqueadores: [] });
      }
      porActividad.get(dep.actividad_id)!.bloqueadores.push({
        nombre: dep.precedente_nombre,
        avance: dep.precedente_avance,
        tipo: dep.tipo_dependencia
      });
    }
  }

  // Generar una alerta por cada actividad bloqueada
  for (const [actividadId, info] of porActividad) {
    const bloqueadoresTxt = info.bloqueadores
      .map(b => `"${b.nombre}" (${b.avance}%)`)
      .join(', ');

    const nivel = info.bloqueadores.some(b => b.avance === 0) ? 'alta' : 'media';

    // Buscar materiales afectados por el bloqueo
    const materialesAfectados = dbHelpers.all<{ nombre: string }>(`
      SELECT m.nombre FROM materiales_actividad ma
      JOIN materiales m ON ma.material_id = m.id
      WHERE ma.actividad_id = ?
    `, [actividadId]);

    const materialesTxt = materialesAfectados.map(m => m.nombre).join(', ');

    insertarAlerta({
      proyectoId,
      actividadId,
      tipo: 'dependencia_bloqueada',
      nivel,
      mensaje: `Actividad "${info.nombre}" bloqueada. Requiere completar: ${bloqueadoresTxt}. ${materialesTxt ? `Materiales afectados: ${materialesTxt}.` : ''}`,
      datosExtra: JSON.stringify({
        bloqueadores: info.bloqueadores,
        materiales_afectados: materialesAfectados.map(m => m.nombre)
      })
    });
    count++;
  }

  return count;
}

// =====================================================================
// FUNCIONES AUXILIARES
// =====================================================================

function calcularConsumoPendiente(proyectoId: number): Map<number, number> {
  const consumoPendiente = new Map<number, number>();

  const actividades = dbHelpers.all<{
    avance_real: number;
    material_id: number;
    cantidad_estimada: number;
    cantidad_consumida: number;
  }>(`
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

function calcularDiasConStock(
  stockActual: number,
  consumoPendiente: number,
  diasRestantes: number
): number {
  if (consumoPendiente === 0 || stockActual <= 0) return diasRestantes;
  const tasaConsumo = consumoPendiente / diasRestantes;
  return Math.floor(stockActual / tasaConsumo);
}

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

function calcularCantidadSugerida(consumoPendiente: number, stockActual: number): number {
  return Math.max(0, consumoPendiente * 1.3 - stockActual);
}

function calcularFechaPedido(hoy: Date, diasConStock: number, tiempoEntrega: number): string {
  const diasAntes = Math.max(1, diasConStock - tiempoEntrega - 2);
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diasAntes);
  return fecha.toISOString().split('T')[0];
}

function calcularFechaPedidoPreventivo(
  hoy: Date, diasEstimados: number, tiempoEntrega: number, margen: number
): string {
  const diasAntes = Math.max(1, diasEstimados - tiempoEntrega - margen);
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diasAntes);
  return fecha.toISOString().split('T')[0];
}

/**
 * Inserta una alerta en la base de datos (version flexible)
 */
function insertarAlerta(params: {
  proyectoId?: number;
  materialId?: number;
  actividadId?: number;
  tipo: string;
  nivel: string;
  mensaje: string;
  diasDesabastecimiento?: number | null;
  cantidadSugerida?: number | null;
  fechaPedido?: string | null;
  datosExtra?: string | null;
}): void {
  dbHelpers.run(
    `INSERT INTO alertas (
      proyecto_id, material_id, actividad_id, tipo, nivel, mensaje,
      dias_hasta_desabastecimiento, cantidad_sugerida, fecha_sugerida_pedido,
      datos_extra, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [
      params.proyectoId ?? null,
      params.materialId ?? null,
      params.actividadId ?? null,
      params.tipo,
      params.nivel,
      params.mensaje,
      params.diasDesabastecimiento ?? null,
      params.cantidadSugerida ?? null,
      params.fechaPedido ?? null,
      params.datosExtra ?? null
    ]
  );
}
