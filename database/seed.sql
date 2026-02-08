-- SEED DATA: Datos de prueba para el sistema v2.0

-- Usuario admin por defecto (password sera configurado en el login)
-- Hash placeholder: se reemplazara cuando se implemente el modulo de login
INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol, activo) VALUES
('admin', '$placeholder$admin', 'Administrador del Sistema', 'admin@proig.com', 'admin', 1),
('supervisor1', '$placeholder$super', 'Carlos Mendez', 'cmendez@proig.com', 'supervisor', 1);

-- Unidades de medida
INSERT INTO unidades_medida (nombre, abreviatura, tipo) VALUES
('Metro cubico', 'm3', 'volumen'),
('Kilogramo', 'kg', 'peso'),
('Tonelada', 't', 'peso'),
('Metro lineal', 'm', 'longitud'),
('Metro cuadrado', 'm2', 'area'),
('Unidad', 'und', 'unidad'),
('Saco', 'saco', 'unidad'),
('Litro', 'L', 'volumen'),
('Galon', 'gal', 'volumen'),
('Pieza', 'pza', 'unidad');

-- Proveedores
INSERT INTO proveedores (nombre, contacto, telefono, email, tiempo_entrega_dias) VALUES
('Concretera del Este', 'Carlos Mendez', '+58-212-5551234', 'ventas@concretera.com', 5),
('Distribuidora MetalHierro C.A.', 'Ana Rodriguez', '+58-212-5555678', 'pedidos@metalhierro.com', 3),
('Ferreteria Los Pinos', 'Juan Perez', '+58-212-5559012', 'info@lospinos.com', 2),
('Acabados Premium', 'Maria Gonzalez', '+58-212-5553456', 'ventas@acabadospremium.com', 7),
('Cementos Caribe', 'Luis Torres', '+58-212-5557890', 'distribucion@cementoscaribe.com', 4);

-- Materiales
-- NOTA: stock_actual es el inventario INICIAL antes de movimientos.
-- Los triggers de movimientos_inventario ajustan stock_actual automaticamente.
-- es_perecedero/fecha_vencimiento: materiales que caducan (cemento, aditivos, etc.)
INSERT INTO materiales (nombre, descripcion, unidad_medida_id, proveedor_id, stock_actual, stock_minimo, stock_maximo, precio_unitario, es_critico, es_perecedero, fecha_vencimiento, dias_aviso_vencimiento) VALUES
-- Concreto y agregados (id=1,2,3)
('Concreto premezclado 210 kg/cm2', 'Concreto para fundaciones y estructura', 1, 1, 130.0, 20.0, 80.0, 85.00, 1, 0, NULL, 15),
('Arena lavada', 'Arena para mezclas', 1, 1, 25.0, 10.0, 50.0, 25.00, 0, 0, NULL, 15),
('Piedra picada 3/4"', 'Agregado grueso para concreto', 1, 1, 12.0, 15.0, 60.0, 30.00, 0, 0, NULL, 15),

-- Acero (id=4,5,6,7)
('Cabilla 3/8" (9.5mm)', 'Acero de refuerzo corrugado', 2, 2, 8500.0, 1000.0, 5000.0, 2.50, 1, 0, NULL, 15),
('Cabilla 1/2" (12.7mm)', 'Acero de refuerzo corrugado', 2, 2, 5500.0, 500.0, 3000.0, 3.80, 1, 0, NULL, 15),
('Alambre de amarre', 'Alambre negro calibre 18', 2, 2, 45.0, 50.0, 200.0, 1.20, 0, 0, NULL, 15),
('Malla electrosoldada 15x15', 'Malla de acero para losas', 5, 2, 28.0, 30.0, 100.0, 12.50, 0, 0, NULL, 15),

-- Cemento y materiales secos (id=8,9) - PERECEDEROS
('Cemento gris tipo I', 'Cemento portland 42.5kg - Lote Feb2026', 7, 5, 200, 100, 400, 8.50, 1, 1, '2026-05-10', 15),
('Cemento blanco', 'Cemento para acabados - Lote Dic2025', 7, 5, 15, 20, 100, 12.00, 0, 1, '2026-02-25', 15),

