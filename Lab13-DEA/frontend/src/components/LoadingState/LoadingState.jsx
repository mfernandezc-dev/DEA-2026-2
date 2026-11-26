export default function LoadingState({ message = 'Cargando el catálogo…' }) {
  return <div className="ts-state" role="status" data-state="loading"><span className="ts-spinner" aria-hidden="true" /><h2>{message}</h2><p>Estamos consultando la información actualizada.</p></div>
}
