import { useId } from 'react'
import usePremieres from '../../hooks/usePremieres.js'
import Button from '../Button/Button.jsx'
import Skeleton from '../Skeleton/Skeleton.jsx'
import PremieresCarousel from '../PremieresCarousel/PremieresCarousel.jsx'

function PremieresSection({ requestOptions }) {
  const titleId = useId()
  const { status, data, error, retry } = usePremieres(requestOptions)

  return (
    <section className="premieres-section movie-section container" id="estrenos" aria-labelledby={titleId} aria-busy={status === 'loading'} data-status={status}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Más historias por descubrir</p>
          <h2 id={titleId}>Próximos estrenos<span aria-hidden="true">.</span></h2>
        </div>
      </div>
      {status === 'loading' && (
        <>
          <p className="premieres-status" role="status" aria-live="polite">Cargando estrenos…</p>
          <div className="premieres-skeletons">
            {[0, 1, 2].map((index) => <Skeleton key={index} />)}
          </div>
        </>
      )}
      {status === 'success' && <PremieresCarousel movies={data} />}
      {status === 'error' && (
        <div className="premieres-error">
          <p role="alert">{error}</p>
          <Button className="premieres-retry" onClick={retry} aria-label="Reintentar carga de estrenos">Reintentar</Button>
        </div>
      )}
    </section>
  )
}

export default PremieresSection
