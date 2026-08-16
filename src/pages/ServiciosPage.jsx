import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney } from '../lib/format'

const emptyForm = {
  nombre: '',
  descripcion: '',
  precio_base: '',
  duracion_estimada_minutos: '',
  requiere_anticipo: false,
  monto_anticipo_sugerido: '',
}

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
      requiere_anticipo: servicio.requiere_anticipo ?? false,
      monto_anticipo_sugerido: servicio.monto_anticipo_sugerido ?? '',
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
      duracion_estimada_minutos: form.duracion_estimada_minutos ? Number(form.duracion_estimada_minutos) : null,
      requiere_anticipo: form.requiere_anticipo,
      monto_anticipo_sugerido: form.requiere_anticipo && form.monto_anticipo_sugerido
        ? Number(form.monto_anticipo_sugerido)
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
        <h3 style={{ margin: 0 }}>Servicios</h3>
        <button type="button" className="btn-fab" onClick={openCreateForm}>
          + Nuevo
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : servicios.length === 0 ? (
        <p className="empty">Aún no hay servicios registrados.</p>
      ) : (
        <div className="card-list">
          {servicios.map((s) => (
            <div key={s.id} className="card-row" onClick={() => openEditForm(s)} style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 2 }}>{s.nombre}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {s.duracion_estimada_minutos ? `${s.duracion_estimada_minutos} min` : 'Duración sin definir'}
                </div>
                {s.requiere_anticipo && (
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>
                    <span className="tag tag-accent-2">Requiere anticipo</span>
                  </div>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600, color: 'var(--color-accent-700)' }}>
                {fmtMoney(s.precio_base)}
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="dialog-backdrop" onClick={closeForm}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h4 className="dialog-title">{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h4>

            <div className="field">
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                className="input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                className="input"
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="precio_base">Precio base *</label>
              <input
                id="precio_base"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.precio_base}
                onChange={(e) => setForm({ ...form, precio_base: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="duracion_estimada_minutos">Duración estimada (minutos)</label>
              <input
                id="duracion_estimada_minutos"
                type="number"
                min="0"
                step="1"
                className="input"
                value={form.duracion_estimada_minutos}
                onChange={(e) => setForm({ ...form, duracion_estimada_minutos: e.target.value })}
              />
            </div>

            <label className="checkbox-item" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.requiere_anticipo}
                onChange={(e) => setForm({ ...form, requiere_anticipo: e.target.checked })}
              />
              Requiere anticipo para reservar (portal de clienta)
            </label>

            {form.requiere_anticipo && (
              <div className="field">
                <label htmlFor="monto_anticipo_sugerido">Monto de anticipo sugerido</label>
                <input
                  id="monto_anticipo_sugerido"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.monto_anticipo_sugerido}
                  onChange={(e) => setForm({ ...form, monto_anticipo_sugerido: e.target.value })}
                />
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost danger" onClick={() => handleDelete({ id: editingId, nombre: form.nombre })} style={{ marginRight: 'auto', display: editingId ? 'inline-flex' : 'none' }}>
                Eliminar
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
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
