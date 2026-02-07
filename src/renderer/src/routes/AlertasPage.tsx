// src/render/src/routes/AlertasPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { db } from '../lib/database';
import type { Alerta } from '../types';

export default function AlertasPage() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'critica' | 'alta' | 'media' | 'baja'>('todas');
  const [showCriticidadModal, setShowCriticidadModal] = useState(false);
  const [showDesabastecimientoModal, setShowDesabastecimientoModal] = useState(false);

  const loadAlertas = useCallback(async () => {
    try {
      const data = await db.alertas.getAll();
      setAlertas(data);
    } catch (error) {
      console.error('Error loading alertas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Al montar: regenerar alertas de todos los proyectos activos y luego cargar
  useEffect(() => {
    const init = async () => {
      try {
        setRegenerando(true);
        await db.alertas.regenerarTodas();
      } catch (error) {
        console.error('Error regenerando alertas:', error);
      } finally {
        setRegenerando(false);
      }
      await loadAlertas();
    };
    init();
  }, [loadAlertas]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await db.alertas.regenerarTodas();
        const data = await db.alertas.getAll();
        setAlertas(data);
      } catch (error) {
        console.error('Error en auto-refresh de alertas:', error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefrescar = async () => {
    try {
      setRegenerando(true);
      await db.alertas.regenerarTodas();
      await loadAlertas();
      showToast('Alertas actualizadas', 'info');
    } catch (error) {
      console.error('Error refrescando alertas:', error);
      showToast('Error al actualizar alertas', 'error');
    } finally {
      setRegenerando(false);
    }
  };

  const handleMarcarAtendida = async (id: number) => {
    try {
      await db.alertas.marcarAtendida(id);
      await loadAlertas();
      showToast('Alerta marcada como atendida', 'success');
    } catch (error) {
      console.error('Error marking alerta:', error);
      showToast('Error al marcar la alerta', 'error');
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
    const iconos: Record<string, string> = {
      'stock_minimo': '\u26A0\uFE0F',
      'desabastecimiento_inminente': '\uD83D\uDEA8',
      'reorden_sugerido': '\uD83D\uDCE6',
      'desviacion_consumo': '\uD83D\uDD0D',
      'stock_estancado': '\uD83D\uDCE4',
      'vencimiento_material': '\u23F0',
      'variacion_precio': '\uD83D\uDCB0',
      'dependencia_bloqueada': '\uD83D\uDD12'
    };
    return iconos[tipo] || '\uD83D\uDCCC';
  };

  const getNombreTipo = (tipo: string) => {
    const nombres: Record<string, string> = {
      'stock_minimo': 'Stock Bajo',
      'desabastecimiento_inminente': 'Desabastecimiento',
      'reorden_sugerido': 'Reorden Sugerido',
      'desviacion_consumo': 'Desviacion Consumo',
      'stock_estancado': 'Stock Estancado',
      'vencimiento_material': 'Vencimiento',
      'variacion_precio': 'Variacion Precio',
      'dependencia_bloqueada': 'Dependencia Bloqueada'
    };
    return nombres[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {regenerando ? 'Recalculando alertas...' : 'Cargando alertas...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Alertas"
        subtitle={`${alertas.length} alertas pendientes`}
        action={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefrescar}
              disabled={regenerando}
            >
              {regenerando ? 'Actualizando...' : 'Refrescar Alertas'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCriticidadModal(true)}>
              ? Niveles de Criticidad
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDesabastecimientoModal(true)}>
              ? Calculo de Desabastecimiento
            </Button>
          </div>
        }
      />

      <div className="p-8">
        {/* Filtros y Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
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
            <p className="text-sm text-gray-600">Criticas</p>
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
              const stockActual = alerta.material_stock_actual;
              const stockMinimo = alerta.material_stock_minimo;
              const unidad = alerta.material_unidad_abrev || '';

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

                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`text-xl font-bold ${color.text}`}>
                          {alerta.material_nombre || alerta.actividad_nombre || 'Sistema'}
                        </h3>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          {getNombreTipo(alerta.tipo)}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-3">{alerta.mensaje}</p>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        {alerta.proyecto_nombre && (
                          <div className="bg-white bg-opacity-50 rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">Proyecto</p>
                            <p className="font-semibold text-sm">{alerta.proyecto_nombre}</p>
                          </div>
                        )}

                        {/* Stock Actual - solo para alertas con material */}
                        {stockActual !== undefined && (
                          <div className={`bg-white bg-opacity-50 rounded p-3 ${
                            stockMinimo !== undefined && stockActual < stockMinimo
                              ? 'ring-2 ring-red-300'
                              : ''
                          }`}>
                            <p className="text-xs text-gray-600 mb-1">Stock Actual</p>
                            <p className={`font-bold text-lg ${
                              stockActual <= 0
                                ? 'text-red-700'
                                : stockMinimo !== undefined && stockActual < stockMinimo
                                  ? 'text-orange-700'
                                  : 'text-gray-900'
                            }`}>
                              {stockActual.toFixed(2)} <span className="text-xs font-normal text-gray-500">{unidad}</span>
                            </p>
                            {stockMinimo !== undefined && (
                              <p className="text-xs text-gray-500 mt-0.5">Min: {stockMinimo.toFixed(2)}</p>
                            )}
                          </div>
                        )}

                        {alerta.dias_hasta_desabastecimiento !== null && (
                          <div className="bg-white bg-opacity-50 rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">Desabastecimiento en</p>
                            <p className={`font-bold text-lg ${color.text}`}>
                              {alerta.dias_hasta_desabastecimiento} dias
                            </p>
                          </div>
                        )}

                        {alerta.cantidad_sugerida !== null && alerta.cantidad_sugerida !== undefined && (
                          <div className="bg-white bg-opacity-50 rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">Cantidad Sugerida</p>
                            <p className="font-semibold text-sm">
                              {alerta.cantidad_sugerida.toFixed(2)} <span className="text-xs text-gray-500">{unidad}</span>
                            </p>
                          </div>
                        )}

                        {alerta.fecha_sugerida_pedido && (
                          <div className="bg-white bg-opacity-50 rounded p-3">
                            <p className="text-xs text-gray-600 mb-1">Ordenar antes de</p>
                            <p className="font-semibold text-sm">
                              {new Date(alerta.fecha_sugerida_pedido).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        {/* Datos extra para tipos especializados */}
                        {alerta.tipo === 'desviacion_consumo' && alerta.datos_extra && (() => {
                          const datos = JSON.parse(alerta.datos_extra);
                          return (
                            <div className="bg-white bg-opacity-50 rounded p-3">
                              <p className="text-xs text-gray-600 mb-1">Desviacion</p>
                              <p className="font-bold text-lg text-red-600">+{datos.desviacion}%</p>
                            </div>
                          );
                        })()}

                        {alerta.tipo === 'vencimiento_material' && alerta.datos_extra && (() => {
                          const datos = JSON.parse(alerta.datos_extra);
                          return (
                            <div className="bg-white bg-opacity-50 rounded p-3">
                              <p className="text-xs text-gray-600 mb-1">Vence en</p>
                              <p className={`font-bold text-lg ${datos.dias_para_vencer <= 0 ? 'text-red-700' : datos.dias_para_vencer <= 7 ? 'text-orange-600' : color.text}`}>
                                {datos.dias_para_vencer <= 0 ? 'VENCIDO' : `${datos.dias_para_vencer} dias`}
                              </p>
                            </div>
                          );
                        })()}

                        {alerta.tipo === 'stock_estancado' && alerta.datos_extra && (() => {
                          const datos = JSON.parse(alerta.datos_extra);
                          return (
                            <>
                              <div className="bg-white bg-opacity-50 rounded p-3">
                                <p className="text-xs text-gray-600 mb-1">Sin movimiento</p>
                                <p className="font-bold text-lg text-gray-700">{datos.dias_sin_movimiento} dias</p>
                              </div>
                              <div className="bg-white bg-opacity-50 rounded p-3">
                                <p className="text-xs text-gray-600 mb-1">Capital parado</p>
                                <p className="font-bold text-sm text-gray-700">${datos.valor_parado.toFixed(2)}</p>
                              </div>
                            </>
                          );
                        })()}

                        {alerta.tipo === 'variacion_precio' && alerta.datos_extra && (() => {
                          const datos = JSON.parse(alerta.datos_extra);
                          return (
                            <>
                              <div className="bg-white bg-opacity-50 rounded p-3">
                                <p className="text-xs text-gray-600 mb-1">Variacion</p>
                                <p className={`font-bold text-lg ${datos.variacion_porcentaje > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {datos.variacion_porcentaje > 0 ? '+' : ''}{datos.variacion_porcentaje.toFixed(1)}%
                                </p>
                              </div>
                              <div className="bg-white bg-opacity-50 rounded p-3">
                                <p className="text-xs text-gray-600 mb-1">Precio anterior</p>
                                <p className="font-semibold text-sm">${datos.precio_anterior.toFixed(2)}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleMarcarAtendida(alerta.id)}
                        >
                          Marcar como Atendida
                        </Button>
                        {alerta.material_id && alerta.cantidad_sugerida && alerta.cantidad_sugerida > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/ordenes?materialId=${alerta.material_id}&proyectoId=${alerta.proyecto_id || ''}&cantidad=${alerta.cantidad_sugerida!.toFixed(2)}`)}
                          >
                            Generar Orden
                          </Button>
                        )}
                        {alerta.proyecto_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/proyectos/${alerta.proyecto_id}`)}
                          >
                            Ver Proyecto
                          </Button>
                        )}
                        {alerta.material_id && !alerta.proyecto_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate('/materiales')}
                          >
                            Ver Material
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Niveles de Criticidad */}
      <Modal
        isOpen={showCriticidadModal}
        onClose={() => setShowCriticidadModal(false)}
        title="Niveles de Criticidad"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            El nivel se determina comparando los dias estimados de stock restante contra el tiempo de entrega del proveedor:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="font-bold text-red-700">CRITICA</p>
                <p className="text-sm text-red-600">
                  Los dias de stock restante son <strong>menores o iguales</strong> al tiempo de entrega del proveedor.
                  No hay tiempo para esperar una entrega: el material se agotara antes de que llegue el pedido.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <span className="text-2xl">🟠</span>
              <div>
                <p className="font-bold text-orange-700">ALTA</p>
                <p className="text-sm text-orange-600">
                  Los dias de stock restante superan el tiempo de entrega por un margen reducido (hasta 3 dias para materiales criticos, 6 para normales).
                  Hay poco margen de seguridad.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <span className="text-2xl">🟡</span>
              <div>
                <p className="font-bold text-yellow-700">MEDIA</p>
                <p className="text-sm text-yellow-600">
                  El stock esta por debajo del minimo, pero aun hay margen suficiente (hasta 7 dias para materiales criticos, 14 para normales)
                  para gestionar un reabastecimiento sin urgencia extrema.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <span className="text-2xl">🔵</span>
              <div>
                <p className="font-bold text-blue-700">BAJA</p>
                <p className="text-sm text-blue-600">
                  El stock esta bajo el minimo pero hay suficiente margen temporal. Se recomienda planificar un pedido preventivo
                  sin urgencia inmediata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Calculo de Desabastecimiento */}
      <Modal
        isOpen={showDesabastecimientoModal}
        onClose={() => setShowDesabastecimientoModal(false)}
        title="Dias hasta Desabastecimiento"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            El sistema calcula cuantos dias durara el stock actual basandose en el consumo proyectado de las actividades:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Formula:</p>
            <div className="bg-white rounded p-3 border text-center">
              <p className="text-sm font-mono">
                Dias = Stock Actual / Tasa de Consumo Diaria
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Donde la <strong>Tasa de Consumo Diaria</strong> se calcula como:
            </p>
            <div className="bg-white rounded p-3 border text-center mt-2">
              <p className="text-sm font-mono">
                Tasa = Consumo Pendiente Total / Dias Restantes del Proyecto
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">1.</span>
              <p className="text-sm text-gray-700">
                <strong>Consumo Pendiente:</strong> Se suman las cantidades pendientes (estimada - consumida) de todas las actividades
                no completadas que usan ese material, ponderadas por el porcentaje de avance restante.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">2.</span>
              <p className="text-sm text-gray-700">
                <strong>Dias Restantes:</strong> Se calculan desde la fecha actual hasta la fecha de fin estimada del proyecto.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              <p className="text-sm text-gray-700">
                <strong>Resultado:</strong> Si no hay consumo pendiente, se asume que el stock durara todos los dias restantes.
                Si el stock es 0, los dias son 0 (desabastecimiento inmediato).
              </p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>Fecha sugerida de pedido:</strong> Se resta el tiempo de entrega del proveedor (mas un margen de seguridad de 2 dias)
              a los dias estimados de stock. Esto indica la fecha limite para realizar el pedido y evitar desabastecimiento.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
