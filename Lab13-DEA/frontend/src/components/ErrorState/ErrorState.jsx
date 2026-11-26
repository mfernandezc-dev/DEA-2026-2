export default function ErrorState({ onRetry, notFound = false }) {
  return <section className="ts-state ts-error" role="alert" data-state="error"><span className="ts-state-icon" aria-hidden="true">!</span><h2>{notFound ? 'Producto no encontrado' : 'No pudimos cargar la información'}</h2><p>{notFound ? 'El producto no existe o fue eliminado. Vuelve al catálogo para elegir otro.' : 'Comprueba que Django esté disponible e inténtalo de nuevo.'}</p>{onRetry && <button className="ts-button ts-primary" onClick={onRetry}>Reintentar</button>}</section>
}
