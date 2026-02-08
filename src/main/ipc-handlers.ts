// src/main/ipc-handlers.ts

import { ipcMain } from 'electron';
import { dbHelpers } from './database';
import { generarAlertasProyecto, generarAlertasGlobales } from './alerts';
import { simularConsumoProyecto } from './simulator';

/**
 * FEFO: Descuenta stock del lote más próximo a vencer primero.
 * Retorna los lote_ids afectados para registrar en movimientos.
 */
function descontarFEFO(materialId: number, cantidadTotal: number): Array<{ lote_id: number; cantidad: number; codigo_lote: string }> {
  const lotes = dbHelpers.all<{
    id: number; codigo_lote: string; cantidad_actual: number; fecha_vencimiento: string | null;
  }>(`
    SELECT id, codigo_lote, cantidad_actual, fecha_vencimiento
    FROM lotes_inventario
    WHERE material_id = ? AND activo = 1 AND cantidad_actual > 0
    ORDER BY
      CASE WHEN fecha_vencimiento IS NULL THEN 1 ELSE 0 END,
      fecha_vencimiento ASC,
      fecha_ingreso ASC
  `, [materialId]);

  let restante = cantidadTotal;
  const resultado: Array<{ lote_id: number; cantidad: number; codigo_lote: string }> = [];

  for (const lote of lotes) {
    if (restante <= 0) break;

    const descontar = Math.min(lote.cantidad_actual, restante);
    const nuevaCantidad = lote.cantidad_actual - descontar;

    dbHelpers.run(
      'UPDATE lotes_inventario SET cantidad_actual = ?, activo = ? WHERE id = ?',
      [nuevaCantidad, nuevaCantidad > 0 ? 1 : 0, lote.id]
    );

    resultado.push({ lote_id: lote.id, cantidad: descontar, codigo_lote: lote.codigo_lote || `Lote #${lote.id}` });
    restante -= descontar;
  }

  return resultado;
}

/**
 * Registra todos los handlers IPC para comunicación con el renderer
 */
