import { Link } from '../Router/Router.jsx'

export default function StoreFooter() {
  return <footer className="ts-footer"><div className="ts-container"><div><strong>TechStore<span> ↗</span></strong><p>Tu próximo equipo empieza aquí.</p></div><p>Laboratorio 13 · React + Django<br />Demostración local, no tienda comercial.</p><Link href="/quiz">Explorar la aplicación heredada →</Link></div></footer>
}
