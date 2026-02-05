-- TABLA: proyectos
-- Almacena la información general de cada proyecto de construcción
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
-- Catálogo de proveedores de materiales
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
-- Catálogo de unidades de medida para materiales
CREATE TABLE unidades_medida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    abreviatura TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('volumen', 'peso', 'longitud', 'area', 'unidad'))
);

-- TABLA: materiales
-- Catálogo de materiales de construcción
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

-- TABLA: materiales_actividad
-- Relación entre actividades y materiales (qué materiales necesita cada actividad)
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

-- TABLA: movimientos_inventario
-- Registro de entradas/salidas de materiales
CREATE TABLE movimientos_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    proyecto_id INTEGER,
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad REAL NOT NULL,
    motivo TEXT,
    responsable TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materiales(id),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
);

-- TABLA: alertas
-- Alertas generadas por el sistema
CREATE TABLE alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('stock_minimo', 'desabastecimiento_inminente', 'reorden_sugerido')),
    nivel TEXT CHECK(nivel IN ('baja', 'media', 'alta', 'critica')),
    mensaje TEXT NOT NULL,
    dias_hasta_desabastecimiento INTEGER,
    cantidad_sugerida REAL,
    fecha_sugerida_pedido DATE,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'atendida', 'descartada')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    atendida_at DATETIME,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materiales(id)
);

-- TABLA: ordenes_compra
-- Órdenes de compra generadas (opcional pero útil)
CREATE TABLE ordenes_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    proyecto_id INTEGER,
    fecha_emision DATE NOT NULL,
    fecha_entrega_estimada DATE,
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

-- ÍNDICES para mejorar rendimiento
CREATE INDEX idx_proyectos_estado ON proyectos(estado);
CREATE INDEX idx_materiales_proveedor ON materiales(proveedor_id);
CREATE INDEX idx_actividades_proyecto ON actividades(proyecto_id);
CREATE INDEX idx_alertas_proyecto ON alertas(proyecto_id);
CREATE INDEX idx_alertas_estado ON alertas(estado);
CREATE INDEX idx_movimientos_material ON movimientos_inventario(material_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha);

-- TRIGGER: Actualizar updated_at en proyectos
CREATE TRIGGER update_proyecto_timestamp 
AFTER UPDATE ON proyectos
BEGIN
    UPDATE proyectos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- TRIGGER: Actualizar stock al registrar movimiento
CREATE TRIGGER actualizar_stock_entrada
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'entrada'
BEGIN
    UPDATE materiales 
    SET stock_actual = stock_actual + NEW.cantidad
    WHERE id = NEW.material_id;
END;

CREATE TRIGGER actualizar_stock_salida
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'salida'
BEGIN
    UPDATE materiales 
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.material_id;
END;

CREATE TRIGGER actualizar_stock_ajuste
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'ajuste'
BEGIN
    UPDATE materiales 
    SET stock_actual = NEW.cantidad
    WHERE id = NEW.material_id;
END;