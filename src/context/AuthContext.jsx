import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [role, setRole] = useState(undefined)
  const [clienta, setClienta] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return

    if (!session) {
      setRole(null)
      setClienta(null)
      return
    }

    let cancelled = false
    setRole(undefined)

    supabase
      .from('clientas')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setRole('clienta')
          setClienta(data)
        } else {
          setRole('admin')
          setClienta(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const value = {
    session,
    loading: session === undefined || (session !== null && role === undefined),
    role,
    clienta,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    async signUpClienta(email, password, nombre, telefono) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return { error }
      if (!data.user) return { error: null }

      const { error: insertError } = await supabase.from('clientas').insert({
        nombre,
        telefono: telefono || null,
        email,
        auth_user_id: data.user.id,
      })

      if (insertError) return { error: insertError }
      return { error: null }
    },
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
