// src/render/src/routes/AlertasPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import { db } from '../lib/database';
import type { Alerta } from '../types';

export default function AlertasPage() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'critica' | 'alta' | 'media' | 'baja'>('todas');

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    try {
      const data = await db.alertas.getAll();
      setAlertas(data);
    } catch (error) {
      console.error('Error loading alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarAtendida = async (id: number) => {
    try {
      await db.alertas.marcarAtendida(id);
      await loadAlertas();
    } catch (error) {
      console.error('Error marking alerta:', error);
    }
  };

  const alertasFiltradas = alertas.filter(a => {
    if (filtro === 'todas') return true;
    return a.nivel === filtro;
  });

  const getColorNivel = (nivel: string) => {
    const colores = {
      'critica': {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700'
      },
      'alta': {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-700'
      },
      'media': {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-700'
      },
      'baja': {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700'
      }
    };
    return colores[nivel as keyof typeof colores] || colores.baja;
  };

  const getIconoTipo = (tipo: string) => {
    const iconos = {
      'stock_minimo': '⚠️',
      'desabastecimiento_inminente': '🚨',
      'reorden_sugerido': '📦'
    };
    return iconos[tipo as keyof typeof iconos] || '📌';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Alertas" 
        subtitle={`${alertas.length} alertas pendientes`}
      />

      <div className="p-8">
        {/* Paneles de Explicacion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Panel: Niveles de Criticidad */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Niveles de Criticidad</h3>
            <p className="text-sm text-gray-600 mb-4">
              El nivel se determina comparando los dias estimados de stock restante contra el tiempo de entrega del proveedor:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-xl">🔴</span>
                <div>
                  <p className="font-bold text-red-700 text-sm">CRITICA</p>
                  <p className="text-xs text-red-600">
                    Los dias de stock restante son <strong>menores o iguales</strong> al tiempo de entrega del proveedor.
                    No hay tiempo para esperar una entrega: el material se agotara antes de que llegue el pedido.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <span className="text-xl">🟠</span>
                <div>
                  <p className="font-bold text-orange-700 text-sm">ALTA</p>
                  <p className="text-xs text-orange-600">
                    Los dias de stock restante superan el tiempo de entrega por un margen reducido (hasta 3 dias para materiales criticos, 6 para normales).
                    Hay poco margen de seguridad.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <span className="text-xl">🟡</span>
                <div>
                  <p className="font-bold text-yellow-700 text-sm">MEDIA</p>
                  <p className="text-xs text-yellow-600">
                    El stock esta por debajo del minimo, pero aun hay margen suficiente (hasta 7 dias para materiales criticos, 14 para normales)
                    para gestionar un reabastecimiento sin urgencia extrema.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-xl">🔵</span>
                <div>
                  <p className="font-bold text-blue-700 text-sm">BAJA</p>
                  <p className="text-xs text-blue-600">
                    El stock esta bajo el minimo pero hay suficiente margen temporal. Se recomienda planificar un pedido preventivo
                    sin urgencia inmediata.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel: Calculo de Dias de Desabastecimiento */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Dias hasta Desabastecimiento</h3>
            <p className="text-sm text-gray-600 mb-4">
              El sistema calcula cuantos dias durara el stock actual basandose en el consumo proyectado de las actividades:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-mono text-gray-800 mb-2">
                <strong>Formula:</strong>
              </p>
              <div className="bg-white rounded p-3 border text-center">
                <p className="text-sm font-mono">
                  Dias = Stock Actual / Tasa de Consumo Diaria
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Donde la <strong>Tasa de Consumo Diaria</strong> se calcula como:
              </p>
              <div className="bg-white rounded p-3 border text-center mt-2">
                <p className="text-sm font-mono">
                  Tasa = Consumo Pendiente Total / Dias Restantes del Proyecto
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold text-sm">1.</span>
                <p className="text-xs text-gray-700">
                  <strong>Consumo Pendiente:</strong> Se suman las cantidades pendientes (estimada - consumida) de todas las actividades
                  no completadas que usan ese material, ponderadas por el porcentaje de avance restante.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold text-sm">2.</span>
                <p className="text-xs text-gray-700">
                  <strong>Dias Restantes:</strong> Se calculan desde la fecha actual hasta la fecha de fin estimada del proyecto.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold text-sm">3.</span>
                <p className="text-xs text-gray-700">
                  <strong>Resultado:</strong> Si no hay consumo pendiente, se asume que el stock durara todos los dias restantes.
                  Si el stock es 0, los dias son 0 (desabastecimiento inmediato).
                </p>
              </div>
            </div>

            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-800">
                <strong>Fecha sugerida de pedido:</strong> Se resta el tiempo de entrega del proveedor (mas un margen de seguridad de 2 dias)
                a los dias estimados de stock. Esto indica la fecha limite para realizar el pedido y evitar desabastecimiento.
              </p>
            </div>
          </div>
        </div>

        {/* Filtros y Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFiltro('todas')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filtro === 'todas' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{alertas.length}</p>
            <p className="text-sm text-gray-600">Total</p>
          </button>

          <button
            onClick={() => setFiltro('critica')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filtro === 'critica' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-red-600">
              {alertas.filter(a => a.nivel === 'critica').length}
            </p>
            <p className="text-sm text-gray-600">Críticas</p>
          </button>

          <button
            onClick={() => setFiltro('alta')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filtro === 'alta' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-orange-600">
              {alertas.filter(a => a.nivel === 'alta').length}
            </p>
            <p className="text-sm text-gray-600">Altas</p>
          </button>

          <button
            onClick={() => setFiltro('media')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filtro === 'media' 
                ? 'border-yellow-500 bg-yellow-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-yellow-600">
              {alertas.filter(a => a.nivel === 'media').length}
            </p>
            <p className="text-sm text-gray-600">Medias</p>
          </button>

          <button
            onClick={() => setFiltro('baja')}
            className={`p-4 rounded-lg border-2 transition-all ${
              filtro === 'baja' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-blue-600">
              {alertas.filter(a => a.nivel === 'baja').length}
            </p>
            <p className="text-sm text-gray-600">Bajas</p>
          </button>
        </div>

        {/* Lista de Alertas */}
        {alertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filtro === 'todas' ? 'No hay alertas pendientes' : `No hay alertas de nivel ${filtro}`}
            </h3>
            <p className="text-gray-600">
              {filtro === 'todas' 
                ? 'Todos los materiales están en niveles óptimos'
                : 'Intenta con otro filtro para ver más alertas'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alertasFiltradas.map((alerta) => {
              const color = getColorNivel(alerta.nivel);
              const icono = getIconoTipo(alerta.tipo);

              return (
                <div 
                  key={alerta.id}
                  className={`${color.bg} border-2 ${color.border} rounded-lg p-6 transition-all hover:shadow-lg`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icono */}
                    <div className="text-4xl">{icono}</div>

                    {/* Contenido */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${color.badge}`}>
                            {alerta.nivel}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(alerta.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <h3 className={`text-xl font-bold ${color.text} mb-2`}>
                        {alerta.material_nombre}
                      </h3>

                      <p className="text-gray-700 mb-3">{alerta.mensaje}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white bg-opacity-50 rounded p-3">
                          <p className="text-xs text-gray-600 mb-1">Proyecto</p>
                          <p className="font-semibold text-sm">{alerta.proyecto_nombre}</p>
                        </div>

                        {alerta.dias_hasta_desabastecimiento !== null && (
                          <div className="bg-white bg-opacity-50 rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">Desabastecimiento en</p>
                            <p className={`font-bold text-lg ${color.text}`}>
                              {alerta.dias_hasta_desabastecimiento} días
                            </p>
                          </div>
                        )}

                        <div className="bg-white bg-opacity-50 rounded p-3">
                          <p className="text-xs text-gray-600 mb-1">Cantidad Sugerida</p>
                          <p className="font-semibold text-sm">
                            {alerta.cantidad_sugerida.toFixed(2)}
                          </p>
                        </div>

                        {alerta.fecha_sugerida_pedido && (
                          <div className="bg-white bg-opacity-50 rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">Ordenar antes de</p>
                            <p className="font-semibold text-sm">
                              {new Date(alerta.fecha_sugerida_pedido).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleMarcarAtendida(alerta.id)}
                        >
                          ✓ Marcar como Atendida
                        </Button>
                        <Button 
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/ordenes?materialId=${alerta.material_id}&proyectoId=${alerta.proyecto_id}&cantidad=${alerta.cantidad_sugerida.toFixed(2)}`)}
                        >
                          📋 Generar Orden
                        </Button>
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/proyectos/${alerta.proyecto_id}`)}
                        >
                          Ver Proyecto →
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}