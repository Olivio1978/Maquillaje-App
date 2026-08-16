import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtDateShort, fmtMoney, toLocalDateString } from '../lib/format'

function estadoPagoClass(estado) {
  if (estado === 'Pagada') return 'tag tag-success'
  if (estado === 'Con anticipo') return 'tag tag-accent-2'
  return 'tag tag-neutral'
}

export function MisCitasPage() {
  const { clienta } = useAuth()
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!clienta) return
    supabase
      .from('citas')
      .select('*, cita_servicios(servicios(nombre, requiere_anticipo, monto_anticipo_sugerido))')
      .eq('clienta_id', clienta.id)
      .order('fecha_hora', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message)
        setCitas(data ?? [])
        setLoading(false)
      })
  }, [clienta])

  return (
    <div className="page">
      <h3>Mis citas</h3>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : citas.length === 0 ? (
        <p className="empty">Aún no tienes citas reservadas</p>
      ) : (
        <div className="card-list">
          {citas.map((cita) => {
            const servicios = cita.cita_servicios.map((cs) => cs.servicios).filter(Boolean)
            const depositPending = servicios.some((s) => s.requiere_anticipo) && !cita.anticipo_pagado
            return (
              <div key={cita.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, color: 'var(--color-accent-700)' }}>
                    {fmtDateShort(toLocalDateString(cita.fecha_hora))} ·{' '}
                    {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={estadoPagoClass(cita.estado_pago)}>{cita.estado_pago}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {servicios.map((s) => s.nombre).join(', ') || 'Servicio sin definir'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Recordatorio automático 24h antes por WhatsApp</div>
                {depositPending && (
                  <div style={{ fontSize: 12, color: 'var(--color-accent-2-700)' }}>
                    Anticipo pendiente · {fmtMoney(servicios.find((s) => s.requiere_anticipo)?.monto_anticipo_sugerido)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
