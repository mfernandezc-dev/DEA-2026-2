import { useEffect, useRef } from 'react'

export default function ConfirmDialog({ product, busy, error, onCancel, onConfirm }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); (previous?.isConnected ? previous : document.querySelector('#catalog-title'))?.focus() }
  }, [])
  return <dialog className="ts-dialog" ref={ref} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}>
    <span className="ts-danger-icon" aria-hidden="true">!</span><h2 id="delete-title">¿Eliminar producto?</h2><p id="delete-description">Vas a eliminar <strong>{product.name}</strong>. Esta acción no se puede deshacer.</p>
    {error && <p className="ts-field-error" role="alert">{error}</p>}
    <div className="ts-dialog-actions"><button autoFocus className="ts-button ts-secondary" disabled={busy} onClick={onCancel}>Cancelar</button><button className="ts-button ts-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Eliminando…' : 'Sí, eliminar'}</button></div>
  </dialog>
}
