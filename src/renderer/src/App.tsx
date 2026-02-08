// src/render/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ToastContainer from './components/ui/Toast';
import DashboardPage from './routes/DashboardPage';
import ProyectosPage from './routes/ProyectosPage';
import ProyectoDetallePage from './routes/ProyectoDetallePage';
import MaterialesPage from './routes/MaterialesPage';
import AlertasPage from './routes/AlertasPage';
import ProveedoresPage from './routes/ProveedoresPage';
import InventarioPage from './routes/InventarioPage';
import OrdenesPage from './routes/OrdenesPage';
import ConfiguracionPage from './routes/ConfiguracionPage';
import LoginPage from './routes/LoginPage';
import SetupWizardPage from './routes/SetupWizardPage';
import RecoveryPage from './routes/RecoveryPage';

function AppRoutes() {
  const { isAuthenticated, isFirstUse, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-4xl">🏗</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mt-4"></div>
          <p className="mt-4 text-blue-200">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Primer uso: wizard obligatorio
  if (isFirstUse) {
    return (
      <Routes>
        <Route path="*" element={<SetupWizardPage />} />
      </Routes>
    );
  }

  // No autenticado: login + recovery
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/recovery" element={<RecoveryPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // Autenticado: app completa
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="proyectos" element={<ProyectosPage />} />
        <Route path="proyectos/:id" element={<ProyectoDetallePage />} />
        <Route path="materiales" element={<MaterialesPage />} />
        <Route path="alertas" element={<AlertasPage />} />
        <Route path="proveedores" element={<ProveedoresPage />} />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="ordenes" element={<OrdenesPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
