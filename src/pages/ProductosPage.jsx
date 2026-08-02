import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ESTADO_OPTIONS = ['En prueba', 'Funcionó', 'No funcionó']

const emptyForm = {
  nombre: '',
  marca: '',
  presentacion: '',
  estado_desempeno: 'En prueba',
  motivo: '',
  notas: '',
}

export function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadProductos() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setError(null)
      setProductos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProductos()
  }, [])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(producto) {
    setEditingId(producto.id)
    setForm({
      nombre: producto.nombre ?? '',
      marca: producto.marca ?? '',
      presentacion: producto.presentacion ?? '',
      estado_desempeno: producto.estado_desempeno ?? 'En prueba',
      motivo: producto.motivo ?? '',
      notas: producto.notas ?? '',
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
      marca: form.marca.trim() || null,
      presentacion: form.presentacion.trim() || null,
      estado_desempeno: form.estado_desempeno,
      motivo: form.estado_desempeno === 'No funcionó' ? form.motivo.trim() || null : null,
      notas: form.notas.trim() || null,
    }

    const { error: saveError } = editingId
      ? await supabase.from('productos').update(payload).eq('id', editingId)
      : await supabase.from('productos').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeForm()
    loadProductos()
  }

  async function handleDelete(producto) {
    if (!window.confirm(`¿Eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('productos').delete().eq('id', producto.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadProductos()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Productos</h1>
        {!formOpen && (
          <button type="button" onClick={openCreateForm}>
            Nuevo producto
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>

          <label htmlFor="nombre">Nombre *</label>
          <input
            id="nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <label htmlFor="marca">Marca</label>
          <input
            id="marca"
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
          />

          <label htmlFor="presentacion">Presentación / tamaño</label>
          <input
            id="presentacion"
            placeholder='ej. "30 ml", "paleta 12 tonos"'
            value={form.presentacion}
            onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
          />

          <label htmlFor="estado_desempeno">Estado de desempeño</label>
          <select
            id="estado_desempeno"
            value={form.estado_desempeno}
            onChange={(e) => setForm({ ...form, estado_desempeno: e.target.value })}
          >
            {ESTADO_OPTIONS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>

          {form.estado_desempeno === 'No funcionó' && (
            <>
              <label htmlFor="motivo">Motivo (para no repetir la compra)</label>
              <textarea
                id="motivo"
                rows={2}
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              />
            </>
          )}

          <label htmlFor="notas">Notas de durabilidad / observaciones</label>
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
      ) : productos.length === 0 ? (
        <p className="empty">Aún no hay productos registrados.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Presentación</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id}>
                <td data-label="Nombre">{producto.nombre}</td>
                <td data-label="Marca">{producto.marca || '—'}</td>
                <td data-label="Presentación">{producto.presentacion || '—'}</td>
                <td data-label="Estado">{producto.estado_desempeno}</td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(producto)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="link-button danger"
                    onClick={() => handleDelete(producto)}
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
