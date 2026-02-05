// src/render/src/lib/database.ts

import type { 
  Proyecto, 
  Material, 
  Proveedor, 
  Actividad, 
  Alerta, 
  UnidadMedida,
  MovimientoInventario, 
  OrdenCompra,
  DetalleOrdenCompra,
  ResultadoSimulacion,
  MaterialActividad
} from '../types';

// Cliente de base de datos para el renderer process
// Usa IPC para comunicarse con el main process

export const db = {
  // ==================== PROYECTOS ====================
  proyectos: {
    getAll: async (): Promise<Proyecto[]> => {
      return window.electron.ipcRenderer.invoke('db:proyectos:getAll');
    },
    
    getById: async (id: number): Promise<Proyecto | null> => {
      return window.electron.ipcRenderer.invoke('db:proyectos:getById', id);
    },
    
    create: async (proyecto: Partial<Proyecto>): Promise<{ id: number }> => {
      return window.electron.ipcRenderer.invoke('db:proyectos:create', proyecto);
    },
    
    update: async (id: number, proyecto: Partial<Proyecto>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:proyectos:update', id, proyecto);
    },
    
    delete: async (id: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:proyectos:delete', id);
    }
  },

  // ==================== MATERIALES ====================
  materiales: {
    getAll: async (): Promise<Material[]> => {
      return window.electron.ipcRenderer.invoke('db:materiales:getAll');
    },
    
    getById: async (id: number): Promise<Material | null> => {
      return window.electron.ipcRenderer.invoke('db:materiales:getById', id);
    },
    
    create: async (material: Partial<Material>): Promise<{ id: number }> => {
      return window.electron.ipcRenderer.invoke('db:materiales:create', material);
    },
    
    update: async (id: number, material: Partial<Material>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:materiales:update', id, material);
    }
  },

  // ==================== PROVEEDORES ====================
  proveedores: {
    getAll: async (): Promise<Proveedor[]> => {
      return window.electron.ipcRenderer.invoke('db:proveedores:getAll');
    },
    
    getById: async (id: number): Promise<Proveedor | null> => {
      return window.electron.ipcRenderer.invoke('db:proveedores:getById', id);
    },
    
    create: async (proveedor: Partial<Proveedor>): Promise<{ id: number }> => {
      return window.electron.ipcRenderer.invoke('db:proveedores:create', proveedor);
    },
    
    update: async (id: number, proveedor: Partial<Proveedor>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:proveedores:update', id, proveedor);
    },
    
    delete: async (id: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:proveedores:delete', id);
    },
    
    getMateriales: async (id: number): Promise<Material[]> => {
      return window.electron.ipcRenderer.invoke('db:proveedores:getMateriales', id);
    }
  },

  // ==================== ACTIVIDADES ====================
  actividades: {
    getByProyecto: async (proyectoId: number): Promise<Actividad[]> => {
      return window.electron.ipcRenderer.invoke('db:actividades:getByProyecto', proyectoId);
    },
    
    create: async (actividad: Partial<Actividad>): Promise<{ id: number }> => {
      return window.electron.ipcRenderer.invoke('db:actividades:create', actividad);
    },
    
    update: async (id: number, actividad: Partial<Actividad>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:actividades:update', id, actividad);
    },
    
    getMateriales: async (actividadId: number): Promise<MaterialActividad[]> => {
      return window.electron.ipcRenderer.invoke('db:actividades:getMateriales', actividadId);
    },
    
    addMaterial: async (data: Partial<MaterialActividad>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:actividades:addMaterial', data);
    },
    
    updateMaterial: async (id: number, data: Partial<MaterialActividad>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:actividades:updateMaterial', id, data);
    },
    
    removeMaterial: async (id: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:actividades:removeMaterial', id);
    }
  },

  // ==================== ALERTAS ====================
  alertas: {
    getAll: async (): Promise<Alerta[]> => {
      return window.electron.ipcRenderer.invoke('db:alertas:getAll');
    },
    
    marcarAtendida: async (id: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:alertas:marcarAtendida', id);
    },
    
    generar: async (proyectoId: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:alertas:generar', proyectoId);
    }
  },

  // ==================== UNIDADES ====================
  unidades: {
    getAll: async (): Promise<UnidadMedida[]> => {
      return window.electron.ipcRenderer.invoke('db:unidades:getAll');
    }
  },

  // ==================== MOVIMIENTOS ====================
  movimientos: {
    create: async (movimiento: Partial<MovimientoInventario>): Promise<{ id: number }> => {
      return window.electron.ipcRenderer.invoke('db:movimientos:create', movimiento);
    },
    
    getByMaterial: async (materialId: number): Promise<MovimientoInventario[]> => {
      return window.electron.ipcRenderer.invoke('db:movimientos:getByMaterial', materialId);
    }
  },

// ==================== ÓRDENES DE COMPRA ====================
  ordenes: {
    getAll: async (): Promise<OrdenCompra[]> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:getAll');
    },
    
    getById: async (id: number): Promise<OrdenCompra | null> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:getById', id);
    },
    
    create: async (orden: Partial<OrdenCompra>): Promise<{ id: number }> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:create', orden);
    },
    
    update: async (id: number, orden: Partial<OrdenCompra>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:update', id, orden);
    },
    
    delete: async (id: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:delete', id);
    },
    
    addDetalle: async (detalle: Partial<DetalleOrdenCompra>): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:addDetalle', detalle);
    },
    
    getDetalles: async (ordenId: number): Promise<DetalleOrdenCompra[]> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:getDetalles', ordenId);
    },
    
    confirmar: async (ordenId: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:confirmar', ordenId);
    },
    
    recibir: async (ordenId: number): Promise<void> => {
      return window.electron.ipcRenderer.invoke('db:ordenes:recibir', ordenId);
    }
  },

  // ==================== SIMULADOR ====================
  simulador: {
    simular: async (proyectoId: number, avanceSimulado: number): Promise<ResultadoSimulacion> => {
      return window.electron.ipcRenderer.invoke('db:simulador:simular', proyectoId, avanceSimulado);
    }
  }
  
};