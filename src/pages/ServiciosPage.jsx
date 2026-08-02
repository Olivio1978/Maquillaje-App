import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const emptyForm = { nombre: '', descripcion: '', precio_base: '', duracion_estimada_minutos: '' }

const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function ServiciosPage() {
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadServicios() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('servicios')
      .select('*')
      .order('nombre', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setError(null)
      setServicios(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadServicios()
  }, [])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(servicio) {
    setEditingId(servicio.id)
    setForm({
      nombre: servicio.nombre ?? '',
      descripcion: servicio.descripcion ?? '',
      precio_base: servicio.precio_base ?? '',
      duracion_estimada_minutos: servicio.duracion_estimada_minutos ?? '',
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio_base: Number(form.precio_base),
      duracion_estimada_minutos: form.duracion_estimada_minutos
        ? Number(form.duracion_estimada_minutos)
        : null,
    }

    const { error: saveError } = editingId
      ? await supabase.from('servicios').update(payload).eq('id', editingId)
      : await supabase.from('servicios').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeForm()
    loadServicios()
  }

  async function handleDelete(servicio) {
    if (!window.confirm(`¿Eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('servicios').delete().eq('id', servicio.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadServicios()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Servicios</h1>
        {!formOpen && (
          <button type="button" onClick={openCreateForm}>
            Nuevo servicio
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h2>

          <label htmlFor="nombre">Nombre *</label>
          <input
            id="nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            rows={3}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          <label htmlFor="precio_base">Precio base *</label>
          <input
            id="precio_base"
            type="number"
            min="0"
            step="0.01"
            value={form.precio_base}
            onChange={(e) => setForm({ ...form, precio_base: e.target.value })}
            required
          />

          <label htmlFor="duracion_estimada_minutos">Duración estimada (minutos)</label>
          <input
            id="duracion_estimada_minutos"
            type="number"
            min="0"
            step="1"
            value={form.duracion_estimada_minutos}
            onChange={(e) => setForm({ ...form, duracion_estimada_minutos: e.target.value })}
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
      ) : servicios.length === 0 ? (
        <p className="empty">Aún no hay servicios registrados.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio base</th>
              <th>Duración</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((servicio) => (
              <tr key={servicio.id}>
                <td data-label="Nombre">{servicio.nombre}</td>
                <td data-label="Precio base">{currencyFormatter.format(servicio.precio_base)}</td>
                <td data-label="Duración">
                  {servicio.duracion_estimada_minutos
                    ? `${servicio.duracion_estimada_minutos} min`
                    : '—'}
                </td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(servicio)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="link-button danger"
                    onClick={() => handleDelete(servicio)}
                  >
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
