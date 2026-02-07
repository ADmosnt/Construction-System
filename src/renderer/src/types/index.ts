// src/render/src/types/index.ts

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  presupuesto_total: number;
  avance_actual: number;
  estado: 'activo' | 'pausado' | 'finalizado';
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida_id: number;
  proveedor_id: number | null;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  precio_unitario: number;
  es_critico: boolean;
  es_perecedero: boolean;
  fecha_vencimiento: string | null;
  dias_aviso_vencimiento: number;
  created_at: string;
  // Campos joined
  unidad_nombre?: string;
  unidad_abrev?: string;
  proveedor_nombre?: string;
  tiempo_entrega_dias?: number;
}

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tiempo_entrega_dias: number;
  created_at: string;
}

export interface Actividad {
  id: number;
  proyecto_id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  avance_planificado: number;
  avance_real: number;
  fecha_inicio_planificada: string | null;
  fecha_fin_planificada: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  created_at: string;
}

export interface Alerta {
  id: number;
  proyecto_id: number | null;
  material_id: number | null;
  actividad_id: number | null;
  tipo: 'stock_minimo' | 'desabastecimiento_inminente' | 'reorden_sugerido'
    | 'desviacion_consumo' | 'stock_estancado' | 'vencimiento_material'
    | 'variacion_precio' | 'dependencia_bloqueada';
  nivel: 'baja' | 'media' | 'alta' | 'critica';
  mensaje: string;
  dias_hasta_desabastecimiento: number | null;
  cantidad_sugerida: number | null;
  fecha_sugerida_pedido: string | null;
  datos_extra: string | null;
  estado: 'pendiente' | 'atendida' | 'descartada';
  created_at: string;
  atendida_at: string | null;
  // Campos joined
  proyecto_nombre?: string;
  material_nombre?: string;
  actividad_nombre?: string;
  material_stock_actual?: number;
  material_stock_minimo?: number;
  material_unidad_abrev?: string;
}

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
  tipo: 'volumen' | 'peso' | 'longitud' | 'area' | 'unidad';
}

export interface MovimientoInventario {
  id: number;
  material_id: number;
  proyecto_id: number | null;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string | null;
  responsable: string | null;
  lote: string | null;
  fecha: string;
  // Campos joined
  proyecto_nombre?: string;
}

export interface ActividadDependencia {
  id: number;
  actividad_id: number;
  actividad_precedente_id: number;
  tipo_dependencia: 'FS' | 'SS' | 'FF' | 'SF';
  dias_espera: number;
  created_at: string;
  // Campos joined
  actividad_nombre?: string;
  precedente_nombre?: string;
  precedente_avance?: number;
}

export interface Usuario {
  id: number;
  username: string;
  nombre_completo: string;
  email: string | null;
  rol: 'admin' | 'supervisor' | 'operador';
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
}

export interface OrdenCompra {
  id: number;
  proveedor_id: number;
  proyecto_id: number | null;
  fecha_emision: string;
  fecha_entrega_estimada: string | null;
  fecha_recepcion_real: string | null;
  estado: 'pendiente' | 'confirmada' | 'en_transito' | 'entregada' | 'cancelada';
  total: number;
  notas: string | null;
  created_at: string;
  // Campos joined
  proveedor_nombre?: string;
  proyecto_nombre?: string;
}

export interface DetalleOrdenCompra {
  id: number;
  orden_compra_id: number;
  material_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  // Campos joined
  material_nombre?: string;
  unidad_abrev?: string;
}

export interface SimulacionResultado {
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

export interface ResultadoSimulacion {
  avance_simulado: number;
  materiales: SimulacionResultado[];
  resumen: {
    total_materiales: number;
    materiales_criticos: number;
    materiales_requieren_orden: number;
    costo_estimado_ordenes: number;
  };
}

export interface MaterialActividad {
  id: number;
  actividad_id: number;
  material_id: number;
  cantidad_estimada: number;
  cantidad_consumida: number;
  created_at: string;
  // Campos joined
  material_nombre?: string;
  precio_unitario?: number;
  unidad_abrev?: string;
  stock_actual?: number;
}

export interface ConsumoConfirmacion {
  material_actividad_id: number;
  material_id: number;
  cantidad_consumir: number;
}