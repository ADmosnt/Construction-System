// src/render/src/components/charts/CruvaSChart.tsx

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Actividad } from '../../types';

interface CurvaSChartProps {
  actividades: Actividad[];
}

export default function CurvaSChart({ actividades }: CurvaSChartProps) {
  // Ordenar actividades por orden
  const actividadesOrdenadas = [...actividades].sort((a, b) => a.orden - b.orden);

  // Generar datos para la curva S
  const data = actividadesOrdenadas.map((actividad, index) => {
    // Calcular avance acumulado planificado
    const avancePlanificadoAcumulado = actividadesOrdenadas
      .slice(0, index + 1)
      .reduce((sum, act) => sum + act.avance_planificado, 0) / actividadesOrdenadas.length;

    // Calcular avance acumulado real
    const avanceRealAcumulado = actividadesOrdenadas
      .slice(0, index + 1)
      .reduce((sum, act) => sum + act.avance_real, 0) / actividadesOrdenadas.length;

    return {
      actividad: `#${actividad.orden}`,
      nombre: actividad.nombre.substring(0, 20),
      planificado: Math.round(avancePlanificadoAcumulado * 10) / 10,
      real: Math.round(avanceRealAcumulado * 10) / 10
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="actividad" 
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Avance (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                  <p className="font-semibold text-sm mb-1">{payload[0].payload.nombre}</p>
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-500">Planificado:</span>{' '}
                    <span className="font-semibold">{payload[0].value}%</span>
                  </p>
                  <p className="text-sm text-blue-600">
                    <span className="text-gray-500">Real:</span>{' '}
                    <span className="font-semibold">{payload[1].value}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="planificado" 
          stroke="#9CA3AF" 
          strokeWidth={2}
          name="Avance Planificado"
          dot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="real" 
          stroke="#3B82F6" 
          strokeWidth={3}
          name="Avance Real"
          dot={{ r: 5, fill: '#3B82F6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}