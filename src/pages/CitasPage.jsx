import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ESTATUS_OPTIONS = ['Agendada', 'Confirmada', 'Realizada', 'Cancelada']

const emptyForm = {
  clienta_id: '',
  fecha_hora: '',
  estatus: 'Agendada',
  anticipo_pagado: false,
  monto_anticipo: '',
  notas: '',
  servicio_ids: [],
}

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      clienta_id: form.clienta_id,
      fecha_hora: new Date(form.fecha_hora).toISOString(),
      estatus: form.estatus,
      anticipo_pagado: form.anticipo_pagado,
      monto_anticipo: form.anticipo_pagado && form.monto_anticipo ? Number(form.monto_anticipo) : null,
      notas: form.notas.trim() || null,
    }

    let citaId = editingId

    if (editingId) {
      const { error: updateError } = await supabase.from('citas').update(payload).eq('id', editingId)
      if (updateError) {
        setSaving(false)
        setError(updateError.message)
        return
      }
      await supabase.from('cita_servicios').delete().eq('cita_id', editingId)
    } else {
      const { data, error: insertError } = await supabase.from('citas').insert(payload).select('id').single()
      if (insertError) {
        setSaving(false)
        setError(insertError.message)
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

          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={form.anticipo_pagado}
              onChange={(e) => setForm({ ...form, anticipo_pagado: e.target.checked })}
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
      ) : citas.length === 0 ? (
        <p className="empty">Aún no hay citas registradas.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Clienta</th>
              <th>Fecha y hora</th>
              <th>Servicios</th>
              <th>Estatus</th>
              <th>Anticipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {citas.map((cita) => (
              <tr key={cita.id}>
                <td>{cita.clientas?.nombre ?? '—'}</td>
                <td>
                  {new Date(cita.fecha_hora).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td>
                  {cita.cita_servicios.length > 0
                    ? cita.cita_servicios.map((cs) => cs.servicios?.nombre).join(', ')
                    : '—'}
                </td>
                <td>{cita.estatus}</td>
                <td>{cita.anticipo_pagado ? `Sí ($${cita.monto_anticipo ?? 0})` : 'No'}</td>
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
