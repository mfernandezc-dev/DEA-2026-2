import { useCallback } from 'react'
import productService from '../../services/productService.js'
import categoryService from '../../services/categoryService.js'
import { getAllPages } from '../../services/getAllPages.js'
import useStoreResource from '../../hooks/useStoreResource.js'
import ProductForm from '../../components/ProductForm/ProductForm.jsx'
import LoadingState from '../../components/LoadingState/LoadingState.jsx'
import ErrorState from '../../components/ErrorState/ErrorState.jsx'
import { Link } from '../../components/Router/Router.jsx'

export default function EditProductPage({ id }) {
  const load = useCallback(async signal => {
    const [product, categories] = await Promise.all([productService.getById(id, { signal }), getAllPages(categoryService, { signal })])
    return { product, categories }
  }, [id])
  const resource = useStoreResource(load)
  return <section className="ts-editor"><Link className="ts-back" href="/">← Volver al catálogo</Link><p className="ts-eyebrow">GESTIONA TU CATÁLOGO</p><h1>Editar producto<span>.</span></h1><p className="ts-page-description">Actualiza sus detalles. Conserva lo que ya funciona.</p>{resource.status === 'loading' ? <LoadingState message="Cargando producto…" /> : resource.status === 'error' ? <ErrorState onRetry={resource.retry} notFound={resource.error.response?.status === 404} /> : <ProductForm product={resource.data.product} categories={resource.data.categories} />}</section>
}
