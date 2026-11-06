import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import Hero from './components/Hero/Hero.jsx'
import MovieList from './components/MovieList/MovieList.jsx'
import movies from './data/movies.js'

function App() {
  const featuredMovie = movies[0]

  return (
    <>
      <Header />
      <main>
        <Hero movie={featuredMovie} />
        <MovieList movies={movies} />
      </main>
      <Footer />
    </>
  )
}

export default App
