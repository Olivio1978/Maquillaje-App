import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtDateShort, todayDateString } from '../lib/format'

const BUCKET = 'galeria'

const emptyForm = { etiqueta: '', fecha: todayDateString(), clienta_id: '' }

async function uploadFoto(file) {
  if (!file) return null
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  return path
}

export function GaleriaPage() {
  const [items, setItems] = useState([])
  const [urls, setUrls] = useState({})
  const [clientas, setClientas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [fotoAntes, setFotoAntes] = useState(null)
  const [fotoDespues, setFotoDespues] = useState(null)
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [galeriaRes, clientasRes] = await Promise.all([
      supabase.from('galeria').select('*, clientas(nombre)').order('fecha', { ascending: false }),
      supabase.from('clientas').select('id, nombre').order('nombre'),
    ])

    if (galeriaRes.error) {
      setError(galeriaRes.error.message)
    } else {
      setError(null)
      setItems(galeriaRes.data)

      const paths = galeriaRes.data.flatMap((g) => [g.foto_antes_path, g.foto_despues_path]).filter(Boolean)
      const signedEntries = await Promise.all(
        paths.map(async (path) => {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
          return [path, data?.signedUrl]
        }),
      )
      setUrls(Object.fromEntries(signedEntries))
    }
    setClientas(clientasRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  function openForm() {
    setForm(emptyForm)
    setFotoAntes(null)
    setFotoDespues(null)
    setDialogOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const [antesPath, despuesPath] = await Promise.all([uploadFoto(fotoAntes), uploadFoto(fotoDespues)])

      const { error: insertError } = await supabase.from('galeria').insert({
        clienta_id: form.clienta_id || null,
        etiqueta: form.etiqueta.trim() || null,
        fecha: form.fecha,
        foto_antes_path: antesPath,
        foto_despues_path: despuesPath,
      })

      if (insertError) throw insertError

      setDialogOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('¿Eliminar este trabajo de la galería? Esta acción no se puede deshacer.')) return

    const paths = [item.foto_antes_path, item.foto_despues_path].filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths)
    }
    const { error: deleteError } = await supabase.from('galeria').delete().eq('id', item.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    loadAll()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3 style={{ margin: 0 }}>Galería de trabajos</h3>
        <button type="button" className="btn-fab" onClick={openForm}>
          + Nuevo
        </button>
      </div>
      <p className="page-subtitle">Antes y después de cada evento</p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="empty">Aún no hay trabajos en la galería.</p>
      ) : (
        <div className="card-list">
          {items.map((item) => (
            <div key={item.id} className="gallery-card">
              <div className="gallery-photos">
                <div className="gallery-photo">
                  {urls[item.foto_antes_path] ? <img src={urls[item.foto_antes_path]} alt="Antes" /> : 'antes'}
                  <span className="gallery-photo-label">antes</span>
                </div>
                <div className="gallery-photo">
                  {urls[item.foto_despues_path] ? <img src={urls[item.foto_despues_path]} alt="Después" /> : 'después'}
                  <span className="gallery-photo-label">después</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {item.etiqueta || item.clientas?.nombre || 'Trabajo sin título'}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.6 }}>{fmtDateShort(item.fecha)}</div>
                </div>
                <button type="button" className="btn btn-ghost danger" onClick={() => handleDelete(item)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="dialog-backdrop" onClick={() => setDialogOpen(false)}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h4 className="dialog-title">Nuevo trabajo</h4>

            <div className="field">
              <label htmlFor="etiqueta">Descripción</label>
              <input
                id="etiqueta"
                className="input"
                placeholder="ej. Maquillaje de novia — boda de junio"
                value={form.etiqueta}
                onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="clienta_id">Clienta (opcional)</label>
              <select
                id="clienta_id"
                className="input"
                value={form.clienta_id}
                onChange={(e) => setForm({ ...form, clienta_id: e.target.value })}
              >
                <option value="">Sin especificar</option>
                {clientas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="fecha">Fecha *</label>
              <input
                id="fecha"
                type="date"
                className="input"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="foto_antes">Foto de antes</label>
              <input
                id="foto_antes"
                type="file"
                accept="image/*"
                className="input"
                onChange={(e) => setFotoAntes(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="field">
              <label htmlFor="foto_despues">Foto de después</label>
              <input
                id="foto_despues"
                type="file"
                accept="image/*"
                className="input"
                onChange={(e) => setFotoDespues(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(false)}>
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
