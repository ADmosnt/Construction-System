// src/render/src/components/charts/InventarioChart.tsx

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { Material } from '../../types';

interface InventarioChartProps {
  materiales: Material[];
}

export default function InventarioChart({ materiales }: InventarioChartProps) {
  // Filtrar materiales críticos o con stock bajo
  const materialesCriticos = materiales
    .filter(m => m.es_critico || m.stock_actual < m.stock_minimo)
    .slice(0, 10) // Top 10
    .map(m => ({
      nombre: m.nombre.substring(0, 20),
      nombreCompleto: m.nombre,
      stockActual: parseFloat(m.stock_actual.toFixed(2)),
      stockMinimo: parseFloat(m.stock_minimo.toFixed(2)),
      unidad: m.unidad_abrev,
      porcentaje: (m.stock_actual / m.stock_minimo) * 100
    }));

  if (materialesCriticos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        ✅ Todos los materiales tienen stock adecuado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={materialesCriticos} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="nombre" 
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 11 }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                  <p className="font-semibold text-sm mb-2">{data.nombreCompleto}</p>
                  <p className="text-sm">
                    <span className="text-blue-600 font-semibold">Stock Actual:</span>{' '}
                    {data.stockActual} {data.unidad}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600 font-semibold">Stock Mínimo:</span>{' '}
                    {data.stockMinimo} {data.unidad}
                  </p>
                  <p className="text-sm mt-1">
                    <span className={`font-bold ${
                      data.porcentaje < 100 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {data.porcentaje.toFixed(0)}% del mínimo
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Bar dataKey="stockActual" name="Stock Actual" radius={[8, 8, 0, 0]}>
          {materialesCriticos.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.stockActual < entry.stockMinimo ? '#EF4444' : '#3B82F6'} 
            />
          ))}
        </Bar>
        <Bar dataKey="stockMinimo" fill="#9CA3AF" name="Stock Mínimo" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}