import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  addDays,
  fmtDateLong,
  isoDate,
  mondayOf,
  toDatetimeLocal,
  toLocalDateString,
  todayDateString,
  WEEKDAY_LETTERS,
  whatsappLink,
} from '../lib/format'

const ESTATUS_OPTIONS = ['Agendada', 'Confirmada', 'Realizada', 'Cancelada']
const ESTADO_PAGO_OPTIONS = ['Sin pagar', 'Con anticipo', 'Pagada']

const emptyForm = {
  clienta_id: '',
  fecha_hora: '',
  estatus: 'Agendada',
  estado_pago: 'Sin pagar',
  anticipo_pagado: false,
  monto_anticipo: '',
  notas: '',
  servicio_ids: [],
}

function estadoPagoClass(estado) {
  if (estado === 'Pagada') return 'tag tag-success'
  if (estado === 'Con anticipo') return 'tag tag-accent-2'
  return 'tag tag-neutral'
}

export function AgendaPage() {
  const today = todayDateString()
  const [citas, setCitas] = useState([])
  const [clientas, setClientas] = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [citasRes, clientasRes, serviciosRes] = await Promise.all([
      supabase
        .from('citas')
        .select('*, clientas(id, nombre, telefono), cita_servicios(servicio_id, servicios(id, nombre))')
        .order('fecha_hora', { ascending: true }),
      supabase.from('clientas').select('id, nombre').order('nombre'),
      supabase.from('servicios').select('id, nombre').order('nombre'),
    ])

    if (citasRes.error) {
      setError(citasRes.error.message)
    } else {
      setError(null)
      setCitas(citasRes.data)
    }
    setClientas(clientasRes.data ?? [])
    setServicios(serviciosRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const weekDays = useMemo(() => {
    const monday = mondayOf(selectedDate)
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      const dateStr = isoDate(d)
      const hasAppt = citas.some((c) => toLocalDateString(c.fecha_hora) === dateStr && c.estatus !== 'Cancelada')
      days.push({ dateStr, weekday: WEEKDAY_LETTERS[i], dayNum: d.getDate(), hasAppt })
    }
    return days
  }, [selectedDate, citas])

  const selectedDayAppointments = citas.filter((c) => toLocalDateString(c.fecha_hora) === selectedDate)

  const reminders = citas.filter((c) => {
    if (c.estatus === 'Cancelada' || c.estatus === 'Realizada') return false
    const dateStr = toLocalDateString(c.fecha_hora)
    return dateStr === today || dateStr === addDays(today, 1)
  })

  function openCreateForm() {
    setEditingId(null)
    setForm({ ...emptyForm, fecha_hora: `${selectedDate}T10:00` })
    setDialogOpen(true)
  }

  function openEditForm(cita) {
    setEditingId(cita.id)
    setForm({
      clienta_id: cita.clienta_id,
      fecha_hora: toDatetimeLocal(cita.fecha_hora),
      estatus: cita.estatus,
      estado_pago: cita.estado_pago,
      anticipo_pagado: cita.anticipo_pagado,
      monto_anticipo: cita.monto_anticipo ?? '',
      notas: cita.notas ?? '',
      servicio_ids: cita.cita_servicios.map((cs) => cs.servicio_id),
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function toggleServicio(servicioId) {
    setForm((prev) => ({
      ...prev,
      servicio_ids: prev.servicio_ids.includes(servicioId)
        ? prev.servicio_ids.filter((id) => id !== servicioId)
        : [...prev.servicio_ids, servicioId],
    }))
  }

  function toggleAnticipo(checked) {
    setForm((prev) => ({
      ...prev,
      anticipo_pagado: checked,
      estado_pago: checked && prev.estado_pago === 'Sin pagar' ? 'Con anticipo' : prev.estado_pago,
    }))
  }

  function conflictMessage(err) {
    if (err?.code === '23505') {
      return 'Ya hay una cita agendada en esa fecha y hora. Elige otro horario.'
    }
    return err.message
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      clienta_id: form.clienta_id,
      fecha_hora: new Date(form.fecha_hora).toISOString(),
      estatus: form.estatus,
      estado_pago: form.estado_pago,
      anticipo_pagado: form.anticipo_pagado,
      monto_anticipo: form.anticipo_pagado && form.monto_anticipo ? Number(form.monto_anticipo) : null,
      notas: form.notas.trim() || null,
    }

    let citaId = editingId

    if (editingId) {
      const { error: updateError } = await supabase.from('citas').update(payload).eq('id', editingId)
      if (updateError) {
        setSaving(false)
        setError(conflictMessage(updateError))
        return
      }
      await supabase.from('cita_servicios').delete().eq('cita_id', editingId)
    } else {
      const { data, error: insertError } = await supabase
        .from('citas')
        .insert({ ...payload, origen: 'Creada por maquillista' })
        .select('id')
        .single()
      if (insertError) {
        setSaving(false)
        setError(conflictMessage(insertError))
        return
      }
      citaId = data.id
    }

    if (form.servicio_ids.length > 0) {
      const rows = form.servicio_ids.map((servicio_id) => ({ cita_id: citaId, servicio_id }))
      const { error: servErr } = await supabase.from('cita_servicios').insert(rows)
      if (servErr) {
        setSaving(false)
        setError(servErr.message)
        return
      }
    }

    setSaving(false)
    closeDialog()
    loadAll()
  }

  async function handleDelete() {
    if (!editingId) return
    if (!window.confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.')) return

    const { error: deleteError } = await supabase.from('citas').delete().eq('id', editingId)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    closeDialog()
    loadAll()
  }

  return (
    <div className="page">
      <h6 style={{ color: 'var(--color-accent-700)' }}>Agenda semanal</h6>
      <h3>{fmtDateLong(selectedDate)}</h3>

      {error && <p className="error">{error}</p>}

      <div className="week-strip">
        {weekDays.map((d) => (
          <button
            key={d.dateStr}
            type="button"
            className={`day-chip${d.dateStr === selectedDate ? ' selected' : ''}${d.hasAppt ? ' has-appt' : ''}`}
            onClick={() => setSelectedDate(d.dateStr)}
          >
            <span className="weekday">{d.weekday}</span>
            <span className="daynum">{d.dayNum}</span>
            <span className="dot" />
          </button>
        ))}
      </div>

      <div className="page-header" style={{ marginBottom: 12 }}>
        <h5 style={{ margin: 0 }}>{fmtDateLong(selectedDate)}</h5>
        <button type="button" className="btn-fab" onClick={openCreateForm}>
          + Agregar cita
        </button>
      </div>

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : selectedDayAppointments.length === 0 ? (
        <p className="empty">Sin citas para este día</p>
      ) : (
        <div className="card-list" style={{ marginBottom: 26 }}>
          {selectedDayAppointments.map((cita) => (
            <div key={cita.id} className="card" onClick={() => openEditForm(cita)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, color: 'var(--color-accent-700)' }}>
                  {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={estadoPagoClass(cita.estado_pago)}>{cita.estado_pago}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{cita.clientas?.nombre ?? '—'}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                {cita.cita_servicios.length > 0
                  ? cita.cita_servicios.map((cs) => cs.servicios?.nombre).join(', ')
                  : 'Sin servicios asignados'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{cita.estatus}</div>
            </div>
          ))}
        </div>
      )}

      {reminders.length > 0 && (
        <>
          <h6 style={{ color: 'var(--color-accent-700)' }}>Recordatorios automáticos</h6>
          <div className="card-list" style={{ marginBottom: 24 }}>
            {reminders.map((cita) => {
              const isToday = toLocalDateString(cita.fecha_hora) === today
              const mensaje = `Hola ${cita.clientas?.nombre ?? ''}, te confirmo tu cita de maquillaje el ${new Date(
                cita.fecha_hora,
              ).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}. ¡Nos vemos pronto!`
              return (
                <div key={cita.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {cita.clientas?.nombre} ·{' '}
                      {cita.cita_servicios.map((cs) => cs.servicios?.nombre).join(', ') || 'Servicio sin definir'}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65 }}>{isToday ? 'Hoy' : 'Mañana'}</div>
                  </div>
                  <a
                    className="btn btn-primary"
                    href={whatsappLink(cita.clientas?.telefono, mensaje)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
              )
            })}
          </div>
        </>
      )}

      {dialogOpen && (
        <div className="dialog-backdrop" onClick={closeDialog}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h4 className="dialog-title">{editingId ? 'Editar cita' : 'Nueva cita'}</h4>

            <div className="field">
              <label htmlFor="clienta_id">Clienta *</label>
              <select
                id="clienta_id"
                className="input"
                value={form.clienta_id}
                onChange={(e) => setForm({ ...form, clienta_id: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecciona una clienta
                </option>
                {clientas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="fecha_hora">Fecha y hora *</label>
              <input
                id="fecha_hora"
                type="datetime-local"
                className="input"
                value={form.fecha_hora}
                onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Servicios</label>
              <div className="checkbox-list">
                {servicios.length === 0 && <p className="empty">No hay servicios registrados.</p>}
                {servicios.map((s) => (
                  <label key={s.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.servicio_ids.includes(s.id)}
                      onChange={() => toggleServicio(s.id)}
                    />
                    {s.nombre}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="estatus">Estatus</label>
              <select
                id="estatus"
                className="input"
                value={form.estatus}
                onChange={(e) => setForm({ ...form, estatus: e.target.value })}
              >
                {ESTATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="estado_pago">Estatus de pago</label>
              <select
                id="estado_pago"
                className="input"
                value={form.estado_pago}
                onChange={(e) => setForm({ ...form, estado_pago: e.target.value })}
              >
                {ESTADO_PAGO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <label className="checkbox-item" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.anticipo_pagado}
                onChange={(e) => toggleAnticipo(e.target.checked)}
              />
              Anticipo pagado
            </label>

            {form.anticipo_pagado && (
              <div className="field">
                <label htmlFor="monto_anticipo">Monto del anticipo</label>
                <input
                  id="monto_anticipo"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.monto_anticipo}
                  onChange={(e) => setForm({ ...form, monto_anticipo: e.target.value })}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="notas">Notas</label>
              <textarea
                id="notas"
                className="input"
                rows={3}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              {editingId && (
                <button type="button" className="btn btn-ghost danger" onClick={handleDelete}>
                  Eliminar
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={closeDialog}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
