-- SEED DATA: Datos de prueba para el sistema

-- Unidades de medida
INSERT INTO unidades_medida (nombre, abreviatura, tipo) VALUES
('Metro cúbico', 'm³', 'volumen'),
('Kilogramo', 'kg', 'peso'),
('Tonelada', 't', 'peso'),
('Metro lineal', 'm', 'longitud'),
('Metro cuadrado', 'm²', 'area'),
('Unidad', 'und', 'unidad'),
('Saco', 'saco', 'unidad'),
('Litro', 'L', 'volumen'),
('Galón', 'gal', 'volumen'),
('Pieza', 'pza', 'unidad');

-- Proveedores
INSERT INTO proveedores (nombre, contacto, telefono, email, tiempo_entrega_dias) VALUES
('Concretera del Este', 'Carlos Méndez', '+58-212-5551234', 'ventas@concretera.com', 5),
('Distribuidora MetalHierro C.A.', 'Ana Rodríguez', '+58-212-5555678', 'pedidos@metalhierro.com', 3),
('Ferretería Los Pinos', 'Juan Pérez', '+58-212-5559012', 'info@lospinos.com', 2),
('Acabados Premium', 'María González', '+58-212-5553456', 'ventas@acabadospremium.com', 7),
('Cementos Caribe', 'Luis Torres', '+58-212-5557890', 'distribucion@cementoscaribe.com', 4);

-- Materiales
INSERT INTO materiales (nombre, descripcion, unidad_medida_id, proveedor_id, stock_actual, stock_minimo, stock_maximo, precio_unitario, es_critico) VALUES
-- Concreto y agregados
('Concreto premezclado 210 kg/cm²', 'Concreto para fundaciones y estructura', 1, 1, 15.5, 20.0, 80.0, 85.00, 1),
('Arena lavada', 'Arena para mezclas', 1, 1, 8.0, 10.0, 50.0, 25.00, 0),
('Piedra picada 3/4"', 'Agregado grueso para concreto', 1, 1, 12.0, 15.0, 60.0, 30.00, 0),

-- Acero
('Cabilla 3/8" (9.5mm)', 'Acero de refuerzo corrugado', 2, 2, 850.0, 1000.0, 5000.0, 2.50, 1),
('Cabilla 1/2" (12.7mm)', 'Acero de refuerzo corrugado', 2, 2, 420.0, 500.0, 3000.0, 3.80, 1),
('Alambre de amarre', 'Alambre negro calibre 18', 2, 2, 45.0, 50.0, 200.0, 1.20, 0),
('Malla electrosoldada 15x15', 'Malla de acero para losas', 5, 2, 28.0, 30.0, 100.0, 12.50, 0),

-- Cemento y materiales secos
('Cemento gris tipo I', 'Cemento portland 42.5kg', 7, 5, 85, 100, 400, 8.50, 1),
('Cemento blanco', 'Cemento para acabados', 7, 5, 15, 20, 100, 12.00, 0),

-- Bloques y mampostería
('Bloque de arcilla 10x20x40', 'Bloque para paredes', 6, 3, 1250, 1500, 8000, 0.65, 0),
('Bloque de concreto 15x20x40', 'Bloque estructural', 6, 3, 680, 800, 5000, 0.85, 0),

-- Instalaciones
('Tubería PVC 1/2" (agua)', 'Tubería sanitaria', 4, 3, 45.0, 50.0, 200.0, 2.80, 0),
('Tubería PVC 4" (aguas negras)', 'Tubería de drenaje', 4, 3, 28.0, 30.0, 150.0, 8.50, 0),
('Cable eléctrico 12 AWG', 'Cable de cobre THHN', 4, 3, 120.0, 150.0, 500.0, 3.20, 0),
('Cable eléctrico 14 AWG', 'Cable de cobre THHN', 4, 3, 85.0, 100.0, 400.0, 2.40, 0),

-- Acabados
('Pintura látex blanca', 'Pintura acrílica para interiores', 8, 4, 25.0, 30.0, 120.0, 18.00, 0),
('Pintura látex color', 'Pintura acrílica satinada', 8, 4, 12.0, 15.0, 80.0, 22.00, 0),
('Cerámica piso 40x40', 'Porcelanato esmaltado', 5, 4, 42.0, 50.0, 200.0, 15.50, 0),
('Cerámica pared 30x45', 'Cerámica para baños', 5, 4, 35.0, 40.0, 180.0, 12.80, 0),

-- Otros
('Mortero premezclado', 'Mortero tipo S para pega', 7, 5, 55, 60, 250, 6.20, 0);

-- Proyecto de ejemplo
INSERT INTO proyectos (nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, presupuesto_total, avance_actual, estado)
VALUES 
('Casa Unifamiliar Los Samanes', 
 'Construcción de vivienda de 2 plantas con 180m² de construcción', 
 'Urbanización Los Samanes, Charallave, Miranda',
 '2026-01-06',
 '2026-06-06',
 45000.00,
 42.0,
 'activo');

