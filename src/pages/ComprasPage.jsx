import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function today() {
  const date = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateOnly(dateString) {
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

const emptyForm = { producto_id: '', proveedor: '', fecha: today(), cantidad: '', costo_unitario: '' }

export function ComprasPage() {
  const [compras, setCompras] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)

    const [comprasRes, productosRes] = await Promise.all([
      supabase
        .from('compras')
        .select('*, productos(id, nombre)')
        .order('fecha', { ascending: false }),
      supabase.from('productos').select('id, nombre').order('nombre'),
    ])

    if (comprasRes.error) {
      setError(comprasRes.error.message)
    } else {
      setError(null)
      setCompras(comprasRes.data)
    }
    setProductos(productosRes.data ?? [])
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

  function openEditForm(compra) {
    setEditingId(compra.id)
    setForm({
      producto_id: compra.producto_id,
      proveedor: compra.proveedor ?? '',
      fecha: compra.fecha,
      cantidad: compra.cantidad,
      costo_unitario: compra.costo_unitario,
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
      producto_id: form.producto_id,
      proveedor: form.proveedor.trim() || null,
      fecha: form.fecha,
      cantidad: Number(form.cantidad),
      costo_unitario: Number(form.costo_unitario),
    }

    const { error: saveError } = editingId
      ? await supabase.from('compras').update(payload).eq('id', editingId)
      : await supabase.from('compras').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeForm()
    loadAll()
  }

  async function handleDelete(compra) {
    const nombre = compra.productos?.nombre ?? 'este producto'
    if (!window.confirm(`¿Eliminar la compra de "${nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('compras').delete().eq('id', compra.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadAll()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Compras</h1>
        {!formOpen && productos.length > 0 && (
          <button type="button" onClick={openCreateForm}>
            Nueva compra
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {productos.length === 0 && !loading && (
        <p className="empty">Registra al menos un producto en el catálogo antes de capturar compras.</p>
      )}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar compra' : 'Nueva compra'}</h2>

          <label htmlFor="producto_id">Producto *</label>
          <select
            id="producto_id"
            value={form.producto_id}
            onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
            required
          >
            <option value="" disabled>
              Selecciona un producto
            </option>
            {productos.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.nombre}
              </option>
            ))}
          </select>

          <label htmlFor="proveedor">Proveedor</label>
          <input
            id="proveedor"
            value={form.proveedor}
            onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
          />

          <label htmlFor="fecha">Fecha *</label>
          <input
            id="fecha"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            required
          />

          <label htmlFor="cantidad">Cantidad *</label>
          <input
            id="cantidad"
            type="number"
            min="0"
            step="0.01"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            required
          />

          <label htmlFor="costo_unitario">Costo unitario *</label>
          <input
            id="costo_unitario"
            type="number"
            min="0"
            step="0.01"
            value={form.costo_unitario}
            onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })}
            required
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
      ) : compras.length === 0 ? (
        <p className="empty">Aún no hay compras registradas.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Cantidad</th>
              <th>Costo unitario</th>
              <th>Costo total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {compras.map((compra) => (
              <tr key={compra.id}>
                <td data-label="Producto">{compra.productos?.nombre ?? '—'}</td>
                <td data-label="Proveedor">{compra.proveedor || '—'}</td>
                <td data-label="Fecha">{formatDateOnly(compra.fecha)}</td>
                <td data-label="Cantidad">{compra.cantidad}</td>
                <td data-label="Costo unitario">{currencyFormatter.format(compra.costo_unitario)}</td>
                <td data-label="Costo total">{currencyFormatter.format(compra.costo_total)}</td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(compra)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="link-button danger"
                    onClick={() => handleDelete(compra)}
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
