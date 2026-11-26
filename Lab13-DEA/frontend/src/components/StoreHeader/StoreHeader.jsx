import { Link } from '../Router/Router.jsx'

export default function StoreHeader({ path }) {
  return <>
    <div className="ts-topbar">Tecnología para tu día a día <span>Proyecto académico · DEA 2026</span></div>
    <header className="ts-header">
      <div className="ts-container ts-navigation">
        <Link href="/" className="ts-brand" aria-label="TechStore, inicio"><span className="ts-logo" aria-hidden="true">T<span>↗</span></span><span>Tech<span>Store</span><small>TECNOLOGÍA A TU ALCANCE</small></span></Link>
        <nav aria-label="Navegación principal de TechStore">
          <Link href="/" aria-current={path === '/' || path === '/catalog' ? 'page' : undefined}>Catálogo</Link>
          <Link href="/quiz">Quiz y cine ↗</Link>
          <Link href="/products/new" className="ts-button ts-primary" aria-current={path === '/products/new' ? 'page' : undefined}><span aria-hidden="true">＋</span> Nuevo producto</Link>
        </nav>
      </div>
    </header>
  </>
}
