import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, fmtDateShort, todayDateString } from '../lib/format'

const emptyIngresoForm = { monto: '', fecha: todayDateString(), metodo_pago: '', concepto: '' }
const emptyGastoForm = { fecha: todayDateString(), categoria: '', monto: '', descripcion: '', proveedor: '' }

export function FinanzasPage() {
  const [ingresos, setIngresos] = useState([])
  const [gastos, setGastos] = useState([])
  const [pendingDeposits, setPendingDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [ingresoForm, setIngresoForm] = useState(emptyIngresoForm)
  const [gastoForm, setGastoForm] = useState(emptyGastoForm)
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)

    const [ingresosRes, gastosRes, citasRes] = await Promise.all([
      supabase.from('ingresos').select('*, citas(id, clientas(nombre))').order('fecha', { ascending: false }),
      supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      supabase
        .from('citas')
        .select('id, anticipo_pagado, estatus, clientas(nombre), cita_servicios(servicios(nombre, requiere_anticipo, monto_anticipo_sugerido))')
        .eq('anticipo_pagado', false)
        .neq('estatus', 'Cancelada')
        .neq('estatus', 'Realizada'),
    ])

    if (ingresosRes.error) {
      setError(ingresosRes.error.message)
    } else {
      setError(null)
      setIngresos(ingresosRes.data)
    }
    setGastos(gastosRes.data ?? [])

    const pending = (citasRes.data ?? [])
      .map((cita) => {
        const servicioConAnticipo = cita.cita_servicios
          .map((cs) => cs.servicios)
          .find((s) => s?.requiere_anticipo)
        if (!servicioConAnticipo) return null
        return {
          citaId: cita.id,
          clientName: cita.clientas?.nombre ?? '—',
          serviceName: servicioConAnticipo.nombre,
          monto: Number(servicioConAnticipo.monto_anticipo_sugerido ?? 0),
        }
      })
      .filter(Boolean)
    setPendingDeposits(pending)

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleCobrar(item) {
    const { error: updateError } = await supabase
      .from('citas')
      .update({ anticipo_pagado: true, monto_anticipo: item.monto, estado_pago: 'Con anticipo' })
      .eq('id', item.citaId)

    if (updateError) {
      setError(updateError.message)
      return
    }
    loadAll()
  }

  async function handleSubmitIngreso(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      monto: Number(ingresoForm.monto),
      fecha: ingresoForm.fecha,
      metodo_pago: ingresoForm.metodo_pago.trim() || null,
      concepto: ingresoForm.concepto.trim() || null,
    }

    const { error: saveError } = await supabase.from('ingresos').insert(payload)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setDialog(null)
    setIngresoForm(emptyIngresoForm)
    loadAll()
  }

  async function handleSubmitGasto(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      fecha: gastoForm.fecha,
      categoria: gastoForm.categoria.trim() || null,
      monto: Number(gastoForm.monto),
      descripcion: gastoForm.descripcion.trim() || null,
      proveedor: gastoForm.proveedor.trim() || null,
    }

    const { error: saveError } = await supabase.from('gastos').insert(payload)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setDialog(null)
    setGastoForm(emptyGastoForm)
    loadAll()
  }

  const incomeTotal = ingresos.reduce((sum, i) => sum + Number(i.monto), 0)
  const expenseTotal = gastos.reduce((sum, g) => sum + Number(g.monto), 0)

  const transactions = [
    ...ingresos.map((i) => ({
      id: `ing-${i.id}`,
      desc: i.concepto || i.citas?.clientas?.nombre || 'Ingreso',
      fecha: i.fecha,
      amount: Number(i.monto),
      type: 'ingreso',
    })),
    ...gastos.map((g) => ({
      id: `gas-${g.id}`,
      desc: g.descripcion || g.categoria || 'Gasto',
      fecha: g.fecha,
      amount: Number(g.monto),
      type: 'gasto',
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="page">
      <h3>Finanzas</h3>

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <div className="stat-card" style={{ background: 'var(--color-accent-100)' }}>
          <div className="stat-label" style={{ color: 'var(--color-accent-800)' }}>
            Ingresos
          </div>
          <div className="stat-value" style={{ color: 'var(--color-accent-800)' }}>
            {fmtMoney(incomeTotal)}
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-accent-2-100)' }}>
          <div className="stat-label" style={{ color: 'var(--color-accent-2-800)' }}>
            Gastos
          </div>
          <div className="stat-value" style={{ color: 'var(--color-accent-2-800)' }}>
            {fmtMoney(expenseTotal)}
          </div>
        </div>
      </div>

      {pendingDeposits.length > 0 && (
        <>
          <h6 style={{ color: 'var(--color-accent-700)' }}>Abonos pendientes</h6>
          <div className="card-list" style={{ marginBottom: 24 }}>
            {pendingDeposits.map((p) => (
              <div key={p.citaId} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.clientName}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {p.serviceName} · {fmtMoney(p.monto)}
                  </div>
                </div>
                <button type="button" className="btn-fab" onClick={() => handleCobrar(p)}>
                  Cobrar
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="page-header" style={{ marginBottom: 10 }}>
        <h6 style={{ color: 'var(--color-accent-700)', margin: 0 }}>Movimientos</h6>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn-fab" onClick={() => setDialog('ingreso')}>
            + Ingreso
          </button>
          <button type="button" className="btn-fab" onClick={() => setDialog('gasto')}>
            + Gasto
          </button>
        </div>
      </div>

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : transactions.length === 0 ? (
        <p className="empty">Aún no hay movimientos registrados.</p>
      ) : (
        <table className="table-simple">
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{tx.desc}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.6 }}>{fmtDateShort(tx.fecha)}</div>
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: tx.type === 'ingreso' ? 'var(--color-accent-700)' : 'var(--color-accent-2-700)',
                  }}
                >
                  {tx.type === 'ingreso' ? '+' : '-'}
                  {fmtMoney(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dialog === 'ingreso' && (
        <div className="dialog-backdrop" onClick={() => setDialog(null)}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitIngreso}>
            <h4 className="dialog-title">Nuevo ingreso</h4>

            <div className="field">
              <label htmlFor="monto">Monto *</label>
              <input
                id="monto"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={ingresoForm.monto}
                onChange={(e) => setIngresoForm({ ...ingresoForm, monto: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="fecha">Fecha *</label>
              <input
                id="fecha"
                type="date"
                className="input"
                value={ingresoForm.fecha}
                onChange={(e) => setIngresoForm({ ...ingresoForm, fecha: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="metodo_pago">Método de pago</label>
              <input
                id="metodo_pago"
                className="input"
                placeholder="Efectivo, tarjeta, transferencia…"
                value={ingresoForm.metodo_pago}
                onChange={(e) => setIngresoForm({ ...ingresoForm, metodo_pago: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="concepto">Concepto</label>
              <input
                id="concepto"
                className="input"
                placeholder="ej. Venta de producto, servicio adicional…"
                value={ingresoForm.concepto}
                onChange={(e) => setIngresoForm({ ...ingresoForm, concepto: e.target.value })}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {dialog === 'gasto' && (
        <div className="dialog-backdrop" onClick={() => setDialog(null)}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitGasto}>
            <h4 className="dialog-title">Nuevo gasto</h4>

            <div className="field">
              <label htmlFor="g_fecha">Fecha *</label>
              <input
                id="g_fecha"
                type="date"
                className="input"
                value={gastoForm.fecha}
                onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="categoria">Categoría</label>
              <input
                id="categoria"
                className="input"
                placeholder="ej. Insumos, renta, transporte…"
                value={gastoForm.categoria}
                onChange={(e) => setGastoForm({ ...gastoForm, categoria: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="g_monto">Monto *</label>
              <input
                id="g_monto"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={gastoForm.monto}
                onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="proveedor">Proveedor</label>
              <input
                id="proveedor"
                className="input"
                value={gastoForm.proveedor}
                onChange={(e) => setGastoForm({ ...gastoForm, proveedor: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                className="input"
                rows={2}
                value={gastoForm.descripcion}
                onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
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
