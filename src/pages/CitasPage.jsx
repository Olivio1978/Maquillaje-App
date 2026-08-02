import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toLocalDateString(isoString) {
  const date = new Date(isoString)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function estadoPagoClass(estado) {
  if (estado === 'Pagada') return 'badge badge-success'
  if (estado === 'Con anticipo') return 'badge badge-warning'
  return 'badge badge-neutral'
}

export function CitasPage() {
  const [citas, setCitas] = useState([])
  const [clientas, setClientas] = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  async function loadAll() {
    setLoading(true)

    const [citasRes, clientasRes, serviciosRes] = await Promise.all([
      supabase
        .from('citas')
        .select('*, clientas(id, nombre), cita_servicios(servicio_id, servicios(id, nombre))')
        .order('fecha_hora', { ascending: false }),
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

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
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
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
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
      const { data, error: insertError } = await supabase.from('citas').insert(payload).select('id').single()
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
    closeForm()
    loadAll()
  }

  async function handleDelete(cita) {
    const nombre = cita.clientas?.nombre ?? 'esta clienta'
    if (!window.confirm(`¿Eliminar la cita con ${nombre}? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('citas').delete().eq('id', cita.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadAll()
  }

  const filteredCitas = filterDate
    ? citas.filter((cita) => toLocalDateString(cita.fecha_hora) === filterDate)
    : citas

  return (
    <div className="page">
      <div className="page-header">
        <h1>Citas</h1>
        {!formOpen && clientas.length > 0 && (
          <button type="button" onClick={openCreateForm}>
            Nueva cita
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {clientas.length === 0 && !loading && (
        <p className="empty">Registra al menos una clienta antes de agendar citas.</p>
      )}

      {!formOpen && (
        <div className="filter-bar">
          <label htmlFor="filterDate">Filtrar por fecha</label>
          <input
            id="filterDate"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button type="button" className="secondary" onClick={() => setFilterDate('')}>
              Ver todas
            </button>
          )}
        </div>
      )}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar cita' : 'Nueva cita'}</h2>

          <label htmlFor="clienta_id">Clienta *</label>
          <select
            id="clienta_id"
            value={form.clienta_id}
            onChange={(e) => setForm({ ...form, clienta_id: e.target.value })}
            required
          >
            <option value="" disabled>
              Selecciona una clienta
            </option>
            {clientas.map((clienta) => (
              <option key={clienta.id} value={clienta.id}>
                {clienta.nombre}
              </option>
            ))}
          </select>

          <label htmlFor="fecha_hora">Fecha y hora *</label>
          <input
            id="fecha_hora"
            type="datetime-local"
            value={form.fecha_hora}
            onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })}
            required
          />

          <label htmlFor="estatus">Estatus</label>
          <select
            id="estatus"
            value={form.estatus}
            onChange={(e) => setForm({ ...form, estatus: e.target.value })}
          >
            {ESTATUS_OPTIONS.map((estatus) => (
              <option key={estatus} value={estatus}>
                {estatus}
              </option>
            ))}
          </select>

          <label>Servicios</label>
          <div className="checkbox-list">
            {servicios.length === 0 && <p className="empty">No hay servicios registrados.</p>}
            {servicios.map((servicio) => (
              <label key={servicio.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.servicio_ids.includes(servicio.id)}
                  onChange={() => toggleServicio(servicio.id)}
                />
                {servicio.nombre}
              </label>
            ))}
          </div>

          <label htmlFor="estado_pago">Estatus de pago</label>
          <select
            id="estado_pago"
            value={form.estado_pago}
            onChange={(e) => setForm({ ...form, estado_pago: e.target.value })}
          >
            {ESTADO_PAGO_OPTIONS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>

          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={form.anticipo_pagado}
              onChange={(e) => toggleAnticipo(e.target.checked)}
            />
            Anticipo pagado
          </label>

          {form.anticipo_pagado && (
            <>
              <label htmlFor="monto_anticipo">Monto del anticipo</label>
              <input
                id="monto_anticipo"
                type="number"
                min="0"
                step="0.01"
                value={form.monto_anticipo}
                onChange={(e) => setForm({ ...form, monto_anticipo: e.target.value })}
              />
            </>
          )}

          <label htmlFor="notas">Notas</label>
          <textarea
            id="notas"
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="secondary" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : filteredCitas.length === 0 ? (
        <p className="empty">
          {filterDate ? 'No hay citas en esa fecha.' : 'Aún no hay citas registradas.'}
        </p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Clienta</th>
              <th>Fecha y hora</th>
              <th>Servicios</th>
              <th>Estatus</th>
              <th>Pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCitas.map((cita) => (
              <tr key={cita.id}>
                <td data-label="Clienta">{cita.clientas?.nombre ?? '—'}</td>
                <td data-label="Fecha y hora">
                  {new Date(cita.fecha_hora).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td data-label="Servicios">
                  {cita.cita_servicios.length > 0
                    ? cita.cita_servicios.map((cs) => cs.servicios?.nombre).join(', ')
                    : '—'}
                </td>
                <td data-label="Estatus">{cita.estatus}</td>
                <td data-label="Pago">
                  <span className={estadoPagoClass(cita.estado_pago)}>{cita.estado_pago}</span>
                  {cita.anticipo_pagado && cita.monto_anticipo ? ` ($${cita.monto_anticipo})` : ''}
                </td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(cita)}>
                    Editar
                  </button>
                  <button type="button" className="link-button danger" onClick={() => handleDelete(cita)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
