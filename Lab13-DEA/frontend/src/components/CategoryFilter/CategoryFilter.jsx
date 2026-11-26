export default function CategoryFilter({ categories, activeId, onChange, products }) {
  return <div className="ts-category-filter" role="group" aria-label="Filtrar por categoría">
    <button aria-pressed={!activeId} onClick={() => onChange('')}>Todos <span>{products.length}</span></button>
    {categories.map(category => <button key={category.id} aria-pressed={String(activeId) === String(category.id)} onClick={() => onChange(String(category.id))}>{category.name} <span>{products.filter(product => product.category.id === category.id).length}</span></button>)}
  </div>
}
