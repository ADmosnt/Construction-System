// src/main/ipc-handlers.ts

import { ipcMain } from 'electron';
import { dbHelpers } from './database';
import { generarAlertasProyecto } from './alerts';
import { simularConsumoProyecto } from './simulator';

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
                               stock_actual, stock_minimo, stock_maximo, precio_unitario, es_critico)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        material.nombre,
        material.descripcion,
        material.unidad_medida_id,
        material.proveedor_id,
        material.stock_actual || 0,
        material.stock_minimo || 0,
        material.stock_maximo || 0,
        material.precio_unitario || 0,
        material.es_critico ? 1 : 0
      ]
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('db:materiales:update', async (_, id: number, material: any) => {
    return dbHelpers.run(
      `UPDATE materiales 
       SET nombre = ?, descripcion = ?, unidad_medida_id = ?, proveedor_id = ?,
           stock_actual = ?, stock_minimo = ?, stock_maximo = ?, precio_unitario = ?, es_critico = ?
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
    return dbHelpers.run(
      `UPDATE actividades 
       SET avance_real = ?, fecha_inicio_real = ?, fecha_fin_real = ?
       WHERE id = ?`,
      [actividad.avance_real, actividad.fecha_inicio_real, actividad.fecha_fin_real, id]
    );
  });

  // ==================== ALERTAS ====================
  
  ipcMain.handle('db:alertas:getAll', async () => {
    return dbHelpers.all(`
      SELECT a.*, p.nombre as proyecto_nombre, m.nombre as material_nombre
      FROM alertas a
      JOIN proyectos p ON a.proyecto_id = p.id
      JOIN materiales m ON a.material_id = m.id
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

  // ==================== UNIDADES DE MEDIDA ====================
  
  ipcMain.handle('db:unidades:getAll', async () => {
    return dbHelpers.all('SELECT * FROM unidades_medida ORDER BY nombre');
  });

  // ==================== MOVIMIENTOS ====================
  
  ipcMain.handle('db:movimientos:create', async (_, movimiento: any) => {
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
      `SELECT m.*, p.nombre as proyecto_nombre 
       FROM movimientos_inventario m
       LEFT JOIN proyectos p ON m.proyecto_id = p.id
       WHERE m.material_id = ?
       ORDER BY m.fecha DESC
       LIMIT 50`,
      [materialId]
    );
  });

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
    // Actualizar estado de la orden
    dbHelpers.run(
      `UPDATE ordenes_compra SET estado = 'entregada' WHERE id = ?`,
      [ordenId]
    );

    // Obtener detalles de la orden
    const detalles = dbHelpers.all(`
      SELECT material_id, cantidad FROM detalle_orden_compra WHERE orden_compra_id = ?
    `, [ordenId]);

    // Actualizar stock de cada material (crear movimiento de entrada)
    for (const detalle of detalles) {
      dbHelpers.run(
        `INSERT INTO movimientos_inventario (material_id, tipo, cantidad, motivo, responsable)
         VALUES (?, 'entrada', ?, ?, ?)`,
        [detalle.material_id, detalle.cantidad, `Recepción de orden #${ordenId}`, 'Sistema']
      );
    }

    return { success: true };
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

  // ==================== MATERIALES DE ACTIVIDAD ====================
  
  ipcMain.handle('db:actividades:getMateriales', async (_, actividadId: number) => {
    return dbHelpers.all(`
      SELECT 
        ma.*,
        m.nombre as material_nombre,
        m.precio_unitario,
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

    return dbHelpers.run(
      `INSERT INTO materiales_actividad (actividad_id, material_id, cantidad_estimada, cantidad_consumida)
       VALUES (?, ?, ?, ?)`,
      [data.actividad_id, data.material_id, data.cantidad_estimada, data.cantidad_consumida || 0]
    );
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