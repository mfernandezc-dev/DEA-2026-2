import Button from '../Button/Button.jsx'
import MovieSearch from '../MovieSearch/MovieSearch.jsx'

function Hero({ movie, onSearchChange }) {
  return (
    <section className="hero" aria-labelledby="featured-title">
      <img className="hero-image" src={movie.banner} alt={`Escena de ${movie.title}`} fetchPriority="high" />
      <div className="container hero-content">
        <p className="eyebrow"><span className="accent-line" aria-hidden="true" />Película destacada</p>
        <h1 id="featured-title">{movie.title}</h1>
        <div className="movie-meta">
          <span className="classification">{movie.classification}</span>
          <span>{movie.genre}</span>
          <span className="rating"><span aria-hidden="true">★</span> {movie.rating.toFixed(1)} <span className="rating-scale">/ 5</span></span>
        </div>
        <p className="hero-synopsis">{movie.synopsis}</p>
        <Button className="hero-link" variant="primary" href="#cartelera">Explorar cartelera <span aria-hidden="true">↗</span></Button>
        <MovieSearch onSearchChange={onSearchChange} />
        <p className="hero-footnote">Una nueva historia te espera en la pantalla grande.</p>
      </div>
      <span className="hero-caption" aria-hidden="true">LUMIÈRE SELECTION / 01</span>
    </section>
  )
}

export default Hero
