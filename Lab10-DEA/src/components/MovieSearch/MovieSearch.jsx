import { useEffect, useState } from 'react'

function MovieSearch({ onSearchChange }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.info('[MovieSearch] Debounced search:', query)
      onSearchChange(query)
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [query, onSearchChange])

  return (
    <div className="movie-search" role="search" aria-label="Buscar en la cartelera">
      <label htmlFor="movie-search">Busca tu próxima película</label>
      <input
        id="movie-search"
        type="search"
        placeholder="Escribe el título de una película"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-describedby="movie-search-help"
        aria-controls="movie-results"
      />
      <p className="form-help" id="movie-search-help">Los resultados se actualizan al dejar de escribir durante 400 ms.</p>
    </div>
  )
}

export default MovieSearch
