function MovieCard({ movie }) {
  return (
    <article className="movie-card" aria-labelledby={`movie-${movie.id}`}>
      <div className="poster-frame">
        <img className="movie-poster" src={movie.image} alt={`Afiche de ${movie.title}`} width="600" height="800" loading="lazy" />
        <span className="poster-classification">{movie.classification}</span>
      </div>
      <div className="movie-details">
        <div className="card-heading">
          <h3 id={`movie-${movie.id}`}>{movie.title}</h3>
          <span className="rating" aria-label={`Valoración: ${movie.rating.toFixed(1)} de 5`}><span aria-hidden="true">★</span> {movie.rating.toFixed(1)}</span>
        </div>
        <p className="movie-genre">{movie.genre}</p>
        <p className="movie-synopsis">{movie.synopsis}</p>
        <p className="showtimes-label">Horarios</p>
        <ul className="showtimes" aria-label={`Horarios de ${movie.title}`}>
          {movie.showtimes.map((showtime) => (
            <li className="showtime" key={showtime}><time dateTime={showtime}>{showtime}</time></li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default MovieCard
