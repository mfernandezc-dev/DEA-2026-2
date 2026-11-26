import { useRef, useState } from 'react'
import { createExam, getExamErrorMessage, getExamValidationErrors } from '../../api/exams.js'
import Button from '../Button/Button.jsx'

function ExamForm({ onCreated, onCancel }) {
  const [values, setValues] = useState({ title: '', description: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const savingRef = useRef(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    setErrors({})
    setErrorMessage('')
    try {
      const exam = await createExam(values)
      onCreated(exam)
    } catch (error) {
      const validationErrors = getExamValidationErrors(error)
      setErrors(validationErrors)
      setErrorMessage(Object.keys(validationErrors).length
        ? 'Django rechazó el registro. Corrige los campos indicados.'
        : getExamErrorMessage(error, 'No se pudo registrar el examen. Inténtalo nuevamente.'))
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <form className="exam-form" onSubmit={handleSubmit} noValidate aria-labelledby="exam-form-title" aria-busy={isSaving}>
      <h3 id="exam-form-title">Registrar examen</h3>
      <p className="exam-help">El título es obligatorio. La validación del envío se realiza en Django.</p>
      {errorMessage && (
        <div className="exam-error" role="alert">
          <p>{errorMessage}</p>
          {errors.non_field_errors?.map((message, index) => <p key={index}>{message}</p>)}
        </div>
      )}
      <fieldset disabled={isSaving}>
        <div className="exam-field">
          <label htmlFor="exam-title">Título (obligatorio)</label>
          <input
            id="exam-title"
            name="title"
            type="text"
            value={values.title}
            onChange={handleChange}
            maxLength={200}
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'exam-title-help exam-title-error' : 'exam-title-help'}
          />
          <p className="exam-help" id="exam-title-help">Máximo 200 caracteres. Un título vacío se enviará para mostrar la validación de Django.</p>
          {errors.title && <p className="exam-field-error" id="exam-title-error">{errors.title.join(' ')}</p>}
        </div>
        <div className="exam-field">
          <label htmlFor="exam-description">Descripción (opcional)</label>
          <textarea
            id="exam-description"
            name="description"
            rows={4}
            value={values.description}
            onChange={handleChange}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'exam-description-error' : undefined}
          />
          {errors.description && <p className="exam-field-error" id="exam-description-error">{errors.description.join(' ')}</p>}
        </div>
        <div className="exam-actions">
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar examen'}</Button>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Volver al listado</Button>
        </div>
      </fieldset>
      {isSaving && <p className="exam-help" role="status">Guardando el examen en Django…</p>}
    </form>
  )
}

export default ExamForm
