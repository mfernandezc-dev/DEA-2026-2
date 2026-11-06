function Header() {
  return (
    <header className="site-header" id="inicio">
      <div className="container header-content">
        <a className="brand" href="#inicio" aria-label="Cine Lumière, inicio">
          <span className="brand-mark" aria-hidden="true">L.</span>
          <span>LUMIÈRE<span className="brand-caption">UN LUGAR PARA EL CINE</span></span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#inicio">Inicio</a>
          <a href="#cartelera">Cartelera</a>
          <a href="#contacto">Contacto</a>
        </nav>
      </div>
    </header>
  )
}

export default Header