-- Actividades del proyecto
INSERT INTO actividades (proyecto_id, nombre, descripcion, orden, avance_planificado, avance_real, fecha_inicio_planificada, fecha_fin_planificada) VALUES
(1, 'Preliminares y limpieza', 'Limpieza de terreno y replanteo', 1, 100, 100, '2026-01-06', '2026-01-10'),
(1, 'Excavación y movimiento de tierra', 'Excavación para fundaciones', 2, 100, 100, '2026-01-11', '2026-01-17'),
(1, 'Fundaciones', 'Zapatas, vigas de riostra y pedestales', 3, 100, 100, '2026-01-18', '2026-01-28'),
(1, 'Estructura de concreto - Planta Baja', 'Columnas, vigas y losa PB', 4, 100, 100, '2026-01-29', '2026-02-12'),
(1, 'Estructura de concreto - Planta Alta', 'Columnas, vigas y losa PA', 5, 85, 78, '2026-02-13', '2026-02-27'),
(1, 'Mampostería - Planta Baja', 'Levantamiento de paredes PB', 6, 60, 45, '2026-02-28', '2026-03-14'),
(1, 'Mampostería - Planta Alta', 'Levantamiento de paredes PA', 7, 40, 20, '2026-03-15', '2026-03-28'),
(1, 'Instalaciones eléctricas', 'Tuberías y cableado eléctrico', 8, 30, 15, '2026-03-16', '2026-04-05'),
(1, 'Instalaciones sanitarias', 'Tuberías de agua y drenaje', 9, 25, 12, '2026-03-20', '2026-04-08'),
(1, 'Acabados interiores', 'Frisos, pisos y pintura interior', 10, 10, 0, '2026-04-09', '2026-04-25'),
(1, 'Acabados exteriores', 'Fachada y pintura exterior', 11, 0, 0, '2026-04-20', '2026-04-30'),
(1, 'Limpieza final y entrega', 'Limpieza y detalles finales', 12, 0, 0, '2026-05-01', '2026-06-06');

-- Materiales por actividad (ejemplos realistas)
-- Fundaciones
INSERT INTO materiales_actividad (actividad_id, material_id, cantidad_estimada, cantidad_consumida) VALUES
(3, 1, 45.0, 45.0),  -- Concreto 210
(3, 4, 2800.0, 2800.0),  -- Cabilla 3/8
(3, 5, 1200.0, 1200.0),  -- Cabilla 1/2

-- Estructura PB
(4, 1, 35.0, 35.0),
(4, 4, 2200.0, 2200.0),
(4, 5, 1800.0, 1800.0),

-- Estructura PA
(5, 1, 32.0, 25.0),  -- Solo consumido parcial (78% de avance)
(5, 4, 2000.0, 1560.0),
(5, 5, 1600.0, 1248.0),

-- Mampostería PB
(6, 10, 2400, 1080),  -- Bloques arcilla (45% consumido)
(6, 8, 48, 22),  -- Cemento
(6, 2, 6.0, 2.7),  -- Arena

-- Mampostería PA
(7, 10, 2200, 440),  -- Bloques (20% consumido)
(7, 8, 44, 9),
(7, 2, 5.5, 1.1),

-- Instalaciones eléctricas
(8, 14, 320.0, 48.0),  -- Cable 12 AWG (15% consumido)
(8, 15, 280.0, 42.0),  -- Cable 14 AWG

-- Instalaciones sanitarias
(9, 12, 85.0, 10.2),  -- Tubería 1/2"
(9, 13, 42.0, 5.0),  -- Tubería 4"

-- Acabados interiores
(10, 16, 65.0, 0),  -- Pintura blanca
(10, 17, 35.0, 0),  -- Pintura color
(10, 18, 95.0, 0),  -- Cerámica piso
(10, 19, 75.0, 0);  -- Cerámica pared

-- Movimientos de inventario (historial de algunos movimientos)
INSERT INTO movimientos_inventario (material_id, proyecto_id, tipo, cantidad, motivo, fecha) VALUES
(1, 1, 'salida', 45.0, 'Vaciado de fundaciones', '2025-01-25'),
(4, 1, 'salida', 2800.0, 'Acero para fundaciones', '2025-01-22'),
(1, 1, 'salida', 35.0, 'Vaciado estructura PB', '2025-02-08'),
(1, 1, 'entrada', 50.0, 'Compra para estructura PA', '2025-02-10'),
(1, 1, 'salida', 25.0, 'Vaciado estructura PA (parcial)', '2025-02-20'),
(10, 1, 'salida', 1080, 'Mampostería PB', '2025-03-05'),
(8, 1, 'salida', 22, 'Mortero mampostería PB', '2025-03-06');

-- Alertas generadas automáticamente (simularemos algunas)
INSERT INTO alertas (proyecto_id, material_id, tipo, nivel, mensaje, dias_hasta_desabastecimiento, cantidad_sugerida, fecha_sugerida_pedido, estado) VALUES
(1, 1, 'desabastecimiento_inminente', 'critica', 
 'Stock de Concreto premezclado 210 kg/cm² por debajo del mínimo. Se estima desabastecimiento en 8 días considerando avance actual y plazo de entrega.', 
 8, 35.0, date('now', '+1 day'), 'pendiente'),

(1, 4, 'stock_minimo', 'alta',
 'Stock de Cabilla 3/8" por debajo del mínimo establecido. Considerar reabastecimiento.',
 12, 1500.0, date('now', '+3 days'), 'pendiente'),

(1, 8, 'reorden_sugerido', 'media',
 'Basado en consumo proyectado para mampostería, se sugiere ordenar cemento.',
 15, 80, date('now', '+5 days'), 'pendiente'),

(1, 10, 'stock_minimo', 'media',
 'Stock de bloques cercano al mínimo. Actividad de mampostería PA requiere abastecimiento.',
 18, 2000, date('now', '+7 days'), 'pendiente');