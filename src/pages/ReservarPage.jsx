import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { addDays, fmtDateShort, fmtMoney, todayDateString } from '../lib/format'

export function ReservarPage() {
  const { clienta } = useAuth()
  const navigate = useNavigate()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [bookingDate, setBookingDate] = useState(addDays(todayDateString(), 3))
  const [bookingTime, setBookingTime] = useState('11:00')
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('servicios')
      .select('*')
      .order('nombre')
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setServicios(data)
          if (data.length > 0) setSelectedServiceId(data[0].id)
        }
        setLoading(false)
      })
  }, [])

  const selectedService = servicios.find((s) => s.id === selectedServiceId)

  function conflictMessage(err) {
    if (err?.code === '23505') {
      return 'Ese horario ya no está disponible. Elige otra fecha u hora.'
    }
    return err.message
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)

    const payload = {
      clienta_id: clienta.id,
      fecha_hora: new Date(`${bookingDate}T${bookingTime}`).toISOString(),
      estatus: 'Agendada',
      estado_pago: 'Sin pagar',
      anticipo_pagado: false,
      origen: 'Reservada por clienta',
    }

    const { data, error: insertError } = await supabase.from('citas').insert(payload).select('id').single()

    if (insertError) {
      setSaving(false)
      setError(conflictMessage(insertError))
      return
    }

    const { error: servError } = await supabase
      .from('cita_servicios')
      .insert({ cita_id: data.id, servicio_id: selectedServiceId })

    setSaving(false)

    if (servError) {
      setError(servError.message)
      return
    }

    setShowConfirm(false)
    navigate('/portal/mis-citas')
  }

  return (
    <div className="page">
      <h3 style={{ marginBottom: 4 }}>Reservar cita</h3>
      <p className="page-subtitle" style={{ margin: '0 0 20px' }}>
        Hola, {clienta?.nombre?.split(' ')[0] ?? ''}
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : servicios.length === 0 ? (
        <p className="empty">No hay servicios disponibles todavía.</p>
      ) : (
        <>
          <h6 style={{ color: 'var(--color-accent-700)' }}>Servicio</h6>
          <div className="card-list" style={{ marginBottom: 20 }}>
            {servicios.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`option-row${s.id === selectedServiceId ? ' selected' : ''}`}
                onClick={() => setSelectedServiceId(s.id)}
              >
                <span className="option-dot" />
                <span style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.nombre}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {s.duracion_estimada_minutos ? `${s.duracion_estimada_minutos} min` : 'Duración sin definir'}
                  </div>
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, color: 'var(--color-accent-700)' }}>
                  {fmtMoney(s.precio_base)}
                </span>
              </button>
            ))}
          </div>

          <h6 style={{ color: 'var(--color-accent-700)' }}>Fecha y hora</h6>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              type="date"
              className="input"
              value={bookingDate}
              min={todayDateString()}
              onChange={(e) => setBookingDate(e.target.value)}
            />
            <input type="time" className="input" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
          </div>

          {selectedService?.requiere_anticipo && (
            <div style={{ fontSize: 12.5, color: 'var(--color-accent-2-700)', marginBottom: 16 }}>
              Este servicio requiere un anticipo de {fmtMoney(selectedService.monto_anticipo_sugerido)} para confirmar tu
              reserva.
            </div>
          )}

          <button type="button" className="btn btn-primary btn-block" onClick={() => setShowConfirm(true)}>
            Reservar
          </button>
        </>
      )}

      {showConfirm && (
        <div className="dialog-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h4 className="dialog-title">Confirmar reserva</h4>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600 }}>{selectedService?.nombre}</div>
              <div style={{ opacity: 0.75 }}>
                {fmtDateShort(bookingDate)} · {bookingTime}
              </div>
              {selectedService?.requiere_anticipo && (
                <div style={{ color: 'var(--color-accent-2-700)', marginTop: 6 }}>
                  Anticipo requerido: {fmtMoney(selectedService.monto_anticipo_sugerido)}
                </div>
              )}
            </div>
            {error && <p className="error">{error}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleConfirm}>
                {saving ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
