import { createContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [token, setToken] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('flowsense_token')
    const storedUsuario = localStorage.getItem('flowsense_usuario')
    if (storedToken && storedUsuario) {
      try {
        const decoded = jwtDecode(storedToken)
        if (decoded.exp * 1000 < Date.now()) {
          _limpiar()
          navigate('/login', { replace: true })
        } else {
          setToken(storedToken)
          setUsuario(JSON.parse(storedUsuario))
        }
      } catch {
        _limpiar()
        navigate('/login', { replace: true })
      }
    }
  }, [])

  function _limpiar() {
    localStorage.removeItem('flowsense_token')
    localStorage.removeItem('flowsense_usuario')
    setToken(null)
    setUsuario(null)
  }

  function login(nuevoToken, nuevoUsuario) {
    localStorage.setItem('flowsense_token', nuevoToken)
    localStorage.setItem('flowsense_usuario', JSON.stringify(nuevoUsuario))
    setToken(nuevoToken)
    setUsuario(nuevoUsuario)
  }

  function logout() {
    _limpiar()
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ usuario, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