export function registerIpcHandlers(): void {
  
  // ==================== PROYECTOS ====================
  
  ipcMain.handle('db:proyectos:getAll', async () => {
    return dbHelpers.all('SELECT * FROM proyectos ORDER BY created_at DESC');
  });

  ipcMain.handle('db:proyectos:getById', async (_, id: number) => {
    return dbHelpers.get('SELECT * FROM proyectos WHERE id = ?', [id]);
  });

  ipcMain.handle('db:proyectos:create', async (_, proyecto: any) => {
    const result = dbHelpers.run(
      `INSERT INTO proyectos (nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, presupuesto_total, avance_actual, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proyecto.nombre,
        proyecto.descripcion,
        proyecto.ubicacion,
        proyecto.fecha_inicio,
        proyecto.fecha_fin_estimada,
        proyecto.presupuesto_total || 0,
        proyecto.avance_actual || 0,
        proyecto.estado || 'activo'
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:proyectos:update', async (_, id: number, proyecto: any) => {
    // Primero obtenemos el proyecto actual
    const proyectoActual = dbHelpers.get('SELECT * FROM proyectos WHERE id = ?', [id]);
    
    if (!proyectoActual) {
      throw new Error('Proyecto no encontrado');
    }
    
    // Mezclamos los datos actuales con los nuevos
    const proyectoActualizado = { ...proyectoActual, ...proyecto };
    
    return dbHelpers.run(
      `UPDATE proyectos 
      SET nombre = ?, descripcion = ?, ubicacion = ?, fecha_inicio = ?, 
          fecha_fin_estimada = ?, presupuesto_total = ?, avance_actual = ?, estado = ?
      WHERE id = ?`,
      [
        proyectoActualizado.nombre,
        proyectoActualizado.descripcion,
        proyectoActualizado.ubicacion,
        proyectoActualizado.fecha_inicio,
        proyectoActualizado.fecha_fin_estimada,
        proyectoActualizado.presupuesto_total,
        proyectoActualizado.avance_actual,
        proyectoActualizado.estado,
        id
      ]
    );
  });

  ipcMain.handle('db:proyectos:delete', async (_, id: number) => {
    return dbHelpers.run('DELETE FROM proyectos WHERE id = ?', [id]);
  });

  // ==================== MATERIALES ====================
  
  ipcMain.handle('db:materiales:getAll', async () => {
    return dbHelpers.all(`
      SELECT m.*, u.nombre as unidad_nombre, u.abreviatura as unidad_abrev,
             p.nombre as proveedor_nombre, p.tiempo_entrega_dias
      FROM materiales m
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      LEFT JOIN proveedores p ON m.proveedor_id = p.id
      ORDER BY m.nombre
    `);
  });

  ipcMain.handle('db:materiales:getById', async (_, id: number) => {
    return dbHelpers.get(`
      SELECT m.*, u.nombre as unidad_nombre, u.abreviatura as unidad_abrev,
             p.nombre as proveedor_nombre
      FROM materiales m
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      LEFT JOIN proveedores p ON m.proveedor_id = p.id
      WHERE m.id = ?
    `, [id]);
  });

  ipcMain.handle('db:materiales:create', async (_, material: any) => {
    const result = dbHelpers.run(
      `INSERT INTO materiales (nombre, descripcion, unidad_medida_id, proveedor_id,
                               stock_actual, stock_minimo, stock_maximo, precio_unitario, es_critico,
                               es_perecedero, fecha_vencimiento, dias_aviso_vencimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        material.nombre,
        material.descripcion,
        material.unidad_medida_id,
        material.proveedor_id,
        material.stock_actual || 0,
        material.stock_minimo || 0,
        material.stock_maximo || 0,
        material.precio_unitario || 0,
        material.es_critico ? 1 : 0,
        material.es_perecedero ? 1 : 0,
        material.fecha_vencimiento || null,
        material.dias_aviso_vencimiento || 15
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:materiales:update', async (_, id: number, material: any) => {
    return dbHelpers.run(
      `UPDATE materiales
       SET nombre = ?, descripcion = ?, unidad_medida_id = ?, proveedor_id = ?,
           stock_actual = ?, stock_minimo = ?, stock_maximo = ?, precio_unitario = ?, es_critico = ?,
           es_perecedero = ?, fecha_vencimiento = ?, dias_aviso_vencimiento = ?
       WHERE id = ?`,
      [
        material.nombre,
        material.descripcion,
        material.unidad_medida_id,
        material.proveedor_id,
        material.stock_actual,
        material.stock_minimo,
        material.stock_maximo,
        material.precio_unitario,
        material.es_critico ? 1 : 0,
        material.es_perecedero ? 1 : 0,
        material.fecha_vencimiento || null,
        material.dias_aviso_vencimiento || 15,
        id
      ]
    );
  });

  // ==================== PROVEEDORES ====================

  ipcMain.handle('db:proveedores:getAll', async () => {
    return dbHelpers.all('SELECT * FROM proveedores ORDER BY nombre');
  });

  ipcMain.handle('db:proveedores:getById', async (_, id: number) => {
    return dbHelpers.get('SELECT * FROM proveedores WHERE id = ?', [id]);
  });

  ipcMain.handle('db:proveedores:create', async (_, proveedor: any) => {
    const result = dbHelpers.run(
      `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, tiempo_entrega_dias)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        proveedor.nombre,
        proveedor.contacto,
        proveedor.telefono,
        proveedor.email,
        proveedor.direccion,
        proveedor.tiempo_entrega_dias || 7
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:proveedores:update', async (_, id: number, proveedor: any) => {
    // Obtener proveedor actual
    const proveedorActual = dbHelpers.get('SELECT * FROM proveedores WHERE id = ?', [id]);
    if (!proveedorActual) {
      throw new Error('Proveedor no encontrado');
    }
    
    const proveedorActualizado = { ...proveedorActual, ...proveedor };
    
    return dbHelpers.run(
      `UPDATE proveedores 
      SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, tiempo_entrega_dias = ?
      WHERE id = ?`,
      [
        proveedorActualizado.nombre,
        proveedorActualizado.contacto,
        proveedorActualizado.telefono,
        proveedorActualizado.email,
        proveedorActualizado.direccion,
        proveedorActualizado.tiempo_entrega_dias,
        id
      ]
    );
  });

  ipcMain.handle('db:proveedores:delete', async (_, id: number) => {
    // Verificar si tiene materiales asociados
    const materiales = dbHelpers.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM materiales WHERE proveedor_id = ?',
      [id]
    );
    
    if (materiales && materiales.count > 0) {
      throw new Error(`No se puede eliminar. Este proveedor tiene ${materiales.count} materiales asociados.`);
    }
    
    return dbHelpers.run('DELETE FROM proveedores WHERE id = ?', [id]);
  });

  ipcMain.handle('db:proveedores:getMateriales', async (_, id: number) => {
    return dbHelpers.all(`
      SELECT m.*, u.abreviatura as unidad_abrev
      FROM materiales m
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      WHERE m.proveedor_id = ?
      ORDER BY m.nombre
    `, [id]);
  });

  // ==================== ACTIVIDADES ====================
  
  ipcMain.handle('db:actividades:getByProyecto', async (_, proyectoId: number) => {
    return dbHelpers.all(
      'SELECT * FROM actividades WHERE proyecto_id = ? ORDER BY orden',
      [proyectoId]
    );
  });

  ipcMain.handle('db:actividades:create', async (_, actividad: any) => {
    const result = dbHelpers.run(
      `INSERT INTO actividades (proyecto_id, nombre, descripcion, orden, avance_planificado, 
                                avance_real, fecha_inicio_planificada, fecha_fin_planificada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actividad.proyecto_id,
        actividad.nombre,
        actividad.descripcion,
        actividad.orden || 0,
        actividad.avance_planificado || 0,
        actividad.avance_real || 0,
        actividad.fecha_inicio_planificada,
        actividad.fecha_fin_planificada
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:actividades:update', async (_, id: number, actividad: any) => {
    // Actualizacion simple de campos de la actividad (sin consumo de materiales)
    const actividadActual = dbHelpers.get<any>('SELECT * FROM actividades WHERE id = ?', [id]);
    if (!actividadActual) throw new Error('Actividad no encontrada');

    return dbHelpers.run(
      `UPDATE actividades
       SET avance_real = ?, fecha_inicio_real = ?, fecha_fin_real = ?,
           nombre = ?, descripcion = ?, orden = ?,
           avance_planificado = ?, fecha_inicio_planificada = ?, fecha_fin_planificada = ?
       WHERE id = ?`,
      [
        actividad.avance_real !== undefined ? actividad.avance_real : actividadActual.avance_real,
        actividad.fecha_inicio_real !== undefined ? actividad.fecha_inicio_real : actividadActual.fecha_inicio_real,
        actividad.fecha_fin_real !== undefined ? actividad.fecha_fin_real : actividadActual.fecha_fin_real,
        actividad.nombre !== undefined ? actividad.nombre : actividadActual.nombre,
        actividad.descripcion !== undefined ? actividad.descripcion : actividadActual.descripcion,
        actividad.orden !== undefined ? actividad.orden : actividadActual.orden,
        actividad.avance_planificado !== undefined ? actividad.avance_planificado : actividadActual.avance_planificado,
        actividad.fecha_inicio_planificada !== undefined ? actividad.fecha_inicio_planificada : actividadActual.fecha_inicio_planificada,
        actividad.fecha_fin_planificada !== undefined ? actividad.fecha_fin_planificada : actividadActual.fecha_fin_planificada,
        id
      ]
    );
  });

  // Confirmar avance con consumo explicito de materiales
  ipcMain.handle('db:actividades:confirmarAvance', async (_, data: {
    actividad_id: number;
    nuevo_avance: number;
    consumos: Array<{
      material_actividad_id: number;
      material_id: number;
      cantidad_consumir: number;
    }>;
  }) => {
    return dbHelpers.transaction(() => {
      const actividad = dbHelpers.get<any>('SELECT * FROM actividades WHERE id = ?', [data.actividad_id]);
      if (!actividad) throw new Error('Actividad no encontrada');

      const avanceAnterior = actividad.avance_real || 0;
      if (data.nuevo_avance <= avanceAnterior) {
        throw new Error('El nuevo avance debe ser mayor al actual');
      }
      if (data.nuevo_avance > 100) {
        throw new Error('El avance no puede superar el 100%');
      }

      // Actualizar avance de la actividad
      dbHelpers.run(
        'UPDATE actividades SET avance_real = ? WHERE id = ?',
        [data.nuevo_avance, data.actividad_id]
      );

      // Procesar consumo de cada material
      const advertencias: string[] = [];
      const estadosMateriales: Array<{
        nombre: string;
        stock_actual: number;
        stock_minimo: number;
        nivel: 'critico' | 'bajo' | 'normal';
        consumido: number;
      }> = [];

      for (const consumo of data.consumos) {
        if (consumo.cantidad_consumir <= 0) continue;

        // Verificar stock disponible
        const material = dbHelpers.get<any>(
          'SELECT id, nombre, stock_actual, stock_minimo, es_perecedero FROM materiales WHERE id = ?',
          [consumo.material_id]
        );
        if (!material) continue;

        // NO permitir consumir mas de lo que hay en stock
        let cantidadFinal = consumo.cantidad_consumir;
        if (cantidadFinal > material.stock_actual) {
          cantidadFinal = Math.max(0, material.stock_actual);
          if (cantidadFinal === 0) {
            advertencias.push(`${material.nombre}: sin stock disponible, no se consumio`);
            continue;
          }
          advertencias.push(`${material.nombre}: se ajusto a ${cantidadFinal.toFixed(2)} (stock insuficiente)`);
        }

        // Crear movimiento de salida (trigger actualiza stock_actual)
        // Para perecederos: usar FEFO automático
        if (material.es_perecedero) {
          const lotesAfectados = descontarFEFO(consumo.material_id, cantidadFinal);
          for (const lote of lotesAfectados) {
            dbHelpers.run(
              `INSERT INTO movimientos_inventario (material_id, proyecto_id, lote_id, tipo, cantidad, motivo, responsable, lote)
               VALUES (?, ?, ?, 'salida', ?, ?, 'Sistema', ?)`,
              [
                consumo.material_id,
                actividad.proyecto_id,
                lote.lote_id,
                lote.cantidad,
                `Consumo confirmado por avance (${avanceAnterior}% → ${data.nuevo_avance}%)`,
                lote.codigo_lote
              ]
            );
          }
          // Si quedó restante sin lote
          const totalFEFO = lotesAfectados.reduce((s, l) => s + l.cantidad, 0);
          if (totalFEFO < cantidadFinal) {
            dbHelpers.run(
              `INSERT INTO movimientos_inventario (material_id, proyecto_id, tipo, cantidad, motivo, responsable)
               VALUES (?, ?, 'salida', ?, ?, 'Sistema')`,
              [consumo.material_id, actividad.proyecto_id, cantidadFinal - totalFEFO,
               `Consumo confirmado por avance (${avanceAnterior}% → ${data.nuevo_avance}%)`]
            );
          }
        } else {
          dbHelpers.run(
            `INSERT INTO movimientos_inventario (material_id, proyecto_id, tipo, cantidad, motivo, responsable)
             VALUES (?, ?, 'salida', ?, ?, 'Sistema')`,
            [
              consumo.material_id,
              actividad.proyecto_id,
              cantidadFinal,
              `Consumo confirmado por avance (${avanceAnterior}% → ${data.nuevo_avance}%)`
            ]
          );
        }

        // Actualizar cantidad_consumida
        const matAct = dbHelpers.get<any>(
          'SELECT * FROM materiales_actividad WHERE id = ?',
          [consumo.material_actividad_id]
        );

        if (matAct) {
          const nuevaConsumida = matAct.cantidad_consumida + cantidadFinal;
          // Si el consumo real supera la estimacion, auto-ajustar la estimacion
          const nuevaEstimada = Math.max(matAct.cantidad_estimada, nuevaConsumida);

          dbHelpers.run(
            'UPDATE materiales_actividad SET cantidad_consumida = ?, cantidad_estimada = ? WHERE id = ?',
            [nuevaConsumida, nuevaEstimada, consumo.material_actividad_id]
          );
        }

        // Leer stock actualizado (post-trigger) para reportar nivel
        const matPostConsumo = dbHelpers.get<any>(
          'SELECT stock_actual, stock_minimo FROM materiales WHERE id = ?',
          [consumo.material_id]
        );

        if (matPostConsumo) {
          let nivel: 'critico' | 'bajo' | 'normal' = 'normal';
          if (matPostConsumo.stock_actual <= 0 || matPostConsumo.stock_actual < matPostConsumo.stock_minimo * 0.5) {
            nivel = 'critico';
          } else if (matPostConsumo.stock_actual < matPostConsumo.stock_minimo) {
            nivel = 'bajo';
          }

          if (nivel !== 'normal') {
            estadosMateriales.push({
              nombre: material.nombre,
              stock_actual: matPostConsumo.stock_actual,
              stock_minimo: matPostConsumo.stock_minimo,
              nivel,
              consumido: cantidadFinal
            });
          }
        }
      }

      return { success: true, advertencias, estadosMateriales };
    });
  });

  // ==================== ALERTAS ====================
  
  ipcMain.handle('db:alertas:getAll', async () => {
    return dbHelpers.all(`
      SELECT a.*,
             p.nombre as proyecto_nombre,
             m.nombre as material_nombre,
             m.stock_actual as material_stock_actual,
             m.stock_minimo as material_stock_minimo,
             u.abreviatura as material_unidad_abrev,
             act.nombre as actividad_nombre
      FROM alertas a
      LEFT JOIN proyectos p ON a.proyecto_id = p.id
      LEFT JOIN materiales m ON a.material_id = m.id
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      LEFT JOIN actividades act ON a.actividad_id = act.id
      WHERE a.estado = 'pendiente'
      ORDER BY
        CASE a.nivel
          WHEN 'critica' THEN 1
          WHEN 'alta' THEN 2
          WHEN 'media' THEN 3
          WHEN 'baja' THEN 4
        END,
        a.created_at DESC
    `);
  });

  ipcMain.handle('db:alertas:marcarAtendida', async (_, id: number) => {
    return dbHelpers.run(
      `UPDATE alertas SET estado = 'atendida', atendida_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  });

  // Regenerar alertas para todos los proyectos activos + alertas globales
  ipcMain.handle('db:alertas:regenerarTodas', async () => {
    const proyectos = dbHelpers.all<{ id: number }>(
      "SELECT id FROM proyectos WHERE estado = 'activo'"
    );
    for (const p of proyectos) {
      generarAlertasProyecto(p.id);
    }
    const globales = generarAlertasGlobales();
    return { success: true, proyectos: proyectos.length, globales };
  });

  // Conteo rapido de alertas pendientes (para badge del sidebar)
  ipcMain.handle('db:alertas:count', async () => {
    const result = dbHelpers.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM alertas WHERE estado = 'pendiente'"
    );
    return result?.count || 0;
  });

  // ==================== UNIDADES DE MEDIDA ====================
  
  ipcMain.handle('db:unidades:getAll', async () => {
    return dbHelpers.all('SELECT * FROM unidades_medida ORDER BY nombre');
  });

  // ==================== MOVIMIENTOS ====================
  
  ipcMain.handle('db:movimientos:create', async (_, movimiento: any) => {
    const material = dbHelpers.get<any>(
      'SELECT id, es_perecedero FROM materiales WHERE id = ?',
      [movimiento.material_id]
    );

    // Para materiales perecederos con salida: usar FEFO
    if (material?.es_perecedero && movimiento.tipo === 'salida') {
      return dbHelpers.transaction(() => {
        const lotesAfectados = descontarFEFO(movimiento.material_id, movimiento.cantidad);
        let firstId: any = null;

        for (const lote of lotesAfectados) {
          const result = dbHelpers.run(
            `INSERT INTO movimientos_inventario (material_id, proyecto_id, lote_id, tipo, cantidad, motivo, responsable, lote)
             VALUES (?, ?, ?, 'salida', ?, ?, ?, ?)`,
            [
              movimiento.material_id,
              movimiento.proyecto_id,
              lote.lote_id,
              lote.cantidad,
              movimiento.motivo,
              movimiento.responsable || 'Sistema',
              lote.codigo_lote
            ]
          );
          if (!firstId) firstId = result.lastInsertRowid;
        }

        // Si no había lotes suficientes, crear movimiento sin lote por el restante
        const totalDescontado = lotesAfectados.reduce((sum, l) => sum + l.cantidad, 0);
        if (totalDescontado < movimiento.cantidad) {
          const result = dbHelpers.run(
            `INSERT INTO movimientos_inventario (material_id, proyecto_id, tipo, cantidad, motivo, responsable)
             VALUES (?, ?, 'salida', ?, ?, ?)`,
            [
              movimiento.material_id,
              movimiento.proyecto_id,
              movimiento.cantidad - totalDescontado,
              movimiento.motivo,
              movimiento.responsable || 'Sistema'
            ]
          );
          if (!firstId) firstId = result.lastInsertRowid;
        }

        return { id: firstId };
      });
    }

    // Para materiales perecederos con entrada: crear lote automáticamente
    if (material?.es_perecedero && movimiento.tipo === 'entrada') {
      return dbHelpers.transaction(() => {
        const loteResult = dbHelpers.run(
          `INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, notas)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            movimiento.material_id,
            movimiento.lote_codigo || `LOTE-${Date.now()}`,
            movimiento.cantidad,
            movimiento.cantidad,
            movimiento.fecha_vencimiento || null,
            movimiento.notas_lote || 'Ingreso manual'
          ]
        );
        const loteId = loteResult.lastInsertRowid;

        const result = dbHelpers.run(
          `INSERT INTO movimientos_inventario (material_id, proyecto_id, lote_id, tipo, cantidad, motivo, responsable, lote)
           VALUES (?, ?, ?, 'entrada', ?, ?, ?, ?)`,
          [
            movimiento.material_id,
            movimiento.proyecto_id,
            loteId,
            movimiento.cantidad,
            movimiento.motivo,
            movimiento.responsable || 'Sistema',
            movimiento.lote_codigo || `LOTE-${Date.now()}`
          ]
        );

        return { id: result.lastInsertRowid };
      });
    }

    // Materiales NO perecederos: comportamiento original
    const result = dbHelpers.run(
      `INSERT INTO movimientos_inventario (material_id, proyecto_id, tipo, cantidad, motivo, responsable)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        movimiento.material_id,
        movimiento.proyecto_id,
        movimiento.tipo,
        movimiento.cantidad,
        movimiento.motivo,
        movimiento.responsable || 'Sistema'
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:movimientos:getByMaterial', async (_, materialId: number) => {
    return dbHelpers.all(
      `SELECT m.*, p.nombre as proyecto_nombre, l.codigo_lote as lote_codigo
       FROM movimientos_inventario m
       LEFT JOIN proyectos p ON m.proyecto_id = p.id
       LEFT JOIN lotes_inventario l ON m.lote_id = l.id
       WHERE m.material_id = ?
       ORDER BY m.fecha DESC
       LIMIT 50`,
      [materialId]
    );
  });

  // ==================== LOTES DE INVENTARIO ====================

  ipcMain.handle('db:lotes:getByMaterial', async (_, materialId: number) => {
    return dbHelpers.all(`
      SELECT l.*, u.abreviatura as unidad_abrev
      FROM lotes_inventario l
      JOIN materiales m ON l.material_id = m.id
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      WHERE l.material_id = ?
      ORDER BY
        CASE WHEN l.fecha_vencimiento IS NULL THEN 1 ELSE 0 END,
        l.fecha_vencimiento ASC,
        l.fecha_ingreso ASC
    `, [materialId]);
  });

  ipcMain.handle('db:lotes:create', async (_, lote: any) => {
    const result = dbHelpers.run(
      `INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lote.material_id, lote.codigo_lote, lote.cantidad_inicial, lote.cantidad_actual, lote.fecha_vencimiento || null, lote.notas || null]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:lotes:update', async (_, id: number, lote: any) => {
    return dbHelpers.run(
      `UPDATE lotes_inventario SET codigo_lote = ?, fecha_vencimiento = ?, notas = ? WHERE id = ?`,
      [lote.codigo_lote, lote.fecha_vencimiento || null, lote.notas || null, id]
    );
  });

  ipcMain.handle('db:lotes:delete', async (_, id: number) => {
    // Solo permitir eliminar lotes vacíos
    const lote = dbHelpers.get<any>('SELECT cantidad_actual FROM lotes_inventario WHERE id = ?', [id]);
    if (lote && lote.cantidad_actual > 0) {
      throw new Error('No se puede eliminar un lote con stock. Primero consuma o ajuste la cantidad.');
    }
    return dbHelpers.run('DELETE FROM lotes_inventario WHERE id = ?', [id]);
  });

  // ==================== ALERTAS ====================

  ipcMain.handle('db:alertas:generar', async (_, proyectoId: number) => {
    try {
      generarAlertasProyecto(proyectoId);
      return { success: true };
    } catch (error) {
      console.error('Error generando alertas:', error);
      throw error;
    }
  });

  // ==================== ÓRDENES DE COMPRA ====================
  
  ipcMain.handle('db:ordenes:getAll', async () => {
    return dbHelpers.all(`
      SELECT o.*, p.nombre as proveedor_nombre, pr.nombre as proyecto_nombre
      FROM ordenes_compra o
      JOIN proveedores p ON o.proveedor_id = p.id
      LEFT JOIN proyectos pr ON o.proyecto_id = pr.id
      ORDER BY o.created_at DESC
    `);
  });

  ipcMain.handle('db:ordenes:getById', async (_, id: number) => {
    return dbHelpers.get(`
      SELECT o.*, p.nombre as proveedor_nombre
      FROM ordenes_compra o
      JOIN proveedores p ON o.proveedor_id = p.id
      WHERE o.id = ?
    `, [id]);
  });

  ipcMain.handle('db:ordenes:create', async (_, orden: any) => {
    const result = dbHelpers.run(
      `INSERT INTO ordenes_compra (proveedor_id, proyecto_id, fecha_emision, fecha_entrega_estimada, estado, total, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orden.proveedor_id,
        orden.proyecto_id,
        orden.fecha_emision || new Date().toISOString().split('T')[0],
        orden.fecha_entrega_estimada,
        orden.estado || 'pendiente',
        orden.total || 0,
        orden.notas
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:ordenes:update', async (_, id: number, orden: any) => {
    const ordenActual = dbHelpers.get('SELECT * FROM ordenes_compra WHERE id = ?', [id]);
    if (!ordenActual) throw new Error('Orden no encontrada');
    
    const ordenActualizada = { ...ordenActual, ...orden };
    
    return dbHelpers.run(
      `UPDATE ordenes_compra 
       SET estado = ?, fecha_entrega_estimada = ?, notas = ?, total = ?
       WHERE id = ?`,
      [
        ordenActualizada.estado,
        ordenActualizada.fecha_entrega_estimada,
        ordenActualizada.notas,
        ordenActualizada.total,
        id
      ]
    );
  });

  ipcMain.handle('db:ordenes:delete', async (_, id: number) => {
    // Primero eliminar detalles
    dbHelpers.run('DELETE FROM detalle_orden_compra WHERE orden_compra_id = ?', [id]);
    return dbHelpers.run('DELETE FROM ordenes_compra WHERE id = ?', [id]);
  });

  ipcMain.handle('db:ordenes:addDetalle', async (_, detalle: any) => {
    return dbHelpers.run(
      `INSERT INTO detalle_orden_compra (orden_compra_id, material_id, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [detalle.orden_compra_id, detalle.material_id, detalle.cantidad, detalle.precio_unitario]
    );
  });

  ipcMain.handle('db:ordenes:getDetalles', async (_, ordenId: number) => {
    return dbHelpers.all(`
      SELECT d.*, m.nombre as material_nombre, m.unidad_medida_id, u.abreviatura as unidad_abrev
      FROM detalle_orden_compra d
      JOIN materiales m ON d.material_id = m.id
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      WHERE d.orden_compra_id = ?
    `, [ordenId]);
  });

  ipcMain.handle('db:ordenes:confirmar', async (_, ordenId: number) => {
    return dbHelpers.run(
      `UPDATE ordenes_compra SET estado = 'confirmada' WHERE id = ?`,
      [ordenId]
    );
  });

  ipcMain.handle('db:ordenes:recibir', async (_, ordenId: number) => {
    return dbHelpers.transaction(() => {
      // Obtener la orden con su proyecto asociado
      const orden = dbHelpers.get<any>(
        'SELECT * FROM ordenes_compra WHERE id = ?',
        [ordenId]
      );
      if (!orden) throw new Error('Orden no encontrada');

      // Actualizar estado de la orden
      dbHelpers.run(
        `UPDATE ordenes_compra SET estado = 'entregada' WHERE id = ?`,
        [ordenId]
      );

      // Obtener detalles de la orden
      const detalles = dbHelpers.all<any>(`
        SELECT material_id, cantidad FROM detalle_orden_compra WHERE orden_compra_id = ?
      `, [ordenId]);

      // Actualizar stock de cada material (crear movimiento de entrada)
      for (const detalle of detalles) {
        const mat = dbHelpers.get<any>(
          'SELECT id, es_perecedero FROM materiales WHERE id = ?',
          [detalle.material_id]
        );

        let loteId: number | null = null;
        let codigoLote: string | null = null;

        // Para perecederos: crear lote automáticamente
        if (mat?.es_perecedero) {
          codigoLote = `ORD-${ordenId}-MAT-${detalle.material_id}`;
          // fecha_vencimiento se puede dejar null aquí; el admin la configura desde el modal de lotes
          const loteResult = dbHelpers.run(
            `INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, orden_compra_id, notas)
             VALUES (?, ?, ?, ?, NULL, ?, ?)`,
            [detalle.material_id, codigoLote, detalle.cantidad, detalle.cantidad, ordenId, `Recepción de orden #${ordenId}`]
          );
          loteId = loteResult.lastInsertRowid as number;
        }

        dbHelpers.run(
          `INSERT INTO movimientos_inventario (material_id, lote_id, tipo, cantidad, motivo, responsable, lote)
           VALUES (?, ?, 'entrada', ?, ?, ?, ?)`,
          [detalle.material_id, loteId, detalle.cantidad, `Recepción de orden #${ordenId}`, 'Sistema', codigoLote]
        );

        // Auto-resolver alertas: si el stock ahora supera el minimo, marcar alertas como atendidas
        const materialActualizado = dbHelpers.get<any>(
          'SELECT id, stock_actual, stock_minimo FROM materiales WHERE id = ?',
          [detalle.material_id]
        );

        if (materialActualizado && materialActualizado.stock_actual >= materialActualizado.stock_minimo) {
          dbHelpers.run(
            `UPDATE alertas SET estado = 'atendida', atendida_at = CURRENT_TIMESTAMP
             WHERE material_id = ? AND estado = 'pendiente'`,
            [detalle.material_id]
          );
        }
      }

      // Regenerar alertas del proyecto si tiene uno asociado
      if (orden.proyecto_id) {
        generarAlertasProyecto(orden.proyecto_id);
      }

      return { success: true };
    });
  });

  // ==================== SIMULADOR ====================
  
  ipcMain.handle('db:simulador:simular', async (_, proyectoId: number, avanceSimulado: number) => {
    try {
      return simularConsumoProyecto(proyectoId, avanceSimulado);
    } catch (error: any) {
      console.error('Error en simulación:', error);
      throw error;
    }
  });

  // ==================== DEPENDENCIAS DE ACTIVIDAD ====================

  ipcMain.handle('db:dependencias:getByActividad', async (_, actividadId: number) => {
    return dbHelpers.all(`
      SELECT dep.*,
             a.nombre as actividad_nombre,
             prec.nombre as precedente_nombre,
             prec.avance_real as precedente_avance
      FROM actividad_dependencias dep
      JOIN actividades a ON dep.actividad_id = a.id
      JOIN actividades prec ON dep.actividad_precedente_id = prec.id
      WHERE dep.actividad_id = ?
      ORDER BY prec.orden
    `, [actividadId]);
  });

  ipcMain.handle('db:dependencias:getByProyecto', async (_, proyectoId: number) => {
    return dbHelpers.all(`
      SELECT dep.*,
             a.nombre as actividad_nombre,
             prec.nombre as precedente_nombre,
             prec.avance_real as precedente_avance
      FROM actividad_dependencias dep
      JOIN actividades a ON dep.actividad_id = a.id
      JOIN actividades prec ON dep.actividad_precedente_id = prec.id
      WHERE a.proyecto_id = ?
      ORDER BY a.orden, prec.orden
    `, [proyectoId]);
  });

  ipcMain.handle('db:dependencias:create', async (_, data: { actividad_id: number; actividad_precedente_id: number; tipo_dependencia?: string; dias_espera?: number }) => {
    if (data.actividad_id === data.actividad_precedente_id) {
      throw new Error('Una actividad no puede depender de si misma');
    }
    return dbHelpers.run(
      `INSERT INTO actividad_dependencias (actividad_id, actividad_precedente_id, tipo_dependencia, dias_espera)
       VALUES (?, ?, ?, ?)`,
      [data.actividad_id, data.actividad_precedente_id, data.tipo_dependencia || 'FS', data.dias_espera || 0]
    );
  });

  ipcMain.handle('db:dependencias:delete', async (_, id: number) => {
    return dbHelpers.run('DELETE FROM actividad_dependencias WHERE id = ?', [id]);
  });

  // Verificar si una actividad tiene dependencias bloqueantes (para validar en confirmarAvance)
  ipcMain.handle('db:dependencias:verificarBloqueo', async (_, actividadId: number) => {
    const dependencias = dbHelpers.all<{
      precedente_nombre: string;
      precedente_avance: number;
      tipo_dependencia: string;
    }>(`
      SELECT
        prec.nombre as precedente_nombre,
        prec.avance_real as precedente_avance,
        dep.tipo_dependencia
      FROM actividad_dependencias dep
      JOIN actividades prec ON dep.actividad_precedente_id = prec.id
      WHERE dep.actividad_id = ?
    `, [actividadId]);

    const bloqueadores: string[] = [];
    for (const dep of dependencias) {
      if (dep.tipo_dependencia === 'FS' && dep.precedente_avance < 100) {
        bloqueadores.push(`"${dep.precedente_nombre}" (${dep.precedente_avance}%)`);
      } else if ((dep.tipo_dependencia === 'SS' || dep.tipo_dependencia === 'SF') && dep.precedente_avance === 0) {
        bloqueadores.push(`"${dep.precedente_nombre}" (no iniciada)`);
      }
    }

    return { bloqueada: bloqueadores.length > 0, bloqueadores };
  });

  // ==================== MATERIALES DE ACTIVIDAD ====================
  
  ipcMain.handle('db:actividades:getMateriales', async (_, actividadId: number) => {
    return dbHelpers.all(`
      SELECT
        ma.*,
        m.nombre as material_nombre,
        m.precio_unitario,
        m.stock_actual,
        u.abreviatura as unidad_abrev
      FROM materiales_actividad ma
      JOIN materiales m ON ma.material_id = m.id
      LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
      WHERE ma.actividad_id = ?
      ORDER BY m.nombre
    `, [actividadId]);
  });

  ipcMain.handle('db:actividades:addMaterial', async (_, data: any) => {
    // Verificar si ya existe
    const existe = dbHelpers.get(
      'SELECT id FROM materiales_actividad WHERE actividad_id = ? AND material_id = ?',
      [data.actividad_id, data.material_id]
    );

    if (existe) {
      throw new Error('Este material ya está asignado a esta actividad');
    }

    // Validar que la cantidad estimada no supere el stock disponible
    const material = dbHelpers.get<any>(
      'SELECT id, nombre, stock_actual, stock_minimo FROM materiales WHERE id = ?',
      [data.material_id]
    );

    if (!material) {
      throw new Error('Material no encontrado');
    }

    if (data.cantidad_estimada > material.stock_actual) {
      throw new Error(
        `La cantidad estimada (${data.cantidad_estimada}) supera el stock disponible de "${material.nombre}" (${material.stock_actual}). No puede asignar más material del que existe en inventario.`
      );
    }

    // Insertar la asignación
    const result = dbHelpers.run(
      `INSERT INTO materiales_actividad (actividad_id, material_id, cantidad_estimada, cantidad_consumida)
       VALUES (?, ?, ?, ?)`,
      [data.actividad_id, data.material_id, data.cantidad_estimada, data.cantidad_consumida || 0]
    );

    // Generar alertas si el stock quedará comprometido
    const actividad = dbHelpers.get<any>(
      'SELECT proyecto_id FROM actividades WHERE id = ?',
      [data.actividad_id]
    );

    if (actividad) {
      const stockRestante = material.stock_actual - data.cantidad_estimada;

      if (stockRestante === 0) {
        // Alerta: el stock se agotará por completo
        dbHelpers.run(
          `INSERT INTO alertas (proyecto_id, material_id, tipo, nivel, mensaje, cantidad_sugerida, estado)
           VALUES (?, ?, 'desabastecimiento_inminente', 'critica', ?, ?, 'pendiente')`,
          [
            actividad.proyecto_id,
            material.id,
            `Al consumir las ${data.cantidad_estimada} unidades de "${material.nombre}" asignadas a esta actividad, el stock quedará en 0. Se recomienda generar una orden de compra de inmediato.`,
            data.cantidad_estimada
          ]
        );
      } else if (stockRestante < material.stock_minimo) {
        // Alerta: el stock quedará por debajo del mínimo
        dbHelpers.run(
          `INSERT INTO alertas (proyecto_id, material_id, tipo, nivel, mensaje, cantidad_sugerida, estado)
           VALUES (?, ?, 'stock_minimo', 'alta', ?, ?, 'pendiente')`,
          [
            actividad.proyecto_id,
            material.id,
            `Al asignar ${data.cantidad_estimada} unidades de "${material.nombre}", el stock proyectado (${stockRestante.toFixed(2)}) quedará por debajo del mínimo requerido (${material.stock_minimo}). Considere reabastecer.`,
            material.stock_minimo - stockRestante
          ]
        );
      }
    }

    return result;
  });

  ipcMain.handle('db:actividades:updateMaterial', async (_, id: number, data: any) => {
    return dbHelpers.run(
      `UPDATE materiales_actividad 
       SET cantidad_estimada = ?, cantidad_consumida = ?
       WHERE id = ?`,
      [data.cantidad_estimada, data.cantidad_consumida, id]
    );
  });

  ipcMain.handle('db:actividades:removeMaterial', async (_, id: number) => {
    return dbHelpers.run('DELETE FROM materiales_actividad WHERE id = ?', [id]);
  });

  console.log('✅ IPC handlers registered');
}