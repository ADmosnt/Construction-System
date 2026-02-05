// src/render/src/routes/ProyectosPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { db } from '../lib/database';
import type { Proyecto } from '../types';

export default function ProyectosPage() {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);

  useEffect(() => {
    loadProyectos();
  }, []);

  const loadProyectos = async () => {
    try {
      const data = await db.proyectos.getAll();
      setProyectos(data);
    } catch (error) {
      console.error('Error loading proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (proyecto?: Proyecto) => {
    setEditingProyecto(proyecto || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProyecto(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const proyectoData: Partial<Proyecto> = {
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string,
      ubicacion: formData.get('ubicacion') as string,
      fecha_inicio: formData.get('fecha_inicio') as string,
      fecha_fin_estimada: formData.get('fecha_fin_estimada') as string,
      presupuesto_total: parseFloat(formData.get('presupuesto_total') as string),
      avance_actual: parseFloat(formData.get('avance_actual') as string) || 0,
      estado: formData.get('estado') as 'activo' | 'pausado' | 'finalizado'
    };

    try {
      if (editingProyecto) {
        await db.proyectos.update(editingProyecto.id, proyectoData);
      } else {
        await db.proyectos.create(proyectoData);
      }
      await loadProyectos();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving proyecto:', error);
      alert('Error al guardar el proyecto');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este proyecto?')) return;
    
    try {
      await db.proyectos.delete(id);
      await loadProyectos();
    } catch (error) {
      console.error('Error deleting proyecto:', error);
      alert('Error al eliminar el proyecto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Proyectos" 
        subtitle="Gestión de proyectos de construcción"
        action={
          <Button onClick={() => handleOpenModal()}>
            + Nuevo Proyecto
          </Button>
        }
      />

      <div className="p-8">
        {proyectos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">No hay proyectos registrados</p>
            <Button onClick={() => handleOpenModal()}>
              Crear primer proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {proyectos.map(proyecto => (
              <div key={proyecto.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{proyecto.nombre}</h3>
                      <p className="text-sm text-gray-600 mb-2">{proyecto.descripcion}</p>
                      <p className="text-sm text-gray-500">📍 {proyecto.ubicacion}</p>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-semibold
                      ${proyecto.estado === 'activo' ? 'bg-green-100 text-green-700' : ''}
                      ${proyecto.estado === 'pausado' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${proyecto.estado === 'finalizado' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {proyecto.estado.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Inicio</p>
                      <p className="font-medium">{new Date(proyecto.fecha_inicio).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fin Estimado</p>
                      <p className="font-medium">{new Date(proyecto.fecha_fin_estimada).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Presupuesto</p>
                      <p className="font-medium">${proyecto.presupuesto_total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avance</p>
                      <p className="font-medium">{proyecto.avance_actual}%</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-semibold">{proyecto.avance_actual}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          proyecto.avance_actual < 40 ? 'bg-blue-500' : 
                          proyecto.avance_actual < 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${proyecto.avance_actual}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/proyectos/${proyecto.id}`)}
                      className="flex-1"
                    >
                      Ver Detalle
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleOpenModal(proyecto)}
                    >
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger"
                      onClick={() => handleDelete(proyecto.id)}
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
        onClose={handleCloseModal}
        title={editingProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <Input
              name="nombre"
              label="Nombre del Proyecto"
              required
              defaultValue={editingProyecto?.nombre}
              placeholder="Ej: Casa Unifamiliar Los Samanes"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingProyecto?.descripcion || ''}
                placeholder="Descripción del proyecto..."
              />
            </div>

            <Input
              name="ubicacion"
              label="Ubicación"
              required
              defaultValue={editingProyecto?.ubicacion || ''}
              placeholder="Dirección o ubicación del proyecto"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="fecha_inicio"
                label="Fecha de Inicio"
                type="date"
                required
                defaultValue={editingProyecto?.fecha_inicio}
              />
              <Input
                name="fecha_fin_estimada"
                label="Fecha Fin Estimada"
                type="date"
                required
                defaultValue={editingProyecto?.fecha_fin_estimada}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="presupuesto_total"
                label="Presupuesto Total ($)"
                type="number"
                step="0.01"
                required
                defaultValue={editingProyecto?.presupuesto_total}
                placeholder="0.00"
              />
              <Input
                name="avance_actual"
                label="Avance Actual (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={editingProyecto?.avance_actual || 0}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                name="estado"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={editingProyecto?.estado || 'activo'}
              >
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" className="flex-1">
              {editingProyecto ? 'Actualizar' : 'Crear'} Proyecto
            </Button>
            <Button type="button" variant="ghost" onClick={handleCloseModal}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}