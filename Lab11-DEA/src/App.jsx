import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import Hero from './components/Hero/Hero.jsx'
import MovieList from './components/MovieList/MovieList.jsx'
import PremieresSection from './components/PremieresSection/PremieresSection.jsx'
import rawMovies from './data/movies.js'
import adaptMovie from './adapters/movieAdapter.js'
import useDebounce from './hooks/useDebounce.js'

const movies = rawMovies.map(adaptMovie)
const favoritesStorageKey = 'lab10-dea:favoriteIds'

function loadFavoriteIds() {
  try {
    const storedIds = JSON.parse(localStorage.getItem(favoritesStorageKey) ?? '[]')
    if (!Array.isArray(storedIds)) return []

    return [...new Set(storedIds.filter((id) => movies.some((movie) => movie.id === id)))]
  } catch (error) {
    console.warn('[App] Could not load favorites:', error.message)
    return []
  }
}

function App() {
  const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds)
  const [searchInput, setSearchInput] = useState({ query: '', resetVersion: 0 })
  const debouncedSearch = useDebounce(searchInput, 400)
  const favoriteCount = favoriteIds.length
  const searchTerm = debouncedSearch.resetVersion === searchInput.resetVersion ? debouncedSearch.query : ''
  const featuredMovie = movies[0]

  useEffect(() => {
    console.info('[MovieSearch] Debounced search:', searchTerm)
  }, [searchTerm])

  useEffect(() => {
    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds))
    } catch (error) {
      console.warn('[App] Could not save favorites:', error.message)
    }
  }, [favoriteIds])

  function handleToggleFavorite(movieId) {
    const isFavorite = favoriteIds.includes(movieId)

    setFavoriteIds((currentIds) => (
      currentIds.includes(movieId)
        ? currentIds.filter((id) => id !== movieId)
        : [...currentIds, movieId]
    ))

    toast.success(
      isFavorite ? 'Película eliminada de favoritos' : 'Película agregada a favoritos',
      { id: 'favorite-feedback' },
    )
  }

  function handleQueryChange(query) {
    setSearchInput((currentInput) => currentInput.query === query ? currentInput : { ...currentInput, query })
  }

  function handleClearFilters() {
    // Invalidate the old debounced value, including if typing resumes before the next timeout.
    setSearchInput((currentInput) => ({ query: '', resetVersion: currentInput.resetVersion + 1 }))
  }

  return (
    <>
      <Header favoriteCount={favoriteCount} />
      <main>
        <Hero movie={featuredMovie} query={searchInput.query} onQueryChange={handleQueryChange} onClearFilters={handleClearFilters} />
        <MovieList
          movies={movies}
          searchTerm={searchTerm}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
        />
        <PremieresSection />
      </main>
      <Footer />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2500,
          className: 'favorite-toast',
          ariaProps: { role: 'status', 'aria-live': 'polite' },
          style: { background: '#121720', color: '#f5f0e9', border: '1px solid var(--border)' },
        }}
      />
    </>
  )
}

export default App
