import api from './client.js'

export async function getExams(page = 1, { signal } = {}) {
  const { data } = await api.get('exams/', { params: { page }, signal })
  if (!Array.isArray(data.results) || !Number.isInteger(data.count)) {
    throw new Error('Invalid paginated exam response.')
  }
  return data
}

export async function createExam({ title, description }) {
  const { data } = await api.post('exams/', { title, description })
  return data
}

export async function deleteExam(id) {
  await api.delete(`exams/${id}/`)
}

function translateValidationMessage(message) {
  const messages = {
    'This field is required.': 'Este campo es obligatorio.',
    'This field may not be blank.': 'Este campo no puede estar vacío.',
    'This field may not be null.': 'Este campo no puede ser nulo.',
    'Not a valid string.': 'Introduce un texto válido.',
  }
  const lengthError = String(message).match(/^Ensure this field has no more than (\d+) characters\.$/)
  if (lengthError) return `Este campo no puede tener más de ${lengthError[1]} caracteres.`
  return messages[message] || 'El servidor rechazó este valor. Revisa el campo e inténtalo de nuevo.'
}

export function getExamValidationErrors(error) {
  if (error.response?.status !== 400) return {}
  const data = error.response.data
  const errors = {}
  for (const field of ['title', 'description', 'non_field_errors']) {
    if (!data?.[field]) continue
    const messages = Array.isArray(data[field]) ? data[field] : [data[field]]
    errors[field] = messages.map(translateValidationMessage)
  }
  return errors
}

export function getExamErrorMessage(error, fallback) {
  if (error.code === 'ECONNABORTED') {
    return 'Django tardó demasiado en responder. Inténtalo nuevamente.'
  }
  if (error.isAxiosError && !error.response) {
    return 'No se pudo conectar con Django. Comprueba que el servidor esté disponible e inténtalo nuevamente.'
  }
  return fallback
}
