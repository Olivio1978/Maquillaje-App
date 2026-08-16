import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, fmtDateShort, todayDateString } from '../lib/format'

const ESTADO_OPTIONS = ['En prueba', 'Funcionó', 'No funcionó']

const emptyCompraForm = { producto_id: '', proveedor: '', fecha: todayDateString(), cantidad: '', costo_unitario: '' }
const emptyNuevoProducto = { nombre: '', marca: '', presentacion: '' }
const emptyProductoForm = {
  nombre: '',
  marca: '',
  presentacion: '',
  estado_desempeno: 'En prueba',
  motivo: '',
  notas: '',
}

export function ComprasPage() {
  const [tab, setTab] = useState('compras')
  const [compras, setCompras] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [compraDialogOpen, setCompraDialogOpen] = useState(false)
  const [compraForm, setCompraForm] = useState(emptyCompraForm)
  const [addingNewProducto, setAddingNewProducto] = useState(false)
  const [nuevoProducto, setNuevoProducto] = useState(emptyNuevoProducto)

  const [productoDialogOpen, setProductoDialogOpen] = useState(false)
  const [editingProductoId, setEditingProductoId] = useState(null)
  const [productoForm, setProductoForm] = useState(emptyProductoForm)

  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [comprasRes, productosRes] = await Promise.all([
      supabase.from('compras').select('*, productos(id, nombre)').order('fecha', { ascending: false }),
      supabase.from('productos').select('*').order('nombre'),
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

  function openCompraForm() {
    setCompraForm(emptyCompraForm)
    setAddingNewProducto(productos.length === 0)
    setNuevoProducto(emptyNuevoProducto)
    setCompraDialogOpen(true)
  }

  function closeCompraForm() {
    setCompraDialogOpen(false)
  }

  async function handleSubmitCompra(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    let productoId = compraForm.producto_id

    if (addingNewProducto) {
      const { data, error: prodError } = await supabase
        .from('productos')
        .insert({
          nombre: nuevoProducto.nombre.trim(),
          marca: nuevoProducto.marca.trim() || null,
          presentacion: nuevoProducto.presentacion.trim() || null,
        })
        .select('id')
        .single()

      if (prodError) {
        setSaving(false)
        setError(prodError.message)
        return
      }
      productoId = data.id
    }

    const payload = {
      producto_id: productoId,
      proveedor: compraForm.proveedor.trim() || null,
      fecha: compraForm.fecha,
      cantidad: Number(compraForm.cantidad),
      costo_unitario: Number(compraForm.costo_unitario),
    }

    const { error: saveError } = await supabase.from('compras').insert(payload)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    closeCompraForm()
    loadAll()
  }

  async function handleDeleteCompra(compra) {
    const nombre = compra.productos?.nombre ?? 'este producto'
    if (!window.confirm(`¿Eliminar la compra de "${nombre}"? Esta acción no se puede deshacer.`)) return

    const { error: deleteError } = await supabase.from('compras').delete().eq('id', compra.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    loadAll()
  }

  function openCreateProducto() {
    setEditingProductoId(null)
    setProductoForm(emptyProductoForm)
    setProductoDialogOpen(true)
  }

  function openEditProducto(producto) {
    setEditingProductoId(producto.id)
    setProductoForm({
      nombre: producto.nombre ?? '',
      marca: producto.marca ?? '',
      presentacion: producto.presentacion ?? '',
      estado_desempeno: producto.estado_desempeno ?? 'En prueba',
      motivo: producto.motivo ?? '',
      notas: producto.notas ?? '',
    })
    setProductoDialogOpen(true)
  }

  async function handleSubmitProducto(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      nombre: productoForm.nombre.trim(),
      marca: productoForm.marca.trim() || null,
      presentacion: productoForm.presentacion.trim() || null,
      estado_desempeno: productoForm.estado_desempeno,
      motivo: productoForm.estado_desempeno === 'No funcionó' ? productoForm.motivo.trim() || null : null,
      notas: productoForm.notas.trim() || null,
    }

    const { error: saveError } = editingProductoId
      ? await supabase.from('productos').update(payload).eq('id', editingProductoId)
      : await supabase.from('productos').insert(payload)

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setProductoDialogOpen(false)
    loadAll()
  }

  async function handleDeleteProducto() {
    if (!editingProductoId) return
    if (!window.confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return

    const { error: deleteError } = await supabase.from('productos').delete().eq('id', editingProductoId)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setProductoDialogOpen(false)
    loadAll()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3 style={{ margin: 0 }}>Compras</h3>
        {tab === 'compras' ? (
          <button type="button" className="btn-fab" onClick={openCompraForm}>
            + Nueva
          </button>
        ) : (
          <button type="button" className="btn-fab" onClick={openCreateProducto}>
            + Nuevo
          </button>
        )}
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'compras' ? 'active' : ''} onClick={() => setTab('compras')}>
          Compras
        </button>
        <button type="button" className={tab === 'productos' ? 'active' : ''} onClick={() => setTab('productos')}>
          Catálogo de productos
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {tab === 'compras' &&
        (loading ? (
          <p className="loading">Cargando…</p>
        ) : compras.length === 0 ? (
          <p className="empty">Aún no hay compras registradas.</p>
        ) : (
          <div className="card-list">
            {compras.map((compra) => (
              <div key={compra.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{compra.productos?.nombre ?? '—'}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)' }}>
                    {fmtMoney(compra.costo_total)}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {compra.proveedor || 'Proveedor no especificado'} · {fmtDateShort(compra.fecha)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {compra.cantidad} × {fmtMoney(compra.costo_unitario)}
                </div>
                <div className="row-actions">
                  <button type="button" className="btn btn-ghost danger" onClick={() => handleDeleteCompra(compra)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === 'productos' &&
        (loading ? (
          <p className="loading">Cargando…</p>
        ) : productos.length === 0 ? (
          <p className="empty">Aún no hay productos en el catálogo.</p>
        ) : (
          <div className="card-list">
            {productos.map((producto) => (
              <div key={producto.id} className="card-row" onClick={() => openEditProducto(producto)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{producto.nombre}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {[producto.marca, producto.presentacion].filter(Boolean).join(' · ') || 'Sin detalles'}
                  </div>
                </div>
                <span
                  className={
                    producto.estado_desempeno === 'Funcionó'
                      ? 'tag tag-success'
                      : producto.estado_desempeno === 'No funcionó'
                        ? 'tag tag-danger'
                        : 'tag tag-neutral'
                  }
                >
                  {producto.estado_desempeno}
                </span>
              </div>
            ))}
          </div>
        ))}

      {compraDialogOpen && (
        <div className="dialog-backdrop" onClick={closeCompraForm}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitCompra}>
            <h4 className="dialog-title">Nueva compra</h4>

            {!addingNewProducto ? (
              <div className="field">
                <label htmlFor="producto_id">Producto *</label>
                <select
                  id="producto_id"
                  className="input"
                  value={compraForm.producto_id}
                  onChange={(e) => setCompraForm({ ...compraForm, producto_id: e.target.value })}
                  required={!addingNewProducto}
                >
                  <option value="" disabled>
                    Selecciona un producto
                  </option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-fab"
                  style={{ marginTop: 8 }}
                  onClick={() => setAddingNewProducto(true)}
                >
                  + Registrar producto nuevo
                </button>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="np_nombre">Nombre del producto *</label>
                  <input
                    id="np_nombre"
                    className="input"
                    value={nuevoProducto.nombre}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="np_marca">Marca</label>
                  <input
                    id="np_marca"
                    className="input"
                    value={nuevoProducto.marca}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, marca: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="np_presentacion">Presentación / tamaño</label>
                  <input
                    id="np_presentacion"
                    className="input"
                    placeholder='ej. "30 ml", "paleta 12 tonos"'
                    value={nuevoProducto.presentacion}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, presentacion: e.target.value })}
                  />
                </div>
                {productos.length > 0 && (
                  <button type="button" className="btn-fab" style={{ marginBottom: 8 }} onClick={() => setAddingNewProducto(false)}>
                    ← Elegir producto existente
                  </button>
                )}
              </>
            )}

            <div className="field">
              <label htmlFor="proveedor">Proveedor</label>
              <input
                id="proveedor"
                className="input"
                value={compraForm.proveedor}
                onChange={(e) => setCompraForm({ ...compraForm, proveedor: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="fecha">Fecha *</label>
              <input
                id="fecha"
                type="date"
                className="input"
                value={compraForm.fecha}
                onChange={(e) => setCompraForm({ ...compraForm, fecha: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="cantidad">Cantidad *</label>
              <input
                id="cantidad"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={compraForm.cantidad}
                onChange={(e) => setCompraForm({ ...compraForm, cantidad: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="costo_unitario">Costo unitario *</label>
              <input
                id="costo_unitario"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={compraForm.costo_unitario}
                onChange={(e) => setCompraForm({ ...compraForm, costo_unitario: e.target.value })}
                required
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={closeCompraForm}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {productoDialogOpen && (
        <div className="dialog-backdrop" onClick={() => setProductoDialogOpen(false)}>
          <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitProducto}>
            <h4 className="dialog-title">{editingProductoId ? 'Editar producto' : 'Nuevo producto'}</h4>

            <div className="field">
              <label htmlFor="p_nombre">Nombre *</label>
              <input
                id="p_nombre"
                className="input"
                value={productoForm.nombre}
                onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="p_marca">Marca</label>
              <input
                id="p_marca"
                className="input"
                value={productoForm.marca}
                onChange={(e) => setProductoForm({ ...productoForm, marca: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="p_presentacion">Presentación / tamaño</label>
              <input
                id="p_presentacion"
                className="input"
                value={productoForm.presentacion}
                onChange={(e) => setProductoForm({ ...productoForm, presentacion: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="p_estado">Estado de desempeño</label>
              <select
                id="p_estado"
                className="input"
                value={productoForm.estado_desempeno}
                onChange={(e) => setProductoForm({ ...productoForm, estado_desempeno: e.target.value })}
              >
                {ESTADO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {productoForm.estado_desempeno === 'No funcionó' && (
              <div className="field">
                <label htmlFor="p_motivo">Motivo (para no repetir la compra)</label>
                <textarea
                  id="p_motivo"
                  className="input"
                  rows={2}
                  value={productoForm.motivo}
                  onChange={(e) => setProductoForm({ ...productoForm, motivo: e.target.value })}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="p_notas">Notas de durabilidad / observaciones</label>
              <textarea
                id="p_notas"
                className="input"
                rows={3}
                value={productoForm.notas}
                onChange={(e) => setProductoForm({ ...productoForm, notas: e.target.value })}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="dialog-actions">
              {editingProductoId && (
                <button type="button" className="btn btn-ghost danger" onClick={handleDeleteProducto} style={{ marginRight: 'auto' }}>
                  Eliminar
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setProductoDialogOpen(false)}>
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