-- Bloques y mamposteria (id=10,11)
('Bloque de arcilla 10x20x40', 'Bloque para paredes', 6, 3, 5000, 1500, 8000, 0.65, 0, 0, NULL, 15),
('Bloque de concreto 15x20x40', 'Bloque estructural', 6, 3, 680, 800, 5000, 0.85, 0, 0, NULL, 15),

-- Instalaciones (id=12,13,14,15)
('Tuberia PVC 1/2" (agua)', 'Tuberia sanitaria', 4, 3, 100.0, 50.0, 200.0, 2.80, 0, 0, NULL, 15),
('Tuberia PVC 4" (aguas negras)', 'Tuberia de drenaje', 4, 3, 60.0, 30.0, 150.0, 8.50, 0, 0, NULL, 15),
('Cable electrico 12 AWG', 'Cable de cobre THHN', 4, 3, 350.0, 150.0, 500.0, 3.20, 0, 0, NULL, 15),
('Cable electrico 14 AWG', 'Cable de cobre THHN', 4, 3, 300.0, 100.0, 400.0, 2.40, 0, 0, NULL, 15),

-- Acabados (id=16,17,18,19)
('Pintura latex blanca', 'Pintura acrilica para interiores', 8, 4, 25.0, 30.0, 120.0, 18.00, 0, 1, '2026-08-15', 30),
('Pintura latex color', 'Pintura acrilica satinada', 8, 4, 12.0, 15.0, 80.0, 22.00, 0, 1, '2026-08-20', 30),
('Ceramica piso 40x40', 'Porcelanato esmaltado', 5, 4, 42.0, 50.0, 200.0, 15.50, 0, 0, NULL, 15),
('Ceramica pared 30x45', 'Ceramica para banos', 5, 4, 35.0, 40.0, 180.0, 12.80, 0, 0, NULL, 15),

-- Otros (id=20) - PERECEDERO
('Mortero premezclado', 'Mortero tipo S para pega - Lote Ene2026', 7, 5, 55, 60, 250, 6.20, 0, 1, '2026-03-15', 15);

-- Proyecto de ejemplo
-- Avance promedio: (100+100+100+100+78+45+20+15+12+0+0+0)/12 = 47.5%
INSERT INTO proyectos (nombre, descripcion, ubicacion, fecha_inicio, fecha_fin_estimada, presupuesto_total, avance_actual, estado)
VALUES
('Casa Unifamiliar Los Samanes',
 'Construccion de vivienda de 2 plantas con 180m2 de construccion',
 'Urbanizacion Los Samanes, Charallave, Miranda',
 '2026-01-06',
 '2026-06-06',
 45000.00,
 47.5,
 'activo');

-- Actividades del proyecto (id=1..12)
INSERT INTO actividades (proyecto_id, nombre, descripcion, orden, avance_planificado, avance_real, fecha_inicio_planificada, fecha_fin_planificada) VALUES
(1, 'Preliminares y limpieza', 'Limpieza de terreno y replanteo', 1, 100, 100, '2026-01-06', '2026-01-10'),
(1, 'Excavacion y movimiento de tierra', 'Excavacion para fundaciones', 2, 100, 100, '2026-01-11', '2026-01-17'),
(1, 'Fundaciones', 'Zapatas, vigas de riostra y pedestales', 3, 100, 100, '2026-01-18', '2026-01-28'),
(1, 'Estructura de concreto - Planta Baja', 'Columnas, vigas y losa PB', 4, 100, 100, '2026-01-29', '2026-02-12'),
(1, 'Estructura de concreto - Planta Alta', 'Columnas, vigas y losa PA', 5, 85, 78, '2026-02-13', '2026-02-27'),
(1, 'Mamposteria - Planta Baja', 'Levantamiento de paredes PB', 6, 60, 45, '2026-02-28', '2026-03-14'),
(1, 'Mamposteria - Planta Alta', 'Levantamiento de paredes PA', 7, 40, 20, '2026-03-15', '2026-03-28'),
(1, 'Instalaciones electricas', 'Tuberias y cableado electrico', 8, 30, 15, '2026-03-16', '2026-04-05'),
(1, 'Instalaciones sanitarias', 'Tuberias de agua y drenaje', 9, 25, 12, '2026-03-20', '2026-04-08'),
(1, 'Acabados interiores', 'Frisos, pisos y pintura interior', 10, 10, 0, '2026-04-09', '2026-04-25'),
(1, 'Acabados exteriores', 'Fachada y pintura exterior', 11, 0, 0, '2026-04-20', '2026-04-30'),
(1, 'Limpieza final y entrega', 'Limpieza y detalles finales', 12, 0, 0, '2026-05-01', '2026-06-06');

