import MovieCard from '../MovieCard/MovieCard.jsx'

function MovieList({ movies, searchTerm, favoriteIds, onToggleFavorite }) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
  const filteredMovies = movies.filter((movie) => (
    movie.title.toLocaleLowerCase('es').includes(normalizedSearch)
  ))

  return (
    <section className="movie-section container" id="cartelera" aria-labelledby="movies-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tu próxima gran historia</p>
          <h2 id="movies-title">En cartelera<span aria-hidden="true">.</span></h2>
        </div>
        <p className="movie-count">{filteredMovies.length} películas <span aria-hidden="true">/</span> Todos los horarios</p>
      </div>
      <div id="movie-results" aria-live="polite" aria-atomic="true">
        {filteredMovies.length > 0 ? (
          <div className="movie-grid">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isFavorite={favoriteIds.includes(movie.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="empty-state" role="status">No se encontraron películas. Prueba con otro título.</p>
        )}
      </div>
    </section>
  )
}

export default MovieList
