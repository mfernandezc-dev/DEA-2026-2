import { useEffect, useState } from 'react'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import Hero from './components/Hero/Hero.jsx'
import MovieList from './components/MovieList/MovieList.jsx'
import movies from './data/movies.js'

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
  const [searchTerm, setSearchTerm] = useState('')
  const featuredMovie = movies[0]

  useEffect(() => {
    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds))
    } catch (error) {
      console.warn('[App] Could not save favorites:', error.message)
    }
  }, [favoriteIds])

  function handleToggleFavorite(movieId) {
    setFavoriteIds((currentIds) => (
      currentIds.includes(movieId)
        ? currentIds.filter((id) => id !== movieId)
        : [...currentIds, movieId]
    ))
  }

  return (
    <>
      <Header />
      <main>
        <Hero movie={featuredMovie} onSearchChange={setSearchTerm} />
        <MovieList
          movies={movies}
          searchTerm={searchTerm}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
        />
      </main>
      <Footer />
    </>
  )
}

export default App
