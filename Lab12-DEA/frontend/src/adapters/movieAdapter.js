function adaptMovie(movie) {
  if (!movie || typeof movie !== 'object' || Array.isArray(movie)) {
    throw new TypeError('Movie data must be an object.')
  }

  const rating = Number(movie.rating ?? 0)

  return {
    ...movie,
    id: movie.id,
    title: String(movie.title ?? ''),
    image: String(movie.image ?? ''),
    banner: String(movie.banner ?? movie.image ?? ''),
    synopsis: String(movie.synopsis ?? ''),
    classification: String(movie.classification ?? ''),
    rating: Number.isFinite(rating) ? rating : 0,
    genre: String(movie.genre ?? ''),
    showtimes: Array.isArray(movie.showtimes) ? [...movie.showtimes] : [],
  }
}

export default adaptMovie
