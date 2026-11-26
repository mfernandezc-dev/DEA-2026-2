export default function EmptyState({ title = 'No encontramos productos', description = 'Prueba otra categoría o cambia tu búsqueda.', children }) {
  return <section className="ts-state" data-state="empty"><span className="ts-state-icon" aria-hidden="true">⌕</span><h2>{title}</h2><p>{description}</p>{children}</section>
}
