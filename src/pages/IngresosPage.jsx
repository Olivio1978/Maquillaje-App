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

const emptyForm = { monto: '', fecha: today(), metodo_pago: '', concepto: '', cita_id: '' }

export function IngresosPage() {
  const [ingresos, setIngresos] = useState([])
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)

    const [ingresosRes, citasRes] = await Promise.all([
      supabase
        .from('ingresos')
        .select('*, citas(id, fecha_hora, clientas(nombre))')
        .order('fecha', { ascending: false }),
      supabase
        .from('citas')
        .select('id, fecha_hora, clientas(nombre)')
        .order('fecha_hora', { ascending: false }),
    ])

    if (ingresosRes.error) {
      setError(ingresosRes.error.message)
    } else {
      setError(null)
      setIngresos(ingresosRes.data)
    }
    setCitas(citasRes.data ?? [])
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

  function openEditForm(ingreso) {
    setEditingId(ingreso.id)
    setForm({
      monto: ingreso.monto,
      fecha: ingreso.fecha,
      metodo_pago: ingreso.metodo_pago ?? '',
      concepto: ingreso.concepto ?? '',
      cita_id: ingreso.cita_id ?? '',
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function citaLabel(cita) {
    const fecha = new Date(cita.fecha_hora).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    return `${cita.clientas?.nombre ?? 'Sin clienta'} · ${fecha}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      monto: Number(form.monto),
      fecha: form.fecha,
      metodo_pago: form.metodo_pago.trim() || null,
      concepto: form.concepto.trim() || null,
      cita_id: form.cita_id || null,
    }

    const { error: saveError } = editingId
      ? await supabase.from('ingresos').update(payload).eq('id', editingId)
      : await supabase.from('ingresos').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeForm()
    loadAll()
  }

  async function handleDelete(ingreso) {
    if (!window.confirm(`¿Eliminar este ingreso de ${currencyFormatter.format(ingreso.monto)}? Esta acción no se puede deshacer.`)) {
      return
    }

    const { error: deleteError } = await supabase.from('ingresos').delete().eq('id', ingreso.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    loadAll()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ingresos</h1>
        {!formOpen && (
          <button type="button" onClick={openCreateForm}>
            Nuevo ingreso
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {formOpen && (
        <form className="record-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>

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

          <label htmlFor="fecha">Fecha *</label>
          <input
            id="fecha"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            required
          />

          <label htmlFor="metodo_pago">Método de pago</label>
          <input
            id="metodo_pago"
            placeholder="Efectivo, tarjeta, transferencia…"
            value={form.metodo_pago}
            onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
          />

          <label htmlFor="concepto">Concepto</label>
          <input
            id="concepto"
            placeholder="ej. Venta de producto, servicio adicional…"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          />

          <label htmlFor="cita_id">Cita relacionada (opcional)</label>
          <select
            id="cita_id"
            value={form.cita_id}
            onChange={(e) => setForm({ ...form, cita_id: e.target.value })}
          >
            <option value="">Ninguna</option>
            {citas.map((cita) => (
              <option key={cita.id} value={cita.id}>
                {citaLabel(cita)}
              </option>
            ))}
          </select>

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
      ) : ingresos.length === 0 ? (
        <p className="empty">Aún no hay ingresos registrados.</p>
      ) : (
        <table className="record-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Método de pago</th>
              <th>Concepto</th>
              <th>Cita</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ingresos.map((ingreso) => (
              <tr key={ingreso.id}>
                <td>{formatDateOnly(ingreso.fecha)}</td>
                <td>{currencyFormatter.format(ingreso.monto)}</td>
                <td>{ingreso.metodo_pago || '—'}</td>
                <td>{ingreso.concepto || '—'}</td>
                <td>{ingreso.citas ? citaLabel(ingreso.citas) : '—'}</td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => openEditForm(ingreso)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="link-button danger"
                    onClick={() => handleDelete(ingreso)}
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
