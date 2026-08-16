import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, initials, fmtDateShort, toLocalDateString, whatsappLink } from '../lib/format'

const emptyForm = { nombre: '', telefono: '', email: '', redes_sociales: '', notas: '' }

export function ClientasPage() {
  const [clientas, setClientas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadClientas() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('clientas')
      .select('*')
      .order('nombre', { ascending: true })

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

  async function openDetail(clienta) {
    setSelectedId(clienta.id)
    setDetailLoading(true)

    const { data: citas } = await supabase
      .from('citas')
      .select('id, fecha_hora, estatus, cita_servicios(servicios(nombre, precio_base))')
      .eq('clienta_id', clienta.id)
      .order('fecha_hora', { ascending: false })

    const activeCitas = (citas ?? []).filter((c) => c.estatus !== 'Cancelada')
    const history = activeCitas.map((c) => {
      const total = c.cita_servicios.reduce((sum, cs) => sum + Number(cs.servicios?.precio_base ?? 0), 0)
      const nombres = c.cita_servicios.map((cs) => cs.servicios?.nombre).filter(Boolean).join(', ')
      return { id: c.id, dateLabel: fmtDateShort(toLocalDateString(c.fecha_hora)), serviceName: nombres || 'Sin servicios', total }
    })
    const totalGastado = history.reduce((sum, h) => sum + h.total, 0)
    const lastVisit = activeCitas[0] ? toLocalDateString(activeCitas[0].fecha_hora) : null

    setDetail({ clienta, history, totalGastado, lastVisit })
    setDetailLoading(false)
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
  }

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
    if (editingId && editingId === selectedId) {
      openDetail({ id: selectedId, ...payload })
    }
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

    if (selectedId === clienta.id) closeDetail()
    loadClientas()
  }

  const filteredClientas = clientas.filter((c) => c.nombre.toLowerCase().includes(search.trim().toLowerCase()))

  if (selectedId && detail) {
    const { clienta, history, totalGastado, lastVisit } = detail
    return (
      <div className="page">
        <button type="button" className="btn-fab" onClick={closeDetail}>
          ← Clientas
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 16px' }}>
          <div className="avatar avatar-lg">{initials(clienta.nombre)}</div>
          <div>
            <h4 style={{ margin: 0 }}>{clienta.nombre}</h4>
            <div style={{ fontSize: 13, opacity: 0.65 }}>{clienta.telefono || 'Sin teléfono'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <a className="btn btn-secondary" style={{ flex: 1 }} href={clienta.telefono ? `tel:${clienta.telefono}` : undefined}>
            Llamar
          </a>
          <a
            className="btn btn-primary"
            style={{ flex: 1 }}
            href={whatsappLink(clienta.telefono, `Hola ${clienta.nombre.split(' ')[0]}, te escribo de tu maquillista.`)}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <div className="stat-card card">
            <div className="stat-label">Total gastado</div>
            <div className="stat-value">{fmtMoney(totalGastado)}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-label">Última visita</div>
            <div className="stat-value">{fmtDateShort(lastVisit)}</div>
          </div>
        </div>

        <h6 style={{ color: 'var(--color-accent-700)' }}>Notas</h6>
        <div className="card" style={{ marginBottom: 22, fontSize: 13.5 }}>
          {clienta.notas || 'Sin notas registradas.'}
        </div>

        <h6 style={{ color: 'var(--color-accent-700)' }}>Historial</h6>
        {detailLoading ? (
          <p className="loading">Cargando…</p>
        ) : history.length === 0 ? (
          <p className="empty">Sin citas anteriores</p>
        ) : (
          <table className="table-simple">
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{h.serviceName}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.6 }}>{h.dateLabel}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(h.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="form-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={() => openEditForm(clienta)}>
            Editar
          </button>
          <button type="button" className="btn btn-ghost danger" onClick={() => handleDelete(clienta)}>
            Eliminar
          </button>
        </div>

        {formOpen && (
          <ClientaFormDialog
            form={form}
            setForm={setForm}
            editingId={editingId}
            saving={saving}
            error={error}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3 style={{ margin: 0 }}>Clientas</h3>
        <button type="button" className="btn-fab" onClick={openCreateForm}>
          + Nueva
        </button>
      </div>

      <input
        className="input search-input"
        placeholder="Buscar clienta"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando…</p>
      ) : filteredClientas.length === 0 ? (
        <p className="empty">Aún no hay clientas registradas.</p>
      ) : (
        <div className="card-list">
          {filteredClientas.map((clienta) => (
            <div key={clienta.id} className="card-row" onClick={() => openDetail(clienta)}>
              <div className="avatar">{initials(clienta.nombre)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{clienta.nombre}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{clienta.telefono || 'Sin teléfono'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ClientaFormDialog
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}
    </div>
  )
}

function ClientaFormDialog({ form, setForm, editingId, saving, error, onSubmit, onClose }) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h4 className="dialog-title">{editingId ? 'Editar clienta' : 'Nueva clienta'}</h4>

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
          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            className="input"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="redes_sociales">Redes sociales</label>
          <input
            id="redes_sociales"
            className="input"
            value={form.redes_sociales}
            onChange={(e) => setForm({ ...form, redes_sociales: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="notas">Notas / preferencias</label>
          <textarea
            id="notas"
            className="input"
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
