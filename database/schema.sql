-- =====================================================================
-- SCHEMA: Sistema de Gestion de Construccion
-- Version 2.0 - Incluye: login, dependencias, vencimientos, precios
-- =====================================================================

-- TABLA: usuarios
-- Sistema de autenticacion y control de acceso
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    email TEXT,
    rol TEXT DEFAULT 'operador' CHECK(rol IN ('admin', 'supervisor', 'operador')),
    activo BOOLEAN DEFAULT 1,
    ultimo_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: proyectos
-- Almacena la informacion general de cada proyecto de construccion
CREATE TABLE proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    ubicacion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin_estimada DATE NOT NULL,
    presupuesto_total REAL DEFAULT 0,
    avance_actual REAL DEFAULT 0 CHECK(avance_actual >= 0 AND avance_actual <= 100),
    estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'pausado', 'finalizado')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: proveedores
-- Catalogo de proveedores de materiales
CREATE TABLE proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    tiempo_entrega_dias INTEGER NOT NULL DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: unidades_medida
-- Catalogo de unidades de medida para materiales
CREATE TABLE unidades_medida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('volumen', 'peso', 'longitud', 'area', 'unidad'))
);

-- TABLA: materiales
-- Catalogo de materiales de construccion
CREATE TABLE materiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad_medida_id INTEGER NOT NULL,
    proveedor_id INTEGER,
    stock_actual REAL DEFAULT 0,
    stock_minimo REAL DEFAULT 0,
    stock_maximo REAL DEFAULT 0,
    precio_unitario REAL DEFAULT 0,
    es_critico BOOLEAN DEFAULT 0,
    -- Campos para vencimiento de material (#3)
    es_perecedero BOOLEAN DEFAULT 0,
    fecha_vencimiento DATE,
    dias_aviso_vencimiento INTEGER DEFAULT 15,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- TABLA: actividades
-- Actividades/partidas de un proyecto (fundaciones, estructura, etc.)
CREATE TABLE actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    avance_planificado REAL DEFAULT 0 CHECK(avance_planificado >= 0 AND avance_planificado <= 100),
    avance_real REAL DEFAULT 0 CHECK(avance_real >= 0 AND avance_real <= 100),
    fecha_inicio_planificada DATE,
    fecha_fin_planificada DATE,
    fecha_inicio_real DATE,
    fecha_fin_real DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);

-- TABLA: actividad_dependencias
-- Relaciones de precedencia entre actividades (#6)
-- tipo_dependencia: FS=Fin-a-Inicio, SS=Inicio-a-Inicio, FF=Fin-a-Fin, SF=Inicio-a-Fin
CREATE TABLE actividad_dependencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actividad_id INTEGER NOT NULL,
    actividad_precedente_id INTEGER NOT NULL,
    tipo_dependencia TEXT DEFAULT 'FS' CHECK(tipo_dependencia IN ('FS', 'SS', 'FF', 'SF')),
    dias_espera INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    FOREIGN KEY (actividad_precedente_id) REFERENCES actividades(id) ON DELETE CASCADE,
    UNIQUE(actividad_id, actividad_precedente_id)
);

-- TABLA: materiales_actividad
-- Relacion entre actividades y materiales (que materiales necesita cada actividad)
CREATE TABLE materiales_actividad (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actividad_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    cantidad_estimada REAL NOT NULL,
    cantidad_consumida REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    UNIQUE(actividad_id, material_id)
);

-- TABLA: lotes_inventario
-- Gestión de lotes para materiales perecederos (FEFO: First Expired, First Out)
CREATE TABLE lotes_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    codigo_lote TEXT,
    cantidad_inicial REAL NOT NULL,
    cantidad_actual REAL NOT NULL,
    fecha_vencimiento DATE,
    fecha_ingreso DATE DEFAULT (DATE('now')),
    orden_compra_id INTEGER,
    notas TEXT,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id)
);

-- TABLA: movimientos_inventario
-- Registro de entradas/salidas de materiales
CREATE TABLE movimientos_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    proyecto_id INTEGER,
    lote_id INTEGER,
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad REAL NOT NULL,
    motivo TEXT,
    responsable TEXT,
    lote TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (lote_id) REFERENCES lotes_inventario(id)
);

