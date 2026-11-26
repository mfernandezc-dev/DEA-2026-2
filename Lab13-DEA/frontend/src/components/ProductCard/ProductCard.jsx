import { Link } from '../Router/Router.jsx'
import { pen } from '../../utils/catalog.js'

export default function ProductCard({ product, onDelete }) {
  return <article className="ts-product-card" data-product-id={product.id} aria-labelledby={`product-${product.id}`}>
    <div className="ts-product-image"><span className={`ts-availability ${product.stock === 0 ? 'ts-sold-out' : ''}`}>{product.stock > 0 ? '● Disponible' : 'Agotado'}</span><img src={product.image || '/product-placeholder.svg'} alt={product.name} loading="lazy" width="900" height="600" onError={event => {
      if (!event.currentTarget.src.endsWith('/product-placeholder.svg')) event.currentTarget.src = '/product-placeholder.svg'
    }} /></div>
    <div className="ts-product-details"><span className="ts-category-label">{product.category.name}</span><h3 id={`product-${product.id}`}>{product.name}</h3><p className="ts-description">{product.description}</p><div className="ts-price-row"><strong>{pen.format(Number(product.price))}</strong><span>{product.stock} en stock</span></div><div className="ts-card-actions"><Link className="ts-button ts-secondary" href={`/products/${product.id}/edit`} aria-label={`Editar ${product.name}`}>Editar <span aria-hidden="true">↗</span></Link><button className="ts-button ts-delete" onClick={() => onDelete(product)} aria-label={`Eliminar ${product.name}`}>Eliminar</button></div></div>
  </article>
}
