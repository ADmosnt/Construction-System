// src/render/src/routes/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import CurvaSChart from '../components/charts/CurvaSChart';
import InventarioChart from '../components/charts/InventarioChart';
import { db } from '../lib/database';
import type { Proyecto, Material, Alerta, Actividad } from '../types';

export default function DashboardPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [proyectosData, materialesData, alertasData] = await Promise.all([
        db.proyectos.getAll(),
        db.materiales.getAll(),
        db.alertas.getAll()
      ]);
      
      const proyectosActivos = proyectosData.filter(p => p.estado === 'activo');
      setProyectos(proyectosActivos);
      setMateriales(materialesData);
      setAlertas(alertasData);

      // Cargar actividades del primer proyecto activo para la curva S
      if (proyectosActivos.length > 0) {
        const acts = await db.actividades.getByProyecto(proyectosActivos[0].id);
        setActividades(acts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const materialesCriticos = materiales.filter(m => m.stock_actual < m.stock_minimo).length;
  const alertasCriticas = alertas.filter(a => a.nivel === 'critica' || a.nivel === 'alta').length;
  const avancePromedio = proyectos.length > 0 
    ? proyectos.reduce((sum, p) => sum + p.avance_actual, 0) / proyectos.length 
    : 0;

  return (
    <div>
      <Header 
        title="Dashboard" 
        subtitle="Resumen general del sistema"
      />

      <div className="p-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 uppercase">Proyectos Activos</p>
                <p className="text-4xl font-bold mt-2">{proyectos.length}</p>
                <p className="text-sm mt-2 opacity-80">
                  Avance promedio: {avancePromedio.toFixed(1)}%
                </p>
              </div>
              <div className="text-5xl opacity-80">📋</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 uppercase">Materiales</p>
                <p className="text-4xl font-bold mt-2">{materiales.length}</p>
                <p className="text-sm mt-2 opacity-80">
                  En inventario
                </p>
              </div>
              <div className="text-5xl opacity-80">📦</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 uppercase">Stock Crítico</p>
                <p className="text-4xl font-bold mt-2">{materialesCriticos}</p>
                <p className="text-sm mt-2 opacity-80">
                  Requieren atención
                </p>
              </div>
              <div className="text-5xl opacity-80">⚠️</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 uppercase">Alertas Urgentes</p>
                <p className="text-4xl font-bold mt-2">{alertasCriticas}</p>
                <p className="text-sm mt-2 opacity-80">
                  Críticas y altas
                </p>
              </div>
              <div className="text-5xl opacity-80">🚨</div>
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Curva S */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Curva S - {proyectos[0]?.nombre || 'Sin proyectos'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Avance planificado vs avance real por actividad
              </p>
            </div>
            <div className="p-6">
              {actividades.length > 0 ? (
                <CurvaSChart actividades={actividades} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No hay actividades registradas
                </div>
              )}
            </div>
          </div>

          {/* Inventario */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Estado de Inventario</h2>
              <p className="text-sm text-gray-500 mt-1">
                Materiales críticos y con stock bajo
              </p>
            </div>
            <div className="p-6">
              <InventarioChart materiales={materiales} />
            </div>
          </div>
        </div>

        {/* Proyectos y Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Proyectos */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Proyectos en Curso</h2>
              <Link to="/proyectos" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="p-6">
              {proyectos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay proyectos activos</p>
              ) : (
                <div className="space-y-4">
                  {proyectos.slice(0, 3).map(proyecto => (
                    <Link 
                      key={proyecto.id}
                      to={`/proyectos/${proyecto.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{proyecto.nombre}</h3>
                        <span className={`
                          px-2 py-1 text-xs rounded-full font-medium
                          ${proyecto.avance_actual < 40 ? 'bg-blue-100 text-blue-700' : ''}
                          ${proyecto.avance_actual >= 40 && proyecto.avance_actual < 75 ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${proyecto.avance_actual >= 75 ? 'bg-green-100 text-green-700' : ''}
                        `}>
                          {proyecto.avance_actual}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">📍 {proyecto.ubicacion}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            proyecto.avance_actual < 40 ? 'bg-blue-500' : 
                            proyecto.avance_actual < 75 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${proyecto.avance_actual}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Alertas Recientes</h2>
              <Link to="/alertas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Ver todas →
              </Link>
            </div>
            <div className="p-6">
              {alertas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-green-600 font-medium text-lg">✅ Sin alertas pendientes</p>
                  <p className="text-sm text-gray-500 mt-1">Todos los materiales en niveles óptimos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas.slice(0, 5).map(alerta => {
                    const colorNivel = {
                      'critica': 'bg-red-100 text-red-700 border-red-300',
                      'alta': 'bg-orange-100 text-orange-700 border-orange-300',
                      'media': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                      'baja': 'bg-blue-100 text-blue-700 border-blue-300'
                    }[alerta.nivel];

                    return (
                      <div key={alerta.id} className={`border rounded-lg p-3 ${colorNivel}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-xs font-semibold uppercase">{alerta.nivel}</span>
                            <p className="text-sm font-medium mt-1">{alerta.material_nombre}</p>
                            <p className="text-xs mt-1 opacity-90 line-clamp-2">{alerta.mensaje}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}