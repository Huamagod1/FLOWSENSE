import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegistroPage from './pages/RegistroPage'
import DashboardPage from './pages/DashboardPage'
import RecintosPage from './pages/RecintosPage'
import RecintoDetallePage from './pages/RecintoDetallePage'
import SubirVideoPage from './pages/SubirVideoPage'
import EditorZonasPage from './pages/EditorZonasPage'
import ResultadosPage from './pages/ResultadosPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/recintos" element={<RecintosPage />} />
          <Route path="/app/recintos/:id" element={<RecintoDetallePage />} />
          <Route path="/app/recintos/:id/analizar" element={<SubirVideoPage />} />
          <Route path="/app/videos/:id/zonas" element={<EditorZonasPage />} />
          <Route path="/app/analisis/:id" element={<ResultadosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
