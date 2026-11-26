import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import LegacyApp from './LegacyApp.jsx'
import { Link } from './components/Router/Router.jsx'
import { usePathname } from './components/Router/navigation.js'
import StoreHeader from './components/StoreHeader/StoreHeader.jsx'
import StoreFooter from './components/StoreFooter/StoreFooter.jsx'
import CatalogPage from './pages/CatalogPage/CatalogPage.jsx'
import CreateProductPage from './pages/CreateProductPage/CreateProductPage.jsx'
import EditProductPage from './pages/EditProductPage/EditProductPage.jsx'
import EmptyState from './components/EmptyState/EmptyState.jsx'
import './styles/techstore.css'

export default function App() {
  const path = usePathname()
  const edit = path.match(/^\/products\/([1-9]\d*)\/edit\/?$/)
  const legacy = path === '/quiz' || path === '/quiz/'
  useEffect(() => {
    document.title = legacy ? 'Quiz y Cine Lumière | TechStore' : 'TechStore | Catálogo tecnológico'
    window.scrollTo(0, 0)
    const main = document.querySelector('main')
    main?.setAttribute('tabindex', '-1')
    main?.focus({ preventScroll: true })
  }, [path, legacy])

  if (legacy) return <><div className="legacy-return"><Link href="/">← Volver a TechStore</Link></div><LegacyApp /></>
  let page
  if (path === '/' || path === '/catalog') page = <CatalogPage />
  else if (path === '/products/new') page = <CreateProductPage />
  else if (edit) page = <EditProductPage key={edit[1]} id={edit[1]} />
  else page = <EmptyState title="Página no encontrada" description="La dirección que buscas no existe."><Link className="ts-button ts-primary" href="/">Volver al catálogo</Link></EmptyState>

  return <div className="techstore">
    <a className="ts-skip" href="#store-main">Saltar al contenido</a>
    <StoreHeader path={path} />
    <main id="store-main" className="ts-container ts-main" tabIndex={-1}>{page}</main>
    <StoreFooter />
    <Toaster position="bottom-center" toastOptions={{ duration: 3500, ariaProps: { role: 'status', 'aria-live': 'polite' } }} />
  </div>
}