-- Lotes de inventario para materiales perecederos
-- Material 8 (Cemento gris): 2 lotes con fechas diferentes
INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_ingreso, notas) VALUES
(8, 'CEM-GR-2025-12', 120, 89, '2026-04-15', '2025-12-20', 'Primer lote - Cementos Caribe'),
(8, 'CEM-GR-2026-01', 80, 80, '2026-07-10', '2026-01-15', 'Segundo lote - Cementos Caribe');
-- Total lotes cemento gris: 89+80 = 169 (coincide con stock_actual: 200-22-9 = 169)

-- Material 9 (Cemento blanco): 1 lote proximo a vencer
INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_ingreso, notas) VALUES
(9, 'CEM-BL-2025-11', 15, 15, '2026-02-25', '2025-11-10', 'Unico lote - proximo a vencer');

-- Material 16 (Pintura latex blanca): 1 lote
INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_ingreso, notas) VALUES
(16, 'PINT-BL-2026-01', 25, 25, '2026-08-15', '2026-01-05', 'Pintura acrilica interior');

-- Material 17 (Pintura latex color): 1 lote
INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_ingreso, notas) VALUES
(17, 'PINT-COL-2026-01', 12, 12, '2026-08-20', '2026-01-05', 'Pintura satinada colores');

-- Material 20 (Mortero premezclado): 1 lote proximo a vencer
INSERT INTO lotes_inventario (material_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento, fecha_ingreso, notas) VALUES
(20, 'MORT-2025-12', 55, 55, '2026-03-15', '2025-12-15', 'Mortero tipo S - vence pronto');

-- Dependencias entre actividades (cadena de construccion realista)
-- Tipo FS = Fin-a-Inicio (la mas comun: B no puede iniciar hasta que A termine)
-- Tipo SS = Inicio-a-Inicio (B puede empezar cuando A empiece)
INSERT INTO actividad_dependencias (actividad_id, actividad_precedente_id, tipo_dependencia, dias_espera) VALUES
-- Secuencia principal de obra gruesa
(2, 1, 'FS', 0),   -- Excavacion requiere Preliminares completados
(3, 2, 'FS', 0),   -- Fundaciones requiere Excavacion completada
(4, 3, 'FS', 0),   -- Estructura PB requiere Fundaciones completadas
(5, 4, 'FS', 0),   -- Estructura PA requiere Estructura PB completada

-- Mamposteria depende de la estructura correspondiente
(6, 4, 'FS', 0),   -- Mamposteria PB requiere Estructura PB
(7, 5, 'FS', 0),   -- Mamposteria PA requiere Estructura PA

-- Instalaciones pueden iniciar cuando la mamposteria PB avance (Inicio-a-Inicio)
(8, 6, 'SS', 0),   -- Electricas pueden iniciar junto con Mamposteria PB
(9, 6, 'SS', 0),   -- Sanitarias pueden iniciar junto con Mamposteria PB

-- Acabados interiores requieren mamposteria y todas las instalaciones
(10, 7, 'FS', 0),  -- Acabados int. requieren Mamposteria PA completada
(10, 8, 'FS', 0),  -- Acabados int. requieren Instalaciones electricas completadas
(10, 9, 'FS', 0),  -- Acabados int. requieren Instalaciones sanitarias completadas

-- Acabados exteriores requieren mamposteria PA
(11, 7, 'FS', 0),  -- Acabados ext. requieren Mamposteria PA completada

-- Limpieza final requiere todo lo demas
(12, 10, 'FS', 0), -- Limpieza requiere Acabados interiores
(12, 11, 'FS', 0); -- Limpieza requiere Acabados exteriores

-- Materiales por actividad (cantidades estimadas y consumidas coherentes con el avance)
-- Fundaciones (100% completa)
INSERT INTO materiales_actividad (actividad_id, material_id, cantidad_estimada, cantidad_consumida) VALUES
(3, 1, 45.0, 45.0),    -- Concreto 210: 100% consumido
(3, 4, 2800.0, 2800.0), -- Cabilla 3/8: 100% consumido
(3, 5, 1200.0, 1200.0), -- Cabilla 1/2: 100% consumido

