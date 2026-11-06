import MovieCard from '../MovieCard/MovieCard.jsx'

function MovieList({ movies }) {
  return (
    <section className="movie-section container" id="cartelera" aria-labelledby="movies-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tu próxima gran historia</p>
          <h2 id="movies-title">En cartelera<span aria-hidden="true">.</span></h2>
        </div>
        <p className="movie-count">{movies.length} películas <span aria-hidden="true">/</span> Todos los horarios</p>
      </div>
      <div className="movie-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  )
}

export default MovieList
