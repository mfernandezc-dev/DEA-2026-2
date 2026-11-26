import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import productService from '../../services/productService.js'
import { imageFileError, productFormData, productServerErrors, validateProduct } from '../../utils/catalog.js'
import { Link } from '../Router/Router.jsx'
import { navigate } from '../Router/navigation.js'

export default function ProductForm({ categories, product = null }) {
  const editing = Boolean(product)
  const [values, setValues] = useState({ name: product?.name || '', description: product?.description || '', price: product?.price || '', stock: String(product?.stock ?? ''), category_id: String(product?.category.id ?? '') })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(product?.image || '')
  const [imageStatus, setImageStatus] = useState('ready')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const formRef = useRef(null)
  const objectUrl = useRef(null)

  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])

  function selectImage(selectedFile) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = null
    setFile(selectedFile)
    const invalid = imageFileError(selectedFile)
    setErrors(current => ({ ...current, image: invalid }))
    if (selectedFile && !invalid) {
      objectUrl.current = URL.createObjectURL(selectedFile)
      setPreview(objectUrl.current)
      setImageStatus('loading')
    } else {
      setPreview(product?.image || '')
      setImageStatus('ready')
    }
  }

  const change = event => {
    const { name, value } = event.target
    setValues(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: '' }))
  }
  const focusError = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"], .ts-form-message')?.focus())

  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    const validation = validateProduct(values, file, editing)
    if (file && imageStatus === 'error') validation.image = 'El archivo seleccionado no contiene una imagen válida.'
    if (file && imageStatus === 'loading') validation.image = 'Espera a que termine la validación de la imagen.'
    if (!categories.some(category => String(category.id) === values.category_id)) validation.category_id = 'Selecciona una categoría disponible.'
    setErrors(validation)
    setMessage('')
    if (Object.keys(validation).length) { focusError(); return }
    lock.current = true
    setSaving(true)
    try {
      const data = productFormData(values, file)
      if (editing) await productService.update(product.id, data)
      else await productService.create(data)
      toast.success(editing ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.', { id: 'product-feedback' })
      navigate('/')
    } catch (error) {
      setErrors(productServerErrors(error))
      setMessage(error.response?.status === 404 ? 'El producto ya no existe. Regresa al catálogo.' : error.response?.status === 400 ? 'El servidor rechazó algunos campos. Revisa los mensajes y vuelve a intentarlo.' : 'No se pudo guardar. Comprueba la conexión con Django e inténtalo de nuevo.')
      focusError()
    } finally { lock.current = false; setSaving(false) }
  }

  const fieldProps = name => ({ id: `product-${name}`, name, value: values[name], onChange: change, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined })
  const error = name => errors[name] && <p id={`${name}-error`} className="ts-field-error">{errors[name]}</p>

  return <form className="ts-product-form" onSubmit={submit} noValidate ref={formRef} aria-label={editing ? 'Editar producto' : 'Registrar producto'}>
    {message && <div className="ts-form-message" role="alert" tabIndex={-1}>{message}</div>}
    {!categories.length && <p className="ts-form-message" role="alert">No hay categorías disponibles. Crea una categoría desde la API antes de registrar productos.</p>}
    <fieldset disabled={saving}><legend className="ts-sr-only">Información del producto</legend>
      <div className="ts-form-layout"><div className="ts-form-fields">
        <div className="ts-form-section-title"><span>01</span><div><h2>Información del producto</h2><p>Los campos con * son obligatorios.</p></div></div>
        <div className="ts-field"><label htmlFor="product-name">Nombre del producto *</label><input {...fieldProps('name')} required maxLength={200} autoComplete="off" placeholder="Nombre del equipo o accesorio" />{error('name')}</div>
        <div className="ts-field"><label htmlFor="product-description">Descripción *</label><textarea {...fieldProps('description')} required rows={4} placeholder="Características y detalles del producto" />{error('description')}</div>
        <div className="ts-field-pair"><div className="ts-field"><label htmlFor="product-price">Precio (S/) *</label><input {...fieldProps('price')} type="number" required min="0" max="99999999.99" step="0.01" inputMode="decimal" placeholder="0.00" />{error('price')}</div><div className="ts-field"><label htmlFor="product-stock">Existencias *</label><input {...fieldProps('stock')} type="number" required min="0" max="2147483647" step="1" inputMode="numeric" placeholder="0" />{error('stock')}</div></div>
        <div className="ts-field"><label htmlFor="product-category_id">Categoría *</label><select {...fieldProps('category_id')} required><option value="">Selecciona una categoría</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{error('category_id')}</div>
      </div><div className="ts-image-field"><div className="ts-form-section-title"><span>02</span><div><h2>Imagen del producto</h2><p>{editing ? 'Conserva la actual o sube una nueva.' : 'Muestra tu producto con claridad.'}</p></div></div>
        <div className="ts-image-preview">{preview ? <img src={preview} alt={editing ? 'Vista previa del producto' : 'Vista previa de la imagen seleccionada'} onLoad={() => setImageStatus('ready')} onError={() => { if (file) setImageStatus('error') }} /> : <div><span aria-hidden="true">▧</span><p>Vista previa de la imagen</p></div>}</div>
        <div className="ts-field"><label htmlFor="product-image">{editing ? 'Reemplazar imagen (opcional)' : 'Seleccionar imagen *'}</label><input id="product-image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required={!editing} aria-invalid={Boolean(errors.image) || imageStatus === 'error'} aria-describedby="image-help image-error" onChange={event => {
          selectImage(event.target.files?.[0] || null)
        }} /><p id="image-help" className="ts-help">PNG, JPG, WebP o GIF · Máximo 5 MB.<br />{editing ? 'Si no eliges un archivo, la imagen actual se conserva.' : 'La imagen se validará antes de guardar.'}</p><p id="image-error" className="ts-field-error">{errors.image || (imageStatus === 'error' ? 'El archivo no contiene una imagen válida.' : '')}</p></div>
      </div></div>
    </fieldset>
    <div className="ts-form-bottom"><p>Los cambios se guardan en el catálogo local.</p><div><Link href="/" className="ts-button ts-secondary" aria-disabled={saving} onClick={event => { if (saving) event.preventDefault() }}>Cancelar</Link><button className="ts-button ts-primary" type="submit" disabled={saving || !categories.length || (Boolean(file) && imageStatus === 'loading')}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}</button></div></div>
  </form>
}
