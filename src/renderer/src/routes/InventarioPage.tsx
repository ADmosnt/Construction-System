// src/render/src/routes/InventarioPage.tsx

import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import InventarioChart from '../components/charts/InventarioChart';
import { db } from '../lib/database';
import type { Material, MovimientoInventario } from '../types';

export default function InventarioPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'criticos' | 'bajos' | 'ok'>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const materialesData = await db.materiales.getAll();
      setMateriales(materialesData);
    } catch (error) {
      console.error('Error loading inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const materialesFiltrados = materiales.filter(m => {
    // Filtro por búsqueda
    const matchBusqueda = m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          (m.descripcion && m.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    
    if (!matchBusqueda) return false;

    // Filtro por estado
    if (filtro === 'criticos') return m.es_critico;
    if (filtro === 'bajos') return m.stock_actual < m.stock_minimo;
    if (filtro === 'ok') return m.stock_actual >= m.stock_minimo;
    return true;
  });

  const getEstadoStock = (material: Material) => {
    if (material.stock_actual < material.stock_minimo) return 'BAJO';
    if (material.stock_actual < material.stock_minimo * 1.2) return 'ALERTA';
    return 'OK';
  };

  const getColorEstado = (estado: string) => {
    if (estado === 'BAJO') return 'bg-red-100 text-red-700 border-red-300';
    if (estado === 'ALERTA') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const totalValorInventario = materiales.reduce((sum, m) => 
    sum + (m.stock_actual * m.precio_unitario), 0
  );

  const materialesBajos = materiales.filter(m => m.stock_actual < m.stock_minimo).length;
  const materialesOK = materiales.filter(m => m.stock_actual >= m.stock_minimo).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Inventario General" 
        subtitle="Control y seguimiento de inventario de materiales"
      />

      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase font-medium">Total Materiales</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{materiales.length}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase font-medium">Valor Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${totalValorInventario.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase font-medium">Stock Bajo</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{materialesBajos}</p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase font-medium">Stock OK</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{materialesOK}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
        </div>

        {/* Gráfica de Inventario */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Estado Visual del Inventario</h2>
            <p className="text-sm text-gray-500 mt-1">Materiales críticos y con stock bajo</p>
          </div>
          <div className="p-6">
            <InventarioChart materiales={materiales} />
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar material..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
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
                Stock Bajo ({materialesBajos})
              </button>
              <button
                onClick={() => setFiltro('ok')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtro === 'ok' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Stock OK ({materialesOK})
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Inventario */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Min/Max</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materialesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {busqueda ? 'No se encontraron materiales' : 'No hay materiales en esta categoría'}
                    </td>
                  </tr>
                ) : (
                  materialesFiltrados.map((material) => {
                    const estado = getEstadoStock(material);
                    const colorEstado = getColorEstado(estado);
                    const porcentaje = (material.stock_actual / material.stock_minimo) * 100;
                    const valorTotal = material.stock_actual * material.precio_unitario;

                    return (
                      <tr key={material.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {material.es_critico && <span className="text-red-500 font-bold">⚠️</span>}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{material.nombre}</p>
                              <p className="text-xs text-gray-500">{material.descripcion}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {material.stock_actual.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">{material.unidad_abrev}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-xs text-gray-600">
                            <p>Min: {material.stock_minimo.toFixed(2)}</p>
                            <p>Max: {material.stock_maximo.toFixed(2)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div>
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${colorEstado}`}>
                              {estado}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {porcentaje.toFixed(0)}%
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          ${material.precio_unitario.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          ${valorTotal.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>
                            <p className="font-medium">{material.proveedor_nombre || 'N/A'}</p>
                            {material.tiempo_entrega_dias && (
                              <p className="text-xs text-gray-500">
                                {material.tiempo_entrega_dias} días entrega
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando <span className="font-semibold">{materialesFiltrados.length}</span> de{' '}
              <span className="font-semibold">{materiales.length}</span> materiales
            </span>
            <span className="text-gray-600">
              Valor filtrado:{' '}
              <span className="font-semibold text-gray-900">
                ${materialesFiltrados.reduce((sum, m) => sum + (m.stock_actual * m.precio_unitario), 0).toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}