// src/render/src/routes/MaterialesPage.tsx

import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { showToast } from '../components/ui/Toast';
import { db } from '../lib/database';
import type { Material, Proveedor, UnidadMedida, MovimientoInventario, LoteInventario } from '../types';

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [showLotesModal, setShowLotesModal] = useState(false);
  const [lotes, setLotes] = useState<LoteInventario[]>([]);
  const [editingLote, setEditingLote] = useState<LoteInventario | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'criticos' | 'bajos' | 'perecederos'>('todos');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materialesData, proveedoresData, unidadesData] = await Promise.all([
        db.materiales.getAll(),
        db.proveedores.getAll(),
        db.unidades.getAll()
      ]);
      
      setMateriales(materialesData);
      setProveedores(proveedoresData);
      setUnidades(unidadesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const esPerecedero = formData.get('es_perecedero') === 'true';
    const materialData = {
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string,
      unidad_medida_id: parseInt(formData.get('unidad_medida_id') as string),
      proveedor_id: parseInt(formData.get('proveedor_id') as string),
      stock_actual: parseFloat(formData.get('stock_actual') as string),
      stock_minimo: parseFloat(formData.get('stock_minimo') as string),
      stock_maximo: parseFloat(formData.get('stock_maximo') as string),
      precio_unitario: parseFloat(formData.get('precio_unitario') as string),
      es_critico: formData.get('es_critico') === 'true',
      es_perecedero: esPerecedero,
      fecha_vencimiento: esPerecedero ? (formData.get('fecha_vencimiento') as string) || null : null,
      dias_aviso_vencimiento: esPerecedero ? parseInt(formData.get('dias_aviso_vencimiento') as string) || 15 : 15
    };

    try {
      if (editingMaterial) {
        await db.materiales.update(editingMaterial.id, materialData);
        showToast('Material actualizado', 'success');
      } else {
        await db.materiales.create(materialData);
        showToast('Material creado exitosamente', 'success');
      }
      await loadData();
      setShowModal(false);
      setEditingMaterial(null);
    } catch (error) {
      console.error('Error saving material:', error);
      showToast('Error al guardar el material', 'error');
    }
  };

  const handleSaveMovimiento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const formData = new FormData(e.currentTarget);
    const tipo = formData.get('tipo') as 'entrada' | 'salida' | 'ajuste';
    const movimientoData: any = {
      material_id: selectedMaterial.id,
      tipo,
      cantidad: parseFloat(formData.get('cantidad') as string),
      motivo: formData.get('motivo') as string,
      responsable: formData.get('responsable') as string,
      proyecto_id: null
    };

    // Para entradas de perecederos: incluir datos del lote
    if (selectedMaterial.es_perecedero && tipo === 'entrada') {
      movimientoData.lote_codigo = formData.get('lote_codigo') as string || undefined;
      movimientoData.fecha_vencimiento = formData.get('fecha_vencimiento_lote') as string || undefined;
      movimientoData.notas_lote = formData.get('notas_lote') as string || undefined;
    }

    try {
      await db.movimientos.create(movimientoData);
      await loadData();
      setShowMovimientoModal(false);
      setSelectedMaterial(null);
      const tipoLabel = tipo === 'salida' && selectedMaterial.es_perecedero
        ? 'Salida FEFO (lote mas viejo primero)'
        : `${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
      showToast('Movimiento registrado', 'success', `${tipoLabel} de ${movimientoData.cantidad} unidades.`);
    } catch (error) {
      console.error('Error saving movimiento:', error);
      showToast('Error al registrar el movimiento', 'error');
    }
  };

  const handleVerLotes = async (material: Material) => {
    try {
      const lotesData = await db.lotes.getByMaterial(material.id);
      setLotes(lotesData);
      setSelectedMaterial(material);
      setShowLotesModal(true);
    } catch (error) {
      console.error('Error loading lotes:', error);
    }
  };

  const handleSaveLote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMaterial || !editingLote) return;
    const formData = new FormData(e.currentTarget);
    try {
      await db.lotes.update(editingLote.id, {
        codigo_lote: formData.get('codigo_lote') as string,
        fecha_vencimiento: formData.get('fecha_vencimiento_edit') as string || null,
        notas: formData.get('notas') as string || null,
      });
      const lotesData = await db.lotes.getByMaterial(selectedMaterial.id);
      setLotes(lotesData);
      setEditingLote(null);
      showToast('Lote actualizado', 'success');
    } catch (error) {
      console.error('Error updating lote:', error);
      showToast('Error al actualizar el lote', 'error');
    }
  };

  const handleVerHistorial = async (material: Material) => {
    try {
      const historial = await db.movimientos.getByMaterial(material.id);
      setMovimientos(historial);
      setSelectedMaterial(material);
      setShowHistorialModal(true);
    } catch (error) {
      console.error('Error loading historial:', error);
    }
  };

  const materialesFiltrados = materiales.filter(m => {
    if (filtro === 'criticos') return m.es_critico;
    if (filtro === 'bajos') return m.stock_actual < m.stock_minimo;
    if (filtro === 'perecederos') return m.es_perecedero;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando materiales...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Materiales" 
        subtitle="Gestión de inventario de materiales"
        action={
          <Button onClick={() => {
            setEditingMaterial(null);
            setShowModal(true);
          }}>
            + Nuevo Material
          </Button>
        }
      />

      <div className="p-8">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filtrar:</span>
            <button
              onClick={() => setFiltro('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'todos' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({materiales.length})
            </button>
            <button
              onClick={() => setFiltro('criticos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'criticos' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Críticos ({materiales.filter(m => m.es_critico).length})
            </button>
            <button
              onClick={() => setFiltro('bajos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'bajos' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Stock Bajo ({materiales.filter(m => m.stock_actual < m.stock_minimo).length})
            </button>
            <button
              onClick={() => setFiltro('perecederos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'perecederos'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Perecederos ({materiales.filter(m => m.es_perecedero).length})
            </button>
          </div>
        </div>

        {/* Tabla de Materiales */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock Mínimo</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock Máximo</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Caducidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Precio</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materialesFiltrados.map((material) => {
                  const porcentaje = (material.stock_actual / material.stock_minimo) * 100;
                  const estado = material.stock_actual < material.stock_minimo ? 'BAJO' : 
                               material.stock_actual < material.stock_minimo * 1.2 ? 'ALERTA' : 'OK';
                  const colorEstado = estado === 'BAJO' ? 'bg-red-100 text-red-700' : 
                                    estado === 'ALERTA' ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-green-100 text-green-700';

                  return (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {material.es_critico && <span className="text-red-500 font-bold">⚠️</span>}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{material.nombre}</p>
                            <p className="text-xs text-gray-500">{material.unidad_abrev}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                        {material.stock_actual.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {material.stock_minimo.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {material.stock_maximo.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorEstado}`}>
                          {estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {material.es_perecedero ? (
                          <button
                            onClick={() => handleVerLotes(material)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                            title="Ver lotes de este material"
                          >
                            Ver Lotes
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {material.proveedor_nombre || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        ${material.precio_unitario.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setSelectedMaterial(material);
                              setShowMovimientoModal(true);
                            }}
                          >
                            📝
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleVerHistorial(material)}
                          >
                            📊
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingMaterial(material);
                              setShowModal(true);
                            }}
                          >
                            ✏️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Material */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMaterial(null);
        }}
        title={editingMaterial ? 'Editar Material' : 'Nuevo Material'}
        size="lg"
      >
        <form onSubmit={handleSaveMaterial}>
          <div className="space-y-4">
            <Input
              name="nombre"
              label="Nombre del Material"
              required
              defaultValue={editingMaterial?.nombre}
              placeholder="Ej: Concreto premezclado 210 kg/cm²"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingMaterial?.descripcion || ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                <select
                  name="unidad_medida_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingMaterial?.unidad_medida_id}
                >
                  <option value="">Seleccionar...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <select
                  name="proveedor_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingMaterial?.proveedor_id || ''}
                >
                  <option value="">Seleccionar...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                name="stock_actual"
                label="Stock Actual"
                type="number"
                step="0.01"
                required
                defaultValue={editingMaterial?.stock_actual || 0}
              />
              <Input
                name="stock_minimo"
                label="Stock Mínimo"
                type="number"
                step="0.01"
                required
                defaultValue={editingMaterial?.stock_minimo || 0}
              />
              <Input
                name="stock_maximo"
                label="Stock Máximo"
                type="number"
                step="0.01"
                required
                defaultValue={editingMaterial?.stock_maximo || 0}
              />
            </div>

            <Input
              name="precio_unitario"
              label="Precio Unitario ($)"
              type="number"
              step="0.01"
              required
              defaultValue={editingMaterial?.precio_unitario || 0}
            />

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="es_critico"
                  value="true"
                  defaultChecked={editingMaterial?.es_critico}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Material Crítico
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="es_perecedero"
                  value="true"
                  defaultChecked={editingMaterial?.es_perecedero}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  onChange={(e) => {
                    const panel = document.getElementById('perecedero-fields');
                    if (panel) panel.style.display = e.target.checked ? 'grid' : 'none';
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  Material Perecedero
                </span>
              </label>
            </div>

            <div
              id="perecedero-fields"
              className="grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg"
              style={{ display: editingMaterial?.es_perecedero ? 'grid' : 'none' }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  name="fecha_vencimiento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={editingMaterial?.fecha_vencimiento || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de aviso antes del vencimiento
                </label>
                <input
                  type="number"
                  name="dias_aviso_vencimiento"
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={editingMaterial?.dias_aviso_vencimiento || 15}
                  placeholder="15"
                />
              </div>
              <p className="col-span-2 text-xs text-orange-600">
                El sistema generará alertas cuando el material esté próximo a vencer según los días configurados.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">
              {editingMaterial ? 'Actualizar' : 'Crear'} Material
            </Button>
            <Button type="button" variant="ghost" onClick={() => {
              setShowModal(false);
              setEditingMaterial(null);
            }}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Movimiento */}
      <Modal
        isOpen={showMovimientoModal}
        onClose={() => {
          setShowMovimientoModal(false);
          setSelectedMaterial(null);
        }}
        title={`Registrar Movimiento - ${selectedMaterial?.nombre}`}
        size="md"
      >
        <form onSubmit={handleSaveMovimiento}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Movimiento <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="entrada">Entrada (Compra/Recepción)</option>
                <option value="salida">Salida (Consumo/Uso)</option>
                <option value="ajuste">Ajuste de Inventario</option>
              </select>
            </div>

            <Input
              name="cantidad"
              label={`Cantidad (${selectedMaterial?.unidad_abrev})`}
              type="number"
              step="0.01"
              required
              placeholder="0.00"
            />

            <Input
              name="motivo"
              label="Motivo"
              required
              placeholder="Ej: Compra para proyecto X, Consumo en fundaciones"
            />

            <Input
              name="responsable"
              label="Responsable"
              defaultValue="Sistema"
              placeholder="Nombre del responsable"
            />

            {/* Campos de lote para entradas de perecederos */}
            {selectedMaterial?.es_perecedero && (
              <div id="lote-entrada-fields" className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                <p className="text-sm font-medium text-orange-700">Datos del Lote (para entradas de material perecedero)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    name="lote_codigo"
                    label="Codigo de Lote"
                    placeholder="Ej: CEM-GR-2026-03"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Vencimiento del Lote
                    </label>
                    <input
                      type="date"
                      name="fecha_vencimiento_lote"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <Input
                  name="notas_lote"
                  label="Notas del lote"
                  placeholder="Ej: Proveedor X, Factura #123"
                />
                <p className="text-xs text-orange-600">
                  Las salidas se descuentan automaticamente del lote mas proximo a vencer (FEFO).
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Stock actual:</strong> {selectedMaterial?.stock_actual.toFixed(2)} {selectedMaterial?.unidad_abrev}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">
              Registrar Movimiento
            </Button>
            <Button type="button" variant="ghost" onClick={() => {
              setShowMovimientoModal(false);
              setSelectedMaterial(null);
            }}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Historial */}
      <Modal
        isOpen={showHistorialModal}
        onClose={() => {
          setShowHistorialModal(false);
          setSelectedMaterial(null);
          setMovimientos([]);
        }}
        title={`Historial de Movimientos - ${selectedMaterial?.nombre}`}
        size="lg"
      >
        {movimientos.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay movimientos registrados</p>
        ) : (
          <div className="space-y-3">
            {movimientos.map((mov) => (
              <div key={mov.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className={`
                      inline-block px-2 py-1 text-xs font-semibold rounded
                      ${mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' : ''}
                      ${mov.tipo === 'salida' ? 'bg-red-100 text-red-700' : ''}
                      ${mov.tipo === 'ajuste' ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
                      {mov.tipo.toUpperCase()}
                    </span>
                    <p className="text-sm font-medium text-gray-900 mt-2">{mov.motivo}</p>
                  </div>
                  <span className="text-lg font-bold">
                    {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-4">
                  <span>{new Date(mov.fecha).toLocaleString()}</span>
                  <span>{mov.responsable}</span>
                  {mov.lote_codigo && (
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                      {mov.lote_codigo}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal de Lotes */}
      <Modal
        isOpen={showLotesModal}
        onClose={() => {
          setShowLotesModal(false);
          setSelectedMaterial(null);
          setLotes([]);
          setEditingLote(null);
        }}
        title={`Lotes de Inventario - ${selectedMaterial?.nombre}`}
        size="lg"
      >
        {editingLote ? (
          <form onSubmit={handleSaveLote}>
            <div className="space-y-4">
              <Input
                name="codigo_lote"
                label="Codigo de Lote"
                defaultValue={editingLote.codigo_lote || ''}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  name="fecha_vencimiento_edit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={editingLote.fecha_vencimiento || ''}
                />
              </div>
              <Input
                name="notas"
                label="Notas"
                defaultValue={editingLote.notas || ''}
              />
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p><strong>Cantidad actual:</strong> {editingLote.cantidad_actual} / {editingLote.cantidad_inicial} (inicial)</p>
                <p><strong>Fecha ingreso:</strong> {new Date(editingLote.fecha_ingreso).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button type="submit" className="flex-1">Guardar Cambios</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingLote(null)}>
                Volver
              </Button>
            </div>
          </form>
        ) : (
          <div>
            {/* Resumen */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Stock Total:</strong> {selectedMaterial?.stock_actual.toFixed(2)} {selectedMaterial?.unidad_abrev}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Distribuido en {lotes.length} lote{lotes.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-xs text-blue-600">
                  Las salidas consumen primero el lote mas proximo a vencer (FEFO)
                </p>
              </div>
            </div>

            {lotes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay lotes registrados para este material</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lotes.map((lote) => {
                      const diasRestantes = lote.fecha_vencimiento
                        ? Math.ceil((new Date(lote.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const estadoLote = lote.cantidad_actual <= 0 ? 'AGOTADO'
                        : diasRestantes !== null && diasRestantes <= 0 ? 'VENCIDO'
                        : diasRestantes !== null && diasRestantes <= 7 ? 'POR VENCER'
                        : diasRestantes !== null && diasRestantes <= (selectedMaterial?.dias_aviso_vencimiento || 15) ? 'PRONTO'
                        : 'OK';
                      const colorLote = estadoLote === 'VENCIDO' ? 'bg-red-100 text-red-700'
                        : estadoLote === 'POR VENCER' ? 'bg-orange-100 text-orange-700'
                        : estadoLote === 'PRONTO' ? 'bg-yellow-100 text-yellow-700'
                        : estadoLote === 'AGOTADO' ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700';

                      return (
                        <tr key={lote.id} className={`${lote.cantidad_actual <= 0 ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-3">
                            <p className="font-medium">{lote.codigo_lote || `Lote #${lote.id}`}</p>
                            <p className="text-xs text-gray-500">Ingreso: {new Date(lote.fecha_ingreso).toLocaleDateString()}</p>
                            {lote.notas && <p className="text-xs text-gray-400">{lote.notas}</p>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <p className="font-bold">{lote.cantidad_actual.toFixed(1)}</p>
                            <p className="text-xs text-gray-400">de {lote.cantidad_inicial.toFixed(1)}</p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {lote.fecha_vencimiento ? (
                              <div>
                                <p className="text-sm">{new Date(lote.fecha_vencimiento).toLocaleDateString()}</p>
                                {diasRestantes !== null && (
                                  <p className={`text-xs ${diasRestantes <= 0 ? 'text-red-600 font-bold' : diasRestantes <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                                    {diasRestantes <= 0 ? `Vencido hace ${Math.abs(diasRestantes)}d` : `${diasRestantes} dias`}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Sin fecha</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorLote}`}>
                              {estadoLote}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingLote(lote)}
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}