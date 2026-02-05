// src/render/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './routes/DashboardPage';
import ProyectosPage from './routes/ProyectosPage';
import ProyectoDetallePage from './routes/ProyectoDetallePage';
import MaterialesPage from './routes/MaterialesPage';
import AlertasPage from './routes/AlertasPage';
import ProveedoresPage from './routes/ProveedoresPage';
import InventarioPage from './routes/InventarioPage';
import OrdenesPage from './routes/OrdenesPage';

function App() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;