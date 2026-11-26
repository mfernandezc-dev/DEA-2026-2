import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import productService from '../../services/productService.js'
import categoryService from '../../services/categoryService.js'
import { getAllPages } from '../../services/getAllPages.js'
import useStoreResource from '../../hooks/useStoreResource.js'
import { filterProducts } from '../../utils/catalog.js'
import ProductGrid from '../../components/ProductGrid/ProductGrid.jsx'
import CategoryFilter from '../../components/CategoryFilter/CategoryFilter.jsx'
import LoadingState from '../../components/LoadingState/LoadingState.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import { Link } from '../../components/Router/Router.jsx'

export default function CatalogPage() {
  const load = useCallback(async signal => {
    const [products, categories] = await Promise.all([getAllPages(productService, { signal }), getAllPages(categoryService, { signal })])
    return { products, categories }
  }, [])
  const resource = useStoreResource(load)
  const [categoryId, setCategoryId] = useState('')
  const [query, setQuery] = useState('')
  const [deletedIds, setDeletedIds] = useState([])
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const lock = useRef(false)
  const products = (resource.data?.products || []).filter(product => !deletedIds.includes(product.id))
  const visible = filterProducts(products, categoryId, query)
  const reset = () => { setCategoryId(''); setQuery('') }

  async function confirmDelete() {
    if (lock.current) return
    lock.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      await productService.remove(selected.id)
      setDeletedIds(ids => [...ids, selected.id])
      setSelected(null)
      toast.success('Producto eliminado correctamente.', { id: 'product-feedback' })
      document.querySelector('#catalog-title')?.focus()
    } catch {
      setDeleteError('No se pudo eliminar el producto. Se conserva en el catálogo; puedes reintentar.')
    } finally { lock.current = false; setDeleting(false) }
  }

  return <>
    <section className="ts-intro"><div><p className="ts-eyebrow">EQUIPA TUS IDEAS</p><h1 id="catalog-title" tabIndex={-1}>Tecnología que<br /><span>va contigo.</span></h1><p>Encuentra el equipo ideal para estudiar, trabajar y crear.<br className="ts-desktop-break" /> Explora nuestro catálogo de tecnología.</p><a href="#catalog-results" className="ts-intro-link">Explorar productos <span aria-hidden="true">↓</span></a></div><div className="ts-intro-panel"><span className="ts-panel-icon" aria-hidden="true">⌘</span><span>ELIGE. CREA. CONECTA.</span><strong>Tu siguiente<br />gran idea.</strong><p>Las herramientas para hacerla realidad.</p></div></section>
    <div className="ts-stats" aria-label="Resumen del catálogo"><div><strong>{resource.status === 'success' ? products.length : '—'}</strong><span>productos en catálogo</span></div><div><strong>{resource.status === 'success' ? resource.data.categories.length : '—'}</strong><span>categorías para explorar</span></div><div><strong>{resource.status === 'success' ? products.filter(product => product.stock > 0).length : '—'}</strong><span>productos disponibles</span></div><div className="ts-local-note"><span aria-hidden="true">✓</span> Información actualizada<br />directamente desde el catálogo</div></div>
    <section id="catalog-results" aria-labelledby="catalog-heading" className="ts-catalog" data-status={resource.status}>
      <div className="ts-section-heading"><div><p className="ts-eyebrow">EXPLORA TECHSTORE</p><h2 id="catalog-heading">Nuestro catálogo<span>.</span></h2></div><span>Precios en soles · PEN</span></div>
      {resource.status === 'loading' && <LoadingState />}
      {resource.status === 'error' && <ErrorState onRetry={resource.retry} />}
      {resource.status === 'success' && <>
        <div className="ts-toolbar"><CategoryFilter categories={resource.data.categories} activeId={categoryId} onChange={setCategoryId} products={products} /><div className="ts-search"><label htmlFor="product-search">Buscar productos</label><input id="product-search" type="search" placeholder="Nombre o descripción…" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
        <div className="ts-results-meta"><p role="status" aria-live="polite">Mostrando <strong>{visible.length}</strong> de {products.length} productos</p>{(categoryId || query) && <button className="ts-text-button" onClick={reset}>Limpiar filtros ×</button>}</div>
        {visible.length ? <ProductGrid products={visible} onDelete={product => { setDeleteError(''); setSelected(product) }} /> : <EmptyState description={products.length ? 'No hay productos para esta selección. Prueba otra categoría o búsqueda.' : 'El catálogo aún no tiene productos. Registra el primero.'}>{products.length ? <button className="ts-button ts-secondary" onClick={reset}>Ver todos los productos</button> : <Link className="ts-button ts-primary" href="/products/new">Nuevo producto</Link>}</EmptyState>}
      </>}
    </section>
    {selected && <ConfirmDialog product={selected} busy={deleting} error={deleteError} onCancel={() => setSelected(null)} onConfirm={confirmDelete} />}
  </>
}