-- Estructura PB (100% completa)
(4, 1, 35.0, 35.0),
(4, 4, 2200.0, 2200.0),
(4, 5, 1800.0, 1800.0),

-- Estructura PA (78% avance - consumo proporcional)
(5, 1, 32.0, 25.0),
(5, 4, 2000.0, 1560.0),
(5, 5, 1600.0, 1248.0),

-- Mamposteria PB (45% avance)
(6, 10, 2400, 1080),    -- Bloques arcilla
(6, 8, 48, 22),          -- Cemento gris
(6, 2, 6.0, 2.7),        -- Arena

-- Mamposteria PA (20% avance)
(7, 10, 2200, 440),
(7, 8, 44, 9),
(7, 2, 5.5, 1.1),

-- Instalaciones electricas (15% avance)
(8, 14, 320.0, 48.0),   -- Cable 12 AWG
(8, 15, 280.0, 42.0),   -- Cable 14 AWG

-- Instalaciones sanitarias (12% avance)
(9, 12, 85.0, 10.2),    -- Tuberia 1/2"
(9, 13, 42.0, 5.0),     -- Tuberia 4"

-- Acabados interiores (0% avance - nada consumido)
(10, 16, 65.0, 0),      -- Pintura blanca
(10, 17, 35.0, 0),      -- Pintura color
(10, 18, 95.0, 0),      -- Ceramica piso
(10, 19, 75.0, 0);      -- Ceramica pared

-- Movimientos de inventario (historial coherente con el consumo)
-- Cada salida corresponde al consumo confirmado por avance de cada actividad.
-- Los triggers de la BD actualizan stock_actual automaticamente.
INSERT INTO movimientos_inventario (material_id, proyecto_id, tipo, cantidad, motivo, responsable, lote, fecha) VALUES
-- Consumo Fundaciones (actividad 3, 100%)
(1, 1, 'salida', 45.0, 'Consumo confirmado por avance (0% -> 100%)', 'Sistema', NULL, '2026-01-25'),
(4, 1, 'salida', 2800.0, 'Consumo confirmado por avance (0% -> 100%)', 'Sistema', NULL, '2026-01-25'),
(5, 1, 'salida', 1200.0, 'Consumo confirmado por avance (0% -> 100%)', 'Sistema', NULL, '2026-01-25'),

-- Consumo Estructura PB (actividad 4, 100%)
(1, 1, 'salida', 35.0, 'Consumo confirmado por avance (0% -> 100%)', 'Sistema', NULL, '2026-02-08'),
(4, 1, 'salida', 2200.0, 'Consumo confirmado por avance (0% -> 100%)', 'Sistema', NULL, '2026-02-08'),
(5, 1, 'salida', 1800.0, 'Consumo confirmado por avance (0% -> 100%)', 'Sistema', NULL, '2026-02-08'),

-- Reabastecimiento de concreto (entrada)
(1, 1, 'entrada', 50.0, 'Recepcion de orden #1 - Reabastecimiento estructura PA', 'Sistema', 'LOTE-CONC-2026-02', '2026-02-10'),

-- Consumo Estructura PA (actividad 5, 78%)
(1, 1, 'salida', 25.0, 'Consumo confirmado por avance (0% -> 78%)', 'Sistema', NULL, '2026-02-20'),
(4, 1, 'salida', 1560.0, 'Consumo confirmado por avance (0% -> 78%)', 'Sistema', NULL, '2026-02-20'),
(5, 1, 'salida', 1248.0, 'Consumo confirmado por avance (0% -> 78%)', 'Sistema', NULL, '2026-02-20'),

-- Consumo Mamposteria PB (actividad 6, 45%)
(10, 1, 'salida', 1080, 'Consumo confirmado por avance (0% -> 45%)', 'Sistema', NULL, '2026-03-05'),
(8, 1, 'salida', 22, 'Consumo confirmado por avance (0% -> 45%)', 'Sistema', 'LOTE-CEM-2026-01', '2026-03-05'),
(2, 1, 'salida', 2.7, 'Consumo confirmado por avance (0% -> 45%)', 'Sistema', NULL, '2026-03-05'),

