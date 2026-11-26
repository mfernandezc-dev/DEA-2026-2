import { useId, useRef, useState } from 'react'
import Button from '../Button/Button.jsx'
import useWindowSize from '../../hooks/useWindowSize.js'

function PremieresCarousel({ movies }) {
  const trackId = useId()
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { width } = useWindowSize()
  const visibleCount = Math.min(width < 600 ? 1 : width < 900 ? 2 : 3, Math.max(1, movies.length))
  const lastIndex = Math.max(0, movies.length - visibleCount)
  const currentIndex = Math.min(activeIndex, lastIndex)

  function moveTo(index) {
    const nextIndex = Math.max(0, Math.min(index, lastIndex))
    const track = trackRef.current
    if (!track?.children[nextIndex]) return

    track.scrollTo({
      left: track.children[nextIndex].offsetLeft - track.children[0].offsetLeft,
      behavior: 'instant',
    })
    setActiveIndex(nextIndex)
  }

  function handleScroll() {
    const track = trackRef.current
    if (track.children.length < 2) return

    const step = track.children[1].offsetLeft - track.children[0].offsetLeft
    const nextIndex = Math.max(0, Math.min(Math.round(track.scrollLeft / step), lastIndex))
    setActiveIndex((current) => current === nextIndex ? current : nextIndex)
  }

  function handleKeyDown(event) {
    const destinations = {
      ArrowLeft: currentIndex - 1,
      ArrowRight: currentIndex + 1,
      Home: 0,
      End: lastIndex,
    }
    if (!(event.key in destinations)) return

    event.preventDefault()
    moveTo(destinations[event.key])
  }

  if (movies.length === 0) {
    return <p role="status">No hay estrenos disponibles.</p>
  }

  return (
    <div className="premieres-carousel" role="region" aria-roledescription="carrusel" aria-label="Películas de estreno">
      <div className="premieres-toolbar">
        <p className="premieres-progress" role="status" aria-live="polite" aria-atomic="true">
          Estrenos {currentIndex + 1}–{Math.min(currentIndex + visibleCount, movies.length)} de {movies.length}
        </p>
        <div className="premieres-controls" role="group" aria-label="Navegar por los estrenos">
          <Button className="premieres-previous" variant="secondary" aria-label="Ver estrenos anteriores" aria-controls={trackId} disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}>
            <span aria-hidden="true">←</span> Anterior
          </Button>
          <Button className="premieres-next" variant="secondary" aria-label="Ver estrenos siguientes" aria-controls={trackId} disabled={currentIndex === lastIndex} onClick={() => moveTo(currentIndex + 1)}>
            Siguiente <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
      <p className="premieres-help" id={`${trackId}-help`}>Usa los botones, las flechas del teclado o desliza para explorar los estrenos.</p>
      <div
        id={trackId}
        className="premieres-track"
        ref={trackRef}
        style={{ '--premiere-columns': visibleCount }}
        role="group"
        aria-label="Tarjetas de estrenos"
        aria-describedby={`${trackId}-help`}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {movies.map((movie, index) => (
          <article className="premiere-card" role="group" aria-roledescription="diapositiva" aria-label={`${index + 1} de ${movies.length}: ${movie.title}`} key={movie.id}>
            <div className="poster-frame">
              <img className="movie-poster" src={movie.image} alt={`Afiche de ${movie.title}`} width="600" height="800" />
              <span className="poster-classification">{movie.classification}</span>
            </div>
            <div className="premiere-details">
              <h3>{movie.title}</h3>
              <p className="movie-genre">{movie.genre}</p>
              <p className="rating" aria-label={`Valoración: ${movie.rating.toFixed(1)} de 5`}><span aria-hidden="true">★</span> {movie.rating.toFixed(1)} / 5</p>
              <p className="premiere-synopsis">{movie.synopsis}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default PremieresCarousel
