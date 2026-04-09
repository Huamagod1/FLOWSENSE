import { Routes, Route, Navigate } from 'react-router-dom'

// Pages
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Recintos from './pages/recintos/Recintos'
import Videos from './pages/videos/Videos'
import Zonas from './pages/zonas/Zonas'

// Context
import { useAuth } from './context/AuthContext'

function PrivateRoute({ children }) {
  const { usuario } = useAuth()
  return usuario ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/recintos" element={<PrivateRoute><Recintos /></PrivateRoute>} />
      <Route path="/videos" element={<PrivateRoute><Videos /></PrivateRoute>} />
      <Route path="/zonas/:recintoId" element={<PrivateRoute><Zonas /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App