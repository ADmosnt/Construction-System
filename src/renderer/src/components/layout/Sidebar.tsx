// src/render/src/components/layout/Sidebar.tsx

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../../lib/database';

const menuItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/proyectos', icon: '📋', label: 'Proyectos' },
  { path: '/materiales', icon: '📦', label: 'Materiales' },
  { path: '/alertas', icon: '🚨', label: 'Alertas', showBadge: true },
  { path: '/ordenes', icon: '📋', label: 'Órdenes de Compra' },
  { path: '/proveedores', icon: '🏢', label: 'Proveedores' },
  { path: '/inventario', icon: '📊', label: 'Inventario' },
];

export default function Sidebar() {
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  // Cargar conteo de alertas al montar y cada 15 segundos
  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await db.alertas.count();
        setAlertCount(count);
      } catch (error) {
        // Silenciar errores del badge
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Recargar conteo cuando cambia la ruta (el usuario navega)
  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await db.alertas.count();
        setAlertCount(count);
      } catch (error) {
        // Silenciar errores del badge
      }
    };
    loadCount();
  }, [location.pathname]);

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">Sistema Construcción</h1>
        <p className="text-xs text-gray-400 mt-1">Proig M&G</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.showBadge && alertCount > 0 && (
                    <span className={`
                      min-w-[22px] h-[22px] flex items-center justify-center
                      text-xs font-bold rounded-full px-1.5
                      ${isActive
                        ? 'bg-white text-blue-700'
                        : 'bg-red-500 text-white'
                      }
                    `}>
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
        <p>v1.0.0</p>
        <p className="mt-1">© 2025 Construcciones Proig</p>
      </div>
    </aside>
  );
}
