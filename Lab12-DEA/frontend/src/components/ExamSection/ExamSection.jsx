import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../Button/Button.jsx'
import ExamForm from '../ExamForm/ExamForm.jsx'
import ExamList from '../ExamList/ExamList.jsx'
import '../../styles/exams.css'

function ExamSection() {
  const [showForm, setShowForm] = useState(false)
  const [showLastPage, setShowLastPage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  function handleCreated(exam) {
    const message = `Examen «${exam.title}» registrado correctamente.`
    setNotice(message)
    toast.success(message, { id: 'exam-feedback' })
    setShowLastPage(true)
    setShowForm(false)
  }

  function handleDeleted(exam) {
    const message = `Examen «${exam.title}» eliminado correctamente.`
    setNotice(message)
    toast.success(message, { id: 'exam-feedback' })
  }

  function handleOpenForm() {
    setNotice('')
    setShowLastPage(false)
    setShowForm(true)
  }

  return (
    <section className="exam-section movie-section container" id="exams" aria-labelledby="exams-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Laboratorio 12 · Django REST Framework y Axios</p>
          <h2 id="exams-title">Administración de exámenes<span aria-hidden="true">.</span></h2>
        </div>
        {!showForm && <Button onClick={handleOpenForm} disabled={isDeleting}>Registrar examen</Button>}
      </div>
      <p className="exam-intro">Consulta, registra y elimina los exámenes de la API. La cartelera de películas se mantiene independiente.</p>
      {notice && <p className="exam-notice" role="status">{notice}</p>}
      {showForm ? (
        <ExamForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      ) : (
        <ExamList initialPage={showLastPage ? 'last' : 1} onDeleted={handleDeleted} onDeletingChange={setIsDeleting} />
      )}
    </section>
  )
}

export default ExamSection
