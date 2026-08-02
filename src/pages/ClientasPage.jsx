import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const emptyForm = { nombre: '', telefono: '', email: '', redes_sociales: '', notas: '' }

export function ClientasPage() {
  const [clientas, setClientas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadClientas() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('clientas')
      .select('*')
      .order('fecha_registro', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setError(null)
      setClientas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClientas()
  }, [])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(clienta) {
    setEditingId(clienta.id)
    setForm({
      nombre: clienta.nombre ?? '',
      telefono: clienta.telefono ?? '',
      email: clienta.email ?? '',
      redes_sociales: clienta.redes_sociales ?? '',
      notas: clienta.notas ?? '',
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
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      redes_sociales: form.redes_sociales.trim() || null,
      notas: form.notas.trim() || null,
    }

    const { error: saveError } = editingId
      ? await supabase.from('clientas').update(payload).eq('id', editingId)
      : await supabase.from('clientas').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeForm()
    loadClientas()
  }

  async function handleDelete(clienta) {
    if (!window.confirm(`¿Eliminar a ${clienta.nombre}? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('clientas').delete().eq('id', clienta.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadClientas()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clientas</h1>
        {!formOpen && (
          <button type="button" onClick={openCreateForm}>
            Nueva clienta
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar clienta' : 'Nueva clienta'}</h2>

          <label htmlFor="nombre">Nombre *</label>
          <input
            id="nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label htmlFor="redes_sociales">Redes sociales</label>
          <input
            id="redes_sociales"
            value={form.redes_sociales}
            onChange={(e) => setForm({ ...form, redes_sociales: e.target.value })}
          />

          <label htmlFor="notas">Notas / preferencias</label>
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
      ) : clientas.length === 0 ? (
        <p className="empty">Aún no hay clientas registradas.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Registrada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientas.map((clienta) => (
              <tr key={clienta.id}>
                <td>{clienta.nombre}</td>
                <td>{clienta.telefono || '—'}</td>
                <td>{clienta.email || '—'}</td>
                <td>{new Date(clienta.fecha_registro).toLocaleDateString('es-MX')}</td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(clienta)}>
                    Editar
                  </button>
                  <button type="button" className="link-button danger" onClick={() => handleDelete(clienta)}>
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
