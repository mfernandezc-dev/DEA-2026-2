import ProductCard from '../ProductCard/ProductCard.jsx'

export default function ProductGrid({ products, onDelete }) {
  return <div className="ts-product-grid">{products.map(product => <ProductCard key={product.id} product={product} onDelete={onDelete} />)}</div>
}
