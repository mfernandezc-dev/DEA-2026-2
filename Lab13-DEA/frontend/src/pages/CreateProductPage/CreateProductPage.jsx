import { useCallback } from 'react'
import categoryService from '../../services/categoryService.js'
import { getAllPages } from '../../services/getAllPages.js'
import useStoreResource from '../../hooks/useStoreResource.js'
import ProductForm from '../../components/ProductForm/ProductForm.jsx'
import LoadingState from '../../components/LoadingState/LoadingState.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import { Link } from '../../components/Router/Router.jsx'

export default function CreateProductPage() {
  const load = useCallback(signal => getAllPages(categoryService, { signal }), [])
  const resource = useStoreResource(load)
  return <section className="ts-editor"><Link className="ts-back" href="/">← Volver al catálogo</Link><p className="ts-eyebrow">GESTIONA TU CATÁLOGO</p><h1>Nuevo producto<span>.</span></h1><p className="ts-page-description">Añade tecnología y nuevas posibilidades a TechStore.</p>{resource.status === 'loading' ? <LoadingState message="Cargando categorías…" /> : resource.status === 'error' ? <ErrorState onRetry={resource.retry} /> : <ProductForm categories={resource.data} />}</section>
}
