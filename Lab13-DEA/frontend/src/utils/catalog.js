export const pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
export const normalizeText = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function filterProducts(products, categoryId, query) {
  const term = normalizeText(query)
  return products.filter(product => (!categoryId || String(product.category.id) === String(categoryId)) && normalizeText(`${product.name} ${product.description}`).includes(term))
}

export function imageFileError(file) {
  if (!file) return ''
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return 'Selecciona una imagen PNG, JPG, WebP o GIF.'
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return 'La imagen debe pesar entre 1 byte y 5 MB.'
  return ''
}

export function validateProduct(values, file, editing) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Introduce el nombre del producto.'
  else if (values.name.trim().length > 200) errors.name = 'El nombre admite hasta 200 caracteres.'
  if (!values.description.trim()) errors.description = 'Introduce una descripción.'
  if (!/^\d+(\.\d{1,2})?$/.test(values.price) || Number(values.price) > 99999999.99) errors.price = 'Introduce un precio entre 0 y 99999999.99, con hasta dos decimales.'
  if (!/^\d+$/.test(values.stock) || !Number.isSafeInteger(Number(values.stock)) || Number(values.stock) > 2147483647) errors.stock = 'Introduce existencias enteras entre 0 y 2147483647.'
  if (!values.category_id) errors.category_id = 'Selecciona una categoría.'
  if (!editing && !file) errors.image = 'Selecciona una imagen del producto.'
  const imageError = imageFileError(file)
  if (imageError) errors.image = imageError
  return errors
}

export function productFormData(values, file) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.append(key, ['name', 'description'].includes(key) ? value.trim() : value)
  if (file) data.append('image', file)
  return data
}

export function productServerErrors(error) {
  if (error.response?.status !== 400) return {}
  const messages = {
    'This field is required.': 'Este campo es obligatorio.',
    'This field may not be blank.': 'Este campo no puede estar vacío.',
    'Ensure this value is greater than or equal to 0.': 'El valor no puede ser negativo.',
    'Upload a valid image. The file you uploaded was either not an image or a corrupted image.': 'El servidor rechazó la imagen: el archivo no es válido.',
  }
  return Object.fromEntries(Object.entries(error.response.data || {}).map(([field, value]) => [field,
    (Array.isArray(value) ? value : [value]).map(message => messages[message] || (field === 'category_id' ? 'La categoría no existe o ya no está disponible.' : 'El servidor rechazó este valor. Revisa el contenido y sus límites.')).join(' '),
  ]))
}