-- TABLA: alertas
-- Alertas generadas por el sistema (expandida para todos los tipos)
CREATE TABLE alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER,
    material_id INTEGER,
    actividad_id INTEGER,
    tipo TEXT CHECK(tipo IN (
        'stock_minimo',
        'desabastecimiento_inminente',
        'reorden_sugerido',
        'desviacion_consumo',
        'stock_estancado',
        'vencimiento_material',
        'variacion_precio',
        'dependencia_bloqueada'
    )),
    nivel TEXT CHECK(nivel IN ('baja', 'media', 'alta', 'critica')),
    mensaje TEXT NOT NULL,
    dias_hasta_desabastecimiento INTEGER,
    cantidad_sugerida REAL,
    fecha_sugerida_pedido DATE,
    -- Metadatos adicionales para alertas especializadas (JSON flexible)
    datos_extra TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'atendida', 'descartada')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    atendida_at DATETIME,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

-- TABLA: ordenes_compra
-- Ordenes de compra generadas
CREATE TABLE ordenes_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    proyecto_id INTEGER,
    fecha_emision DATE NOT NULL,
    fecha_entrega_estimada DATE,
    fecha_recepcion_real DATE,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmada', 'en_transito', 'entregada', 'cancelada')),
    total REAL DEFAULT 0,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
);

-- TABLA: detalle_orden_compra
CREATE TABLE detalle_orden_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_compra_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materiales(id)
);

-- =====================================================================
-- INDICES
-- =====================================================================

CREATE INDEX idx_proyectos_estado ON proyectos(estado);
CREATE INDEX idx_materiales_proveedor ON materiales(proveedor_id);
CREATE INDEX idx_materiales_vencimiento ON materiales(fecha_vencimiento);
CREATE INDEX idx_actividades_proyecto ON actividades(proyecto_id);
CREATE INDEX idx_dependencias_actividad ON actividad_dependencias(actividad_id);
CREATE INDEX idx_dependencias_precedente ON actividad_dependencias(actividad_precedente_id);
CREATE INDEX idx_alertas_proyecto ON alertas(proyecto_id);
CREATE INDEX idx_alertas_estado ON alertas(estado);
CREATE INDEX idx_alertas_tipo ON alertas(tipo);
CREATE INDEX idx_lotes_material ON lotes_inventario(material_id);
CREATE INDEX idx_lotes_vencimiento ON lotes_inventario(fecha_vencimiento);
CREATE INDEX idx_lotes_activo ON lotes_inventario(material_id, activo);
CREATE INDEX idx_movimientos_material ON movimientos_inventario(material_id);
CREATE INDEX idx_movimientos_lote ON movimientos_inventario(lote_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha);
CREATE INDEX idx_movimientos_material_fecha ON movimientos_inventario(material_id, fecha);
CREATE INDEX idx_ordenes_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX idx_ordenes_estado ON ordenes_compra(estado);
CREATE INDEX idx_detalle_orden_material ON detalle_orden_compra(material_id);

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Actualizar updated_at en proyectos
CREATE TRIGGER update_proyecto_timestamp
AFTER UPDATE ON proyectos
BEGIN
    UPDATE proyectos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Actualizar stock al registrar movimiento de entrada
CREATE TRIGGER actualizar_stock_entrada
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'entrada'
BEGIN
    UPDATE materiales
    SET stock_actual = stock_actual + NEW.cantidad
    WHERE id = NEW.material_id;
END;

-- Actualizar stock al registrar movimiento de salida
CREATE TRIGGER actualizar_stock_salida
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'salida'
BEGIN
    UPDATE materiales
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.material_id;
END;

-- Actualizar stock al registrar ajuste (valor absoluto)
CREATE TRIGGER actualizar_stock_ajuste
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'ajuste'
BEGIN
    UPDATE materiales
    SET stock_actual = NEW.cantidad
    WHERE id = NEW.material_id;
END;

-- Registrar fecha real de recepcion al recibir orden
CREATE TRIGGER registrar_recepcion_orden
AFTER UPDATE ON ordenes_compra
WHEN NEW.estado = 'entregada' AND OLD.estado != 'entregada'
BEGIN
    UPDATE ordenes_compra
    SET fecha_recepcion_real = DATE('now')
    WHERE id = NEW.id AND fecha_recepcion_real IS NULL;
END;
