import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    return <Navigate to="/clientas" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    const { error: authError } =
      mode === 'signIn' ? await signIn(email, password) : await signUp(email, password)

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
          {mode === 'signIn' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>

        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
        />

        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}

        <button type="submit" disabled={submitting}>
          {mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn')
            setError(null)
            setMessage(null)
          }}
        >
          {mode === 'signIn' ? '¿No tienes cuenta? Créala' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </form>
    </div>
  )
}
