// src/render/src/routes/ProveedoresPage.tsx

import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { db } from '../lib/database';
import type { Proveedor, Material } from '../types';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMaterialesModal, setShowMaterialesModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [materiales, setMateriales] = useState<Material[]>([]);

  useEffect(() => {
    loadProveedores();
  }, []);

  const loadProveedores = async () => {
    try {
      const data = await db.proveedores.getAll();
      setProveedores(data);
    } catch (error) {
      console.error('Error loading proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const proveedorData = {
      nombre: formData.get('nombre') as string,
      contacto: formData.get('contacto') as string,
      telefono: formData.get('telefono') as string,
      email: formData.get('email') as string,
      direccion: formData.get('direccion') as string,
      tiempo_entrega_dias: parseInt(formData.get('tiempo_entrega_dias') as string)
    };

    try {
      if (editingProveedor) {
        await db.proveedores.update(editingProveedor.id, proveedorData);
      } else {
        await db.proveedores.create(proveedorData);
      }
      await loadProveedores();
      setShowModal(false);
      setEditingProveedor(null);
    } catch (error) {
      console.error('Error saving proveedor:', error);
      alert('Error al guardar el proveedor');
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el proveedor "${nombre}"?`)) return;

    try {
      await db.proveedores.delete(id);
      await loadProveedores();
    } catch (error: any) {
      console.error('Error deleting proveedor:', error);
      alert(error.message || 'Error al eliminar el proveedor');
    }
  };

  const handleVerMateriales = async (proveedor: Proveedor) => {
    try {
      const mats = await db.proveedores.getMateriales(proveedor.id);
      setMateriales(mats);
      setSelectedProveedor(proveedor);
      setShowMaterialesModal(true);
    } catch (error) {
      console.error('Error loading materiales:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Proveedores" 
        subtitle="Gestión de proveedores de materiales"
        action={
          <Button onClick={() => {
            setEditingProveedor(null);
            setShowModal(true);
          }}>
            + Nuevo Proveedor
          </Button>
        }
      />

      <div className="p-8">
        {proveedores.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">No hay proveedores registrados</p>
            <Button onClick={() => setShowModal(true)}>
              Crear primer proveedor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {proveedores.map(proveedor => (
              <div key={proveedor.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{proveedor.nombre}</h3>
                      {proveedor.contacto && (
                        <p className="text-sm text-gray-600 mb-1">
                          👤 {proveedor.contacto}
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {proveedor.tiempo_entrega_dias} días
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {proveedor.telefono && (
                      <p className="text-sm text-gray-700">
                        📞 {proveedor.telefono}
                      </p>
                    )}
                    {proveedor.email && (
                      <p className="text-sm text-gray-700">
                        ✉️ {proveedor.email}
                      </p>
                    )}
                    {proveedor.direccion && (
                      <p className="text-sm text-gray-700">
                        📍 {proveedor.direccion}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleVerMateriales(proveedor)}
                      className="flex-1"
                    >
                      📦 Ver Materiales
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => {
                        setEditingProveedor(proveedor);
                        setShowModal(true);
                      }}
                    >
                      ✏️
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger"
                      onClick={() => handleDelete(proveedor.id, proveedor.nombre)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProveedor(null);
        }}
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <Input
              name="nombre"
              label="Nombre del Proveedor"
              required
              defaultValue={editingProveedor?.nombre}
              placeholder="Ej: Concretera del Este"
            />

            <Input
              name="contacto"
              label="Persona de Contacto"
              defaultValue={editingProveedor?.contacto || ''}
              placeholder="Nombre del contacto"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="telefono"
                label="Teléfono"
                type="tel"
                defaultValue={editingProveedor?.telefono || ''}
                placeholder="+58-212-5551234"
              />
              <Input
                name="email"
                label="Email"
                type="email"
                defaultValue={editingProveedor?.email || ''}
                placeholder="contacto@proveedor.com"
              />
            </div>

            <Input
              name="direccion"
              label="Dirección"
              defaultValue={editingProveedor?.direccion || ''}
              placeholder="Dirección completa"
            />

            <Input
              name="tiempo_entrega_dias"
              label="Tiempo de Entrega (días)"
              type="number"
              min="1"
              required
              defaultValue={editingProveedor?.tiempo_entrega_dias || 7}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> El tiempo de entrega se usa para calcular alertas de desabastecimiento.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">
              {editingProveedor ? 'Actualizar' : 'Crear'} Proveedor
            </Button>
            <Button type="button" variant="ghost" onClick={() => {
              setShowModal(false);
              setEditingProveedor(null);
            }}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Materiales */}
      <Modal
        isOpen={showMaterialesModal}
        onClose={() => {
          setShowMaterialesModal(false);
          setSelectedProveedor(null);
          setMateriales([]);
        }}
        title={`Materiales de ${selectedProveedor?.nombre}`}
        size="lg"
      >
        {materiales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Este proveedor no tiene materiales asociados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materiales.map(material => (
              <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {material.es_critico && <span className="text-red-500">⚠️</span>}
                      <h4 className="font-semibold text-gray-900">{material.nombre}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{material.descripcion}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-500">Stock Actual</p>
                    <p className="text-lg font-bold text-gray-900">
                      {material.stock_actual.toFixed(2)} {material.unidad_abrev}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}