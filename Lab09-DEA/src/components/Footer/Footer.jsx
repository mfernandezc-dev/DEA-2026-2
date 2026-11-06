function Footer() {
  return (
    <footer className="site-footer" id="contacto">
      <div className="container footer-content">
        <div className="footer-about">
          <p className="footer-brand">CINE LUMIÈRE<span aria-hidden="true">.</span></p>
          <p>Grandes historias. Un lugar para vivirlas.</p>
          <p className="footer-note">Cartelera ficticia · Proyecto académico TECSUP</p>
        </div>
        <div className="footer-contact">
          <h2>Encuéntranos</h2>
          <address>
            Av. del Cine 109, Lima, Perú<br />
            contacto@lumiere.example<br />
            Tel. (01) 000-0109
          </address>
          <p className="footer-note">Dirección y datos de contacto ficticios.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© 2026 Cine Lumière · Demostración educativa</p>
        <p>Laboratorio 09 · React + Vite</p>
      </div>
    </footer>
  )
}

export default Footer
