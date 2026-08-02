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

const emptyForm = { fecha: today(), categoria: '', monto: '', descripcion: '', proveedor: '' }

export function GastosPage() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadGastos() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setError(null)
      setGastos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadGastos()
  }, [])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(gasto) {
    setEditingId(gasto.id)
    setForm({
      fecha: gasto.fecha,
      categoria: gasto.categoria ?? '',
      monto: gasto.monto,
      descripcion: gasto.descripcion ?? '',
      proveedor: gasto.proveedor ?? '',
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
      fecha: form.fecha,
      categoria: form.categoria.trim() || null,
      monto: Number(form.monto),
      descripcion: form.descripcion.trim() || null,
      proveedor: form.proveedor.trim() || null,
    }

    const { error: saveError } = editingId
      ? await supabase.from('gastos').update(payload).eq('id', editingId)
      : await supabase.from('gastos').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeForm()
    loadGastos()
  }

  async function handleDelete(gasto) {
    if (!window.confirm(`¿Eliminar este gasto de ${currencyFormatter.format(gasto.monto)}? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('gastos').delete().eq('id', gasto.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadGastos()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gastos</h1>
        {!formOpen && (
          <button type="button" onClick={openCreateForm}>
            Nuevo gasto
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar gasto' : 'Nuevo gasto'}</h2>

          <label htmlFor="fecha">Fecha *</label>
          <input
            id="fecha"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            required
          />

          <label htmlFor="categoria">Categoría</label>
          <input
            id="categoria"
            placeholder="ej. Insumos, renta, transporte…"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          />

          <label htmlFor="monto">Monto *</label>
          <input
            id="monto"
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            required
          />

          <label htmlFor="proveedor">Proveedor</label>
          <input
            id="proveedor"
            value={form.proveedor}
            onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
          />

          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            rows={3}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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
      ) : gastos.length === 0 ? (
        <p className="empty">Aún no hay gastos registrados.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Monto</th>
              <th>Proveedor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto) => (
              <tr key={gasto.id}>
                <td>{formatDateOnly(gasto.fecha)}</td>
                <td>{gasto.categoria || '—'}</td>
                <td>{currencyFormatter.format(gasto.monto)}</td>
                <td>{gasto.proveedor || '—'}</td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(gasto)}>
                    Editar
                  </button>
                  <button type="button" className="link-button danger" onClick={() => handleDelete(gasto)}>
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
