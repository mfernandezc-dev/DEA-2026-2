import { useEffect, useRef, useState } from 'react'
import { isRequestCanceled } from '../../api/client.js'
import { deleteExam, getExamErrorMessage, getExams } from '../../api/exams.js'
import Button from '../Button/Button.jsx'
import Skeleton from '../Skeleton/Skeleton.jsx'

const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : dateFormatter.format(date)
}

function ExamList({ initialPage = 1, onDeleted, onDeletingChange }) {
  const [request, setRequest] = useState({ page: initialPage, attempt: 0 })
  const [result, setResult] = useState({ status: 'loading', data: [], count: 0, page: 1, next: null, previous: null, error: null })
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const deletingRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadExams() {
      try {
        let page = request.page === 'last' ? 1 : request.page
        let data
        try {
          data = await getExams(page, { signal: controller.signal })
        } catch (error) {
          if (error.response?.status !== 404 || page === 1) throw error
          page = 1
          data = await getExams(page, { signal: controller.signal })
        }
        if (request.page === 'last' && data.next && data.results.length > 0) {
          page = Math.ceil(data.count / data.results.length)
          data = await getExams(page, { signal: controller.signal })
        }
        if (active) {
          setResult({ status: 'success', data: data.results, count: data.count, page, next: data.next, previous: data.previous, error: null })
        }
      } catch (error) {
        if (active && !isRequestCanceled(error)) {
          setResult((current) => ({ ...current, status: 'error', error: getExamErrorMessage(error, 'No se pudieron cargar los exámenes. Inténtalo nuevamente.') }))
        }
      }
    }

    loadExams()
    return () => {
      active = false
      controller.abort()
    }
  }, [request])

  function loadPage(page) {
    setDeleteError('')
    setResult((current) => ({ ...current, status: 'loading', error: null }))
    setRequest((current) => ({ page, attempt: current.attempt + 1 }))
  }

  async function handleDelete(exam) {
    if (deletingRef.current) return
    const confirmed = window.confirm(`¿Eliminar el examen «${exam.title}»? También se eliminarán sus preguntas y opciones relacionadas. Esta acción no se puede deshacer.`)
    if (!confirmed) return
    deletingRef.current = true
    setDeletingId(exam.id)
    setDeleteError('')
    onDeletingChange(true)
    try {
      await deleteExam(exam.id)
      onDeleted(exam)
      loadPage(result.data.length === 1 && result.page > 1 ? result.page - 1 : result.page)
    } catch (error) {
      setDeleteError(getExamErrorMessage(error, 'No se pudo eliminar el examen. El registro se conserva; puedes intentarlo nuevamente.'))
    } finally {
      deletingRef.current = false
      setDeletingId(null)
      onDeletingChange(false)
    }
  }

  return (
    <div className="exam-list" data-status={result.status} aria-busy={result.status === 'loading'}>
      {result.status === 'loading' && (
        <div>
          <p className="exam-help" role="status">Cargando exámenes desde Django…</p>
          <div className="exam-skeletons">
            {[0, 1, 2].map((index) => <Skeleton key={index} className="exam-table-skeleton" />)}
          </div>
        </div>
      )}
      {result.status === 'error' && (
        <div className="exam-error">
          <p role="alert">{result.error}</p>
          <Button variant="secondary" onClick={() => loadPage(request.page)}>Reintentar</Button>
        </div>
      )}
      {result.status === 'success' && (
        <>
          <p className="exam-summary" role="status">Página {result.page} · {result.data.length} en esta página · {result.count} exámenes en total</p>
          {deleteError && <p className="exam-error" role="alert">{deleteError}</p>}
          {result.data.length === 0 ? (
            <p className="exam-empty" role="status">No hay exámenes registrados. Utiliza «Registrar examen» para crear el primero.</p>
          ) : (
            <div className="exam-table-scroll" role="region" aria-label="Tabla de exámenes; permite desplazamiento horizontal" tabIndex={0}>
              <table className="exam-table">
                <caption>Exámenes registrados en Django</caption>
                <thead>
                  <tr><th scope="col">ID</th><th scope="col">Título</th><th scope="col">Descripción</th><th scope="col">Fecha de creación</th><th scope="col">Acción</th></tr>
                </thead>
                <tbody>
                  {result.data.map((exam) => (
                    <tr key={exam.id} data-exam-id={exam.id}>
                      <td>{exam.id}</td>
                      <th scope="row">{exam.title}</th>
                      <td className="exam-description">{exam.description || 'Sin descripción'}</td>
                      <td><time dateTime={exam.created_at}>{formatDate(exam.created_at)}</time></td>
                      <td><Button variant="secondary" onClick={() => handleDelete(exam)} disabled={deletingId !== null} aria-label={`Eliminar examen: ${exam.title}`}>{deletingId === exam.id ? 'Eliminando…' : 'Eliminar'}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav className="exam-pagination" aria-label="Paginación de exámenes">
            <Button variant="secondary" onClick={() => loadPage(result.page - 1)} disabled={!result.previous || deletingId !== null}>Página anterior</Button>
            <Button variant="secondary" onClick={() => loadPage(result.page + 1)} disabled={!result.next || deletingId !== null}>Página siguiente</Button>
          </nav>
          <p className="exam-help">Eliminar un examen también elimina sus preguntas y opciones relacionadas. Siempre se solicitará confirmación.</p>
        </>
      )}
    </div>
  )
}

export default ExamList
