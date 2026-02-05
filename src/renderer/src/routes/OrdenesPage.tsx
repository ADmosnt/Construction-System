// src/render/src/routes/OrdenesPage.tsx

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { db } from '../lib/database';
import type { OrdenCompra, DetalleOrdenCompra, Material, Proveedor, Proyecto } from '../types';

export default function OrdenesPage() {
  const [searchParams] = useSearchParams();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);
  const [detalles, setDetalles] = useState<DetalleOrdenCompra[]>([]);

  // Pre-cargar datos desde alerta
  const alertaMaterialId = searchParams.get('materialId');
  const alertaProyectoId = searchParams.get('proyectoId');
  const alertaCantidad = searchParams.get('cantidad');

  useEffect(() => {
    loadData();
    
    // Si viene desde alerta, abrir modal automáticamente
    if (alertaMaterialId) {
      setShowModal(true);
    }
  }, []);

  const loadData = async () => {
    try {
      const [ordenesData, materialesData, proveedoresData, proyectosData] = await Promise.all([
        db.ordenes.getAll(),
        db.materiales.getAll(),
        db.proveedores.getAll(),
        db.proyectos.getAll()
      ]);
      
      setOrdenes(ordenesData);
      setMateriales(materialesData);
      setProveedores(proveedoresData);
      setProyectos(proyectosData);
    } catch (error) {
      console.error('Error loading ordenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrden = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      // Crear orden
      const ordenData = {
        proveedor_id: parseInt(formData.get('proveedor_id') as string),
        proyecto_id: formData.get('proyecto_id') ? parseInt(formData.get('proyecto_id') as string) : null,
        fecha_emision: formData.get('fecha_emision') as string,
        fecha_entrega_estimada: formData.get('fecha_entrega_estimada') as string,
        notas: formData.get('notas') as string,
        estado: 'pendiente' as const
      };

      const result = await db.ordenes.create(ordenData);
      
      // Agregar detalle (material)
      const materialId = parseInt(formData.get('material_id') as string);
      const cantidad = parseFloat(formData.get('cantidad') as string);
      const material = materiales.find(m => m.id === materialId);
      
      if (material) {
        await db.ordenes.addDetalle({
          orden_compra_id: result.id,
          material_id: materialId,
          cantidad: cantidad,
          precio_unitario: material.precio_unitario
        });

        // Actualizar total de la orden
        const total = cantidad * material.precio_unitario;
        await db.ordenes.update(result.id, { total });
      }

      await loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error creating orden:', error);
      alert('Error al crear la orden');
    }
  };

  const handleVerDetalle = async (orden: OrdenCompra) => {
    try {
      const det = await db.ordenes.getDetalles(orden.id);
      setDetalles(det);
      setSelectedOrden(orden);
      setShowDetalleModal(true);
    } catch (error) {
      console.error('Error loading detalles:', error);
    }
  };

  const handleConfirmar = async (ordenId: number) => {
    if (!confirm('¿Confirmar esta orden de compra?')) return;
    try {
      await db.ordenes.confirmar(ordenId);
      await loadData();
    } catch (error) {
      console.error('Error confirmando orden:', error);
    }
  };

  const handleRecibir = async (ordenId: number) => {
    if (!confirm('¿Marcar como recibida? Esto actualizará el inventario automáticamente.')) return;
    try {
      await db.ordenes.recibir(ordenId);
      await loadData();
      alert('✅ Orden recibida. Stock actualizado automáticamente.');
    } catch (error) {
      console.error('Error recibiendo orden:', error);
    }
  };

  const handleCancelar = async (ordenId: number) => {
    if (!confirm('¿Cancelar esta orden?')) return;
    try {
      await db.ordenes.update(ordenId, { estado: 'cancelada' });
      await loadData();
    } catch (error) {
      console.error('Error cancelando orden:', error);
    }
  };

  const getColorEstado = (estado: string) => {
    const colores = {
      'pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'confirmada': 'bg-blue-100 text-blue-700 border-blue-300',
      'en_transito': 'bg-purple-100 text-purple-700 border-purple-300',
      'entregada': 'bg-green-100 text-green-700 border-green-300',
      'cancelada': 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return colores[estado as keyof typeof colores] || colores.pendiente;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Órdenes de Compra" 
        subtitle="Gestión de órdenes de compra generadas desde alertas"
        action={
          <Button onClick={() => setShowModal(true)}>
            + Nueva Orden
          </Button>
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-900">{ordenes.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <p className="text-sm text-yellow-700 uppercase">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-700">
              {ordenes.filter(o => o.estado === 'pendiente').length}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <p className="text-sm text-blue-700 uppercase">Confirmadas</p>
            <p className="text-2xl font-bold text-blue-700">
              {ordenes.filter(o => o.estado === 'confirmada').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-green-700 uppercase">Entregadas</p>
            <p className="text-2xl font-bold text-green-700">
              {ordenes.filter(o => o.estado === 'entregada').length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4">
            <p className="text-sm text-gray-700 uppercase">Canceladas</p>
            <p className="text-2xl font-bold text-gray-700">
              {ordenes.filter(o => o.estado === 'cancelada').length}
            </p>
          </div>
        </div>

        {/* Lista de Órdenes */}
        {ordenes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">No hay órdenes de compra</p>
            <Button onClick={() => setShowModal(true)}>
              Crear primera orden
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proyecto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha Emisión</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Entrega Est.</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenes.map(orden => (
                  <tr key={orden.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{orden.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{orden.proveedor_nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{orden.proyecto_nombre || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">
                      {new Date(orden.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">
                      {orden.fecha_entrega_estimada 
                        ? new Date(orden.fecha_entrega_estimada).toLocaleDateString()
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded border ${getColorEstado(orden.estado)}`}>
                        {orden.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      ${orden.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleVerDetalle(orden)}>
                          👁️
                        </Button>
                        {orden.estado === 'pendiente' && (
                          <>
                            <Button size="sm" onClick={() => handleConfirmar(orden.id)}>
                              ✓
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleCancelar(orden.id)}>
                              ✕
                            </Button>
                          </>
                        )}
                        {orden.estado === 'confirmada' && (
                          <Button size="sm" onClick={() => handleRecibir(orden.id)}>
                            📦 Recibir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Orden */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Orden de Compra" size="lg">
        <form onSubmit={handleCreateOrden}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material <span className="text-red-500">*</span>
              </label>
              <select name="material_id" required defaultValue={alertaMaterialId || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar material...</option>
                {materiales.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} - ${m.precio_unitario}/{m.unidad_abrev}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input type="number" name="cantidad" step="0.01" required defaultValue={alertaCantidad || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <select name="proveedor_id" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.tiempo_entrega_dias} días)</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto (opcional)</label>
              <select name="proyecto_id" defaultValue={alertaProyectoId || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin proyecto</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión</label>
                <input type="date" name="fecha_emision" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entrega Estimada</label>
                <input type="date" name="fecha_entrega_estimada" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea name="notas" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">Crear Orden</Button>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle */}
      <Modal isOpen={showDetalleModal} onClose={() => setShowDetalleModal(false)} title={`Orden #${selectedOrden?.id}`} size="lg">
        {selectedOrden && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Proveedor</p>
                <p className="font-semibold">{selectedOrden.proveedor_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded border ${getColorEstado(selectedOrden.estado)}`}>
                  {selectedOrden.estado.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Materiales</p>
              <div className="space-y-2">
                {detalles.map(det => (
                  <div key={det.id} className="bg-gray-50 rounded p-3 flex justify-between">
                    <div>
                      <p className="font-medium">{det.material_nombre}</p>
                      <p className="text-sm text-gray-600">{det.cantidad} {det.unidad_abrev} × ${det.precio_unitario}</p>
                    </div>
                    <p className="font-bold">${det.subtotal.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${selectedOrden.total.toFixed(2)}</span>
              </div>
            </div>

            {selectedOrden.notas && (
              <div>
                <p className="text-sm text-gray-500">Notas</p>
                <p className="text-sm">{selectedOrden.notas}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}