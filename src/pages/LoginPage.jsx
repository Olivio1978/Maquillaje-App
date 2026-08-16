import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { session, loading, role, signIn, signUpClienta } = useAuth()
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (session && !loading) {
    return <Navigate to={role === 'clienta' ? '/portal/reservar' : '/app/agenda'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    const { error: authError } =
      mode === 'signIn' ? await signIn(email, password) : await signUpClienta(email, password, nombre, telefono)

    setSubmitting(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (mode === 'signUp') {
      setMessage('Cuenta creada. Revisa tu correo si se requiere confirmación, o inicia sesión.')
      setMode('signIn')
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Maquillaje App</h1>
        <p className="subtitle">
          {mode === 'signIn' ? 'Inicia sesión para continuar' : 'Crea tu cuenta de clienta'}
        </p>

        {mode === 'signUp' && (
          <>
            <div className="field">
              <label htmlFor="nombre">Nombre completo</label>
              <input
                id="nombre"
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                className="input"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Un momento…' : mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 12 }}
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn')
            setError(null)
            setMessage(null)
          }}
        >
          {mode === 'signIn' ? '¿Eres clienta y no tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </div>
  )
}
