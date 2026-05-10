import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../api/axiosConfig'
import { useAuth } from '../hooks/useAuth'

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export default function RegistroPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [errorServidor, setErrorServidor] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data) {
    setErrorServidor('')
    try {
      const res = await api.post('/auth/registro', data)
      login(res.data.token, res.data.usuario)
      navigate('/app', { replace: true })
    } catch (err) {
      setErrorServidor(
        err.response?.data?.mensaje || err.response?.data?.message || 'Error al crear la cuenta'
      )
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">⬡</span>
          <h1 className="auth-title">FlowSense</h1>
          <p className="auth-subtitle">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="field-row">
            <div className="field">
              <label className="field-label">Nombre</label>
              <input
                type="text"
                className={`field-input${errors.nombre ? ' error' : ''}`}
                placeholder="Juan"
                {...register('nombre')}
              />
              {errors.nombre && <span className="field-error">{errors.nombre.message}</span>}
            </div>

            <div className="field">
              <label className="field-label">Apellido</label>
              <input
                type="text"
                className={`field-input${errors.apellido ? ' error' : ''}`}
                placeholder="Pérez"
                {...register('apellido')}
              />
              {errors.apellido && <span className="field-error">{errors.apellido.message}</span>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Email</label>
            <input
              type="email"
              className={`field-input${errors.email ? ' error' : ''}`}
              placeholder="tu@email.com"
              {...register('email')}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          <div className="field">
            <label className="field-label">Contraseña</label>
            <input
              type="password"
              className={`field-input${errors.password ? ' error' : ''}`}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>

          {errorServidor && <div className="alert alert-error">{errorServidor}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login" className="link">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