-- Consumo Mamposteria PA (actividad 7, 20%)
(10, 1, 'salida', 440, 'Consumo confirmado por avance (0% -> 20%)', 'Sistema', NULL, '2026-03-18'),
(8, 1, 'salida', 9, 'Consumo confirmado por avance (0% -> 20%)', 'Sistema', 'LOTE-CEM-2026-01', '2026-03-18'),
(2, 1, 'salida', 1.1, 'Consumo confirmado por avance (0% -> 20%)', 'Sistema', NULL, '2026-03-18'),

-- Consumo Instalaciones electricas (actividad 8, 15%)
(14, 1, 'salida', 48.0, 'Consumo confirmado por avance (0% -> 15%)', 'Sistema', NULL, '2026-03-20'),
(15, 1, 'salida', 42.0, 'Consumo confirmado por avance (0% -> 15%)', 'Sistema', NULL, '2026-03-20'),

-- Consumo Instalaciones sanitarias (actividad 9, 12%)
(12, 1, 'salida', 10.2, 'Consumo confirmado por avance (0% -> 12%)', 'Sistema', NULL, '2026-03-25'),
(13, 1, 'salida', 5.0, 'Consumo confirmado por avance (0% -> 12%)', 'Sistema', NULL, '2026-03-25');

-- Stock final resultante (calculado por triggers):
-- Material 1 (Concreto):    130 - 45 - 35 + 50 - 25 = 75.0   (min: 20)  OK
-- Material 2 (Arena):        25 - 2.7 - 1.1          = 21.2   (min: 10)  OK
-- Material 3 (Piedra):       12.0                     = 12.0   (min: 15)  BAJO
-- Material 4 (Cabilla 3/8): 8500 - 2800 - 2200 - 1560 = 1940  (min: 1000) OK
-- Material 5 (Cabilla 1/2): 5500 - 1200 - 1800 - 1248 = 1252  (min: 500) OK
-- Material 6 (Alambre):      45                       = 45.0   (min: 50)  BAJO
-- Material 7 (Malla):        28                       = 28.0   (min: 30)  BAJO
-- Material 8 (Cemento gris): 200 - 22 - 9            = 169    (min: 100) OK - VENCE 2026-05-10
-- Material 9 (Cemento blanco): 15                     = 15.0   (min: 20)  BAJO - VENCE 2026-02-25 (PRONTO!)
-- Material 10 (Bloque arc):  5000 - 1080 - 440       = 3480   (min: 1500) OK
-- Material 11 (Bloque conc):  680                     = 680    (min: 800) BAJO
-- Material 12 (Tub 1/2"):    100 - 10.2              = 89.8   (min: 50)  OK
-- Material 13 (Tub 4"):       60 - 5.0               = 55.0   (min: 30)  OK
-- Material 14 (Cable 12):    350 - 48                 = 302    (min: 150) OK
-- Material 15 (Cable 14):    300 - 42                 = 258    (min: 100) OK
-- Material 16 (Pintura bl):   25                      = 25.0   (min: 30)  BAJO - VENCE 2026-08-15
-- Material 17 (Pintura col):  12                      = 12.0   (min: 15)  BAJO - VENCE 2026-08-20
-- Material 18 (Ceramica p):   42                      = 42.0   (min: 50)  BAJO
-- Material 19 (Ceramica pa):  35                      = 35.0   (min: 40)  BAJO
-- Material 20 (Mortero):      55                      = 55.0   (min: 60)  BAJO - VENCE 2026-03-15 (PRONTO!)
-- NINGUN material queda en negativo.
--
-- Alertas de vencimiento esperadas:
-- Material 9 (Cemento blanco): vence 2026-02-25, quedan ~18 dias → ALERTA (aviso: 15 dias)
-- Material 20 (Mortero): vence 2026-03-15, quedan ~36 dias → ALERTA PREVENTIVA (aviso: 15 dias)
--
-- Dependencias de ejemplo:
-- Actividad 10 (Acabados int.) tiene 3 dependencias: act. 7, 8, 9
-- Todas deben completarse antes de iniciar acabados interiores
-- Act. 7 esta al 20%, act. 8 al 15%, act. 9 al 12% → BLOQUEADA
