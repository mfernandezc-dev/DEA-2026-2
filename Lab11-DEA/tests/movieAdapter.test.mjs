import assert from 'node:assert/strict'
import test from 'node:test'
import adaptMovie from '../src/adapters/movieAdapter.js'
import movies from '../src/data/movies.js'

test('preserves every original movie field, ID and schedule', () => {
  const adaptedMovies = movies.map(adaptMovie)

  assert.equal(adaptedMovies.length, 8)
  assert.equal(adaptedMovies.reduce((total, movie) => total + movie.showtimes.length, 0), 24)

  for (const [index, movie] of movies.entries()) {
    const adaptedMovie = adaptedMovies[index]
    for (const [key, value] of Object.entries(movie)) {
      assert.deepEqual(adaptedMovie[key], value)
    }
    assert.equal(adaptedMovie.banner, movie.banner ?? movie.image)
  }
})

test('returns a new object and an independent schedule without mutating frozen input', () => {
  const movie = Object.freeze({ ...movies[0], showtimes: Object.freeze([...movies[0].showtimes]) })
  const adaptedMovie = adaptMovie(movie)

  assert.notEqual(adaptedMovie, movie)
  assert.notEqual(adaptedMovie.showtimes, movie.showtimes)
  adaptedMovie.title = 'Changed title'
  adaptedMovie.showtimes.push('23:00')
  assert.equal(movie.title, movies[0].title)
  assert.deepEqual(movie.showtimes, movies[0].showtimes)
})

test('normalizes absent optional values into the shared movie model', () => {
  assert.deepEqual(adaptMovie({ id: 'existing-id' }), {
    id: 'existing-id',
    title: '',
    image: '',
    banner: '',
    synopsis: '',
    classification: '',
    rating: 0,
    genre: '',
    showtimes: [],
  })
})

test('normalizes ratings and provides safe values for invalid optional data', () => {
  assert.equal(adaptMovie({ ...movies[0], rating: '4.8' }).rating, 4.8)
  for (const rating of ['invalid', Infinity, NaN, null]) {
    assert.equal(adaptMovie({ ...movies[0], rating }).rating, 0)
  }
  assert.deepEqual(adaptMovie({ ...movies[0], showtimes: null }).showtimes, [])
  assert.equal(adaptMovie({ ...movies[0], synopsis: null }).synopsis, '')
})

test('preserves numeric identifiers and additional source information', () => {
  const adaptedMovie = adaptMovie({ ...movies[0], id: 42, duration: 120 })
  assert.equal(adaptedMovie.id, 42)
  assert.equal(adaptedMovie.duration, 120)
})

test('rejects values that are not movie objects', () => {
  for (const value of [undefined, null, [], 'movie', 42]) {
    assert.throws(() => adaptMovie(value), { name: 'TypeError', message: 'Movie data must be an object.' })
  }
})
