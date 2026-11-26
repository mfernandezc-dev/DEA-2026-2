# Laboratorio 13 — Estructura de una aplicación de comercio electrónico

**TechStore · Michael Fernandez Camarena**

| Dato académico | Información |
|---|---|
| Institución | TECSUP |
| Curso | Desarrollo de Aplicaciones Empresariales |
| Docente | Michael Montgomery Rosell |
| Periodo | 2026-2 |
| Estudiante | Michael Fernandez Camarena |

## Descripción y objetivos

TechStore es un catálogo tecnológico con gestión de productos mediante React,
Django REST Framework y SQLite. Permite consultar, filtrar, buscar, registrar,
editar y eliminar productos con imágenes locales. No incorpora carrito, pagos
ni pedidos. Es una demostración académica local, no una tienda en producción.

El objetivo es separar presentación, servicios HTTP y persistencia; representar
la relación categoría–producto; y comprobar el CRUD con datos reales y evidencias.
Se reutiliza selectivamente Lab12 sin modificarlo: `config`, `quiz`, componentes,
pruebas y recursos heredados. La aplicación anterior sigue accesible en `/quiz`.

**Tres capacidades trabajadas:** (1) modelar y persistir información relacionada
con Django; (2) exponer y consumir una API REST mediante servicios reutilizables;
(3) construir y verificar una interfaz React dinámica con CRUD y evidencias.
Son formulaciones operativas basadas en las consignas recibidas por fases:
**la redacción literal de las tres capacidades de la guía está pendiente de
cotejo**, porque no se proporcionó su documento original. No se atribuye una
transcripción no comprobada a TECSUP.

### Índice

- [Descripción y objetivos](#descripción-y-objetivos)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Estructura](#estructura)
- [Instalación del backend](#instalación-del-backend)
- [Instalación del frontend](#instalación-del-frontend)
- [Catálogo y datos iniciales](#catálogo-y-datos-iniciales)
- [API REST](#api-rest)
- [Capa de servicios](#capa-de-servicios)
- [Interfaz y actividades React](#interfaz-y-actividades-react)
- [URLs locales y puertos](#urls-locales-y-puertos)
- [Pruebas y evidencias](#pruebas-y-evidencias)
- [Observaciones](#observaciones)
- [Cinco conclusiones](#cinco-conclusiones)
- [Entregables y publicación](#entregables-y-publicación)
- [Estado actual](#estado-actual)

## Tecnologías

- Python 3.12+; entorno verificado: 3.14.3.
- Django 5.2.15, Django REST Framework 3.16.1, SQLite y
  django-cors-headers 4.9.0.
- Pillow 13.0.0 para validar y dibujar imágenes.
- Node.js 20+ compatible con Vite; entorno verificado: 24.15.0,
  npm 11.12.1, React 19.3.1, Vite 8.3.6 y Axios 1.21.1.
- Git 2.54.0.windows.1; única rama de trabajo: `main`.
- SQLite 3.50.4, react-hot-toast 2.6.1 y Oxlint 1.91.0.

Versiones obtenidas del entorno y de los paquetes instalados; los rangos de
`package.json` se concretan mediante `package-lock.json`. La base SQLite y las
dependencias instaladas no se publican.

## Arquitectura

La navegación SPA utiliza History API, no una dependencia React Router.
Las escrituras pasan por la capa de servicios; las imágenes se solicitan con
elementos `img` a las rutas de medios de Django en desarrollo.

```mermaid
flowchart LR
    UI[Interfaz React] --> P[Páginas y componentes]
    P --> S[productService y categoryService]
    S --> F[Factoría CRUD]
    F --> A[Cliente Axios único]
    A --> R[Router de Django REST Framework]
    R --> V[CategoryViewSet y ProductViewSet]
    V --> Z[Serializadores anidados]
    V --> M[Modelos Category y Product]
    Z --> M
    M --> DB[(SQLite)]
    M --> I[ImageField y almacenamiento local]
    P --> IMG[img: URL de imagen]
    IMG --> MEDIA[Django media en DEBUG]
    MEDIA --> I
```

Secuencia de una carga del catálogo; cada página contiene ya la categoría
anidada. Las categorías del filtro se cargan en paralelo por su propio servicio.

```mermaid
sequenceDiagram
    participant C as CatalogPage
    participant G as getAllPages
    participant S as productService
    participant A as Axios
    participant V as ProductViewSet
    participant D as SQLite
    participant Z as ProductSerializer
    C->>G: cargar productos con signal
    loop Cada página mientras exista next
        G->>S: getAll con page
        S->>A: GET products/
        A->>V: GET /api/products/?page=n
        V->>D: COUNT y SELECT JOIN category
        D-->>V: productos y categorías
        V->>Z: serializar productos
        Z-->>V: category anidada
        V-->>A: 200 count, next, previous, results
        A-->>S: response.data
        S-->>G: sobre paginado
    end
    G-->>C: catálogo completo
    C->>C: renderizar tarjetas y aplicar filtros locales
```

## Estructura

```text
Lab13-DEA/
├── backend/
│   ├── config/                   # Settings, URLs, ASGI y WSGI heredados
│   ├── quiz/                     # Aplicación, API y migraciones del Lab12
│   ├── catalog/
│   │   ├── assets/demo/          # Ocho PNG originales versionables
│   │   ├── management/commands/seed_catalog.py
│   │   ├── migrations/0001_initial.py
│   │   ├── models.py
│   │   ├── admin.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── test_api.py
│   │   └── tests.py
│   ├── scripts/                  # Generación de imágenes y verificaciones
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/services/             # Axios único y servicios CRUD del catálogo
│   ├── src/api/                  # Compatibilidad con el módulo quiz heredado
│   ├── src/pages/                # Catálogo, alta y edición
│   ├── src/components/           # Una carpeta por componente
│   ├── src/LegacyApp.jsx         # Aplicación anterior en /quiz
│   └── tests/                    # Pruebas heredadas, servicios e integración
└── evidencias/                   # Informes y capturas por fase
```

`.venv/`, `db.sqlite3`, `media/`, `node_modules/`, cachés y `dist/` son
locales e ignorados. No se copiaron bases de datos, secretos, dependencias
instaladas ni evidencias del laboratorio anterior.

**Paso 1 — Estructura reutilizada.** Backend y frontend independientes dentro
del Lab13, sin copiar la base de datos ni las dependencias instaladas del Lab12.
Resultado: proyecto identificable y aplicación anterior conservada.

![Estructura de backend y frontend en Visual Studio Code](evidencias/04-documentacion/01-estructura-proyecto-vscode.png)

## Instalación del backend

Desde `Lab13-DEA/backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Generate a session-only key; never print or commit its value.
$env:DJANGO_SECRET_KEY = (.\.venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
$env:DJANGO_DEBUG = "1"

.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_catalog
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py showmigrations
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver localhost:8000
```

`createsuperuser` solicita las credenciales interactivamente. No hay contraseña
ni administrador permanente preconfigurados. Los usuarios de prueba son
temporales y se eliminan al finalizar las verificaciones.

`backend/.env.example` documenta variables de entorno; Django **no carga
automáticamente archivos `.env`**. Exportarlas desde PowerShell si se cambian.
Sin `DJANGO_SECRET_KEY`, desarrollo usa una clave aleatoria por proceso, que
invalida sesiones al reiniciar; fuera de DEBUG, la clave es obligatoria.
Esta configuración es local, no un despliegue de producción.

La base es exclusivamente `Lab13-DEA/backend/db.sqlite3`. Se conservó la
migración original de `quiz` y se añadió `catalog/0001_initial.py`.
Para futuros cambios de modelos, ejecutar `makemigrations` antes de `migrate`.
La carga opcional de datos del módulo anterior es `manage.py seed_demo`.

Desde la raíz del repositorio clonado, entrar primero en `Lab13-DEA/backend`.
Para obtenerlo por primera vez puede usarse
`git clone https://github.com/mfernandezc-dev/DEA-2026-2.git`; esta fase no
ha publicado todavía Lab13. Tras la publicación, esos mismos pasos permiten
reconstruir el laboratorio sin copiar archivos locales ignorados.

**Pasos 1–2 — Migraciones.** Comprobación nueva de esta fase: `catalog` y `quiz`
aplicadas, `migrate --check` con código 0 y Django check sin incidencias.
La imagen siguiente procede de una terminal Windows real, no de una simulación.

![Migraciones aplicadas y Django check en terminal real](evidencias/04-documentacion/05-migraciones-terminal.png)

## Instalación del frontend

Desde `Lab13-DEA/frontend`:

```powershell
npm ci --cache .npm-cache
npm run dev
```

El lock original se conserva, sin nuevas dependencias en la fase 03.
TechStore es la página principal; las películas y los exámenes heredados
continúan disponibles en `/quiz`.
Axios usa `http://127.0.0.1:8000/api/` por defecto y conserva compatibilidad
con los imports del módulo anterior.
Si hace falta cambiarlo, copiar `.env.example` a `.env.local` y ajustar
`VITE_API_BASE_URL`; las variables `VITE_*` son públicas y no deben contener secretos.

## Catálogo y datos iniciales

### Paso 2 — Modelos, relación y administración

El siguiente diagrama documenta **la implementación actual**, no el diagrama
original de aula, que no fue proporcionado. Los tipos corresponden a Django;
`category` es el atributo ORM y `category_id` su columna/identificador asociado.

```mermaid
erDiagram
    Category ||--o{ Product : contiene
    Category {
        BigAutoField id PK
        CharField name UK "max_length=100"
        TextField description "blank=True"
    }
    Product {
        BigAutoField id PK
        CharField name "max_length=200"
        TextField description
        DecimalField price "max_digits=10; decimal_places=2; min=0"
        PositiveIntegerField stock "min=0"
        ImageField image "upload_to=catalog/products/"
        ForeignKey category_id FK "Category; PROTECT"
    }
```

Una categoría puede tener cero o muchos productos; cada producto pertenece a
una categoría. No se permite eliminar una categoría que aún tenga productos.

![Aplicación catalog y modelos reales en Visual Studio Code](evidencias/04-documentacion/02-estructura-catalog-vscode.png)

- `Category`: `id`, `name` único y `description` opcional.
- `Product`: `id`, `name`, `description`, `price`, `stock`, `image` y `category`.
- Relación `Category 1 → N Product`, inversa `category.products`.
- `price` usa `DecimalField(10, 2)` y validación de mínimo cero.
- `stock` usa `PositiveIntegerField` y validación de mínimo cero.
- Restricciones CHECK en SQLite protegen también escrituras directas.
- `on_delete=PROTECT` impide borrar una categoría con productos;
  primero hay que reasignarlos o eliminarlos.
- Admin: listados, búsqueda, filtro por categoría, precio, stock y miniaturas.

`seed_catalog` crea **3 categorías y 8 productos** con precios de demostración
en soles (PEN), no cotizaciones comerciales:

| Categoría | Producto | Precio S/ | Stock |
|---|---|---:|---:|
| Laptops | Lenovo IdeaPad | 2299.90 | 12 |
| Laptops | HP Pavilion | 2799.00 | 8 |
| Laptops | ASUS VivoBook | 2499.00 | 10 |
| Accessories | Wireless Mouse | 79.90 | 40 |
| Accessories | Mechanical Keyboard | 249.90 | 20 |
| Accessories | Gaming Headset | 189.90 | 25 |
| Monitors | Samsung Monitor | 649.00 | 15 |
| Monitors | LG Monitor | 999.00 | 9 |

El administrador permite consultar categorías, filtrar productos y revisar
precios, existencias y miniaturas. Las capturas de fase 01 cubren los modelos
y los registros exigidos; el usuario `evidence_*` fue temporal y eliminado,
no es una cuenta ni una credencial disponible para iniciar sesión.

**Categorías:** tres registros iniciales comprobados.

![Tres categorías reales en Django Admin](evidencias/01-backend/03-admin-categories.png)

**Productos:** ocho registros con su relación, stock e ilustraciones locales.

![Ocho productos reales y sus imágenes en Django Admin](evidencias/01-backend/04-admin-products.png)

**Imagen del producto:** el formulario muestra el archivo existente y su vista
previa. No es necesario regenerar estas evidencias válidas.

![Producto Lenovo IdeaPad con imagen en Django Admin](evidencias/01-backend/05-product-image.png)

El comando es idempotente: conserva identificadores, ediciones y registros
ajenos, no duplica imágenes y restaura medios de demostración faltantes.
Identifica los productos iniciales por su nombre; no renombrarlos si se desea
seguir reconociéndolos como los mismos registros al repetir la carga.

### Imágenes y procedencia

Son **ilustraciones originales, no fotografías**, dibujadas localmente con Pillow,
sin descargar imágenes de terceros. Los ocho PNG de 900 × 600 están en
`backend/catalog/assets/demo/` y se ofrecen bajo **CC0-1.0**; los nombres
comerciales no implican afiliación ni cesión de derechos sobre marcas.
`seed_catalog` los copia al almacenamiento local `media/catalog/demo/`.
Después de clonar basta ejecutar el seed; no se necesita una conexión externa.
Para regenerar los originales:

```powershell
.\.venv\Scripts\python.exe scripts/generate_catalog_images.py
```

`MEDIA_ROOT` apunta a `backend/media`; `MEDIA_URL` es `/media/`.
Django sirve estos archivos únicamente con DEBUG activado.

## API REST

### Pasos 3–4 — Serializadores, ViewSets y router

La raíz `/api/` descubre los recursos. Se conservaron también los endpoints
del quiz; la tabla recoge todas las rutas REST registradas.

| Endpoint | Métodos | Resultado |
|---|---|---|
| `/api/categories/` | GET, POST | Listado paginado / crear categoría |
| `/api/categories/{id}/` | GET, PUT, PATCH, DELETE | Detalle / reemplazar / editar / eliminar |
| `/api/products/` | GET, POST | Listado paginado / crear producto |
| `/api/products/{id}/` | GET, PUT, PATCH, DELETE | Detalle / reemplazar / editar / eliminar |
| `/api/` | GET | Descubrimiento de recursos |
| `/api/exams/` | GET, POST | Listado paginado / crear examen |
| `/api/exams/{id}/` | GET, PUT, PATCH, DELETE | CRUD de examen |
| `/api/questions/` | GET, POST | Preguntas; admite `exam` y `search` |
| `/api/questions/{id}/` | GET, PUT, PATCH, DELETE | CRUD de pregunta |
| `/api/options/` | GET, POST | Listado paginado / crear opción |
| `/api/options/{id}/` | GET, PUT, PATCH, DELETE | CRUD de opción con validación heredada |

Estados: **200** lectura/edición, **201** creación, **204** eliminación sin
cuerpo, **400** validación, **404** recurso inexistente y **409** categoría
protegida. El conflicto devuelve `detail` explicando que hay productos asociados.
Ejemplo del conflicto: `{"detail":"This category has products. Reassign or delete them first."}`.
DRF admite además HEAD/OPTIONS según la ruta; un método no permitido devuelve 405.
Se aceptan JSON, `multipart/form-data` y formularios URL-encoded.
La imagen es obligatoria al crear y opcional en PUT/PATCH; omitirla conserva
el archivo actual. Una cadena de ruta o URL no sustituye a un archivo subido.

`CategorySerializer` expone `id`, `name`, `description`.
`ProductSerializer` devuelve la categoría completa como **`category` de solo
lectura**. Para asignar o cambiar esa relación se envía **`category_id`**, solo
de escritura y validado contra categorías existentes. No crea ni modifica
categorías mediante datos anidados. `select_related('category')` evita N+1:
dos consultas por listado paginado (COUNT y SELECT con JOIN), sin una petición
adicional para resolver la categoría de cada producto.

**Listado de categorías:** respuesta 200 con los tres registros reales.

![Listado de categorías en la API navegable](evidencias/02-api-servicios/01-api-categories.png)

**Listado anidado:** una petición por página contiene todos los datos de cada
producto y su categoría, sin peticiones individuales adicionales.

![Productos con categoría completa anidada en la API](evidencias/02-api-servicios/02-api-products-nested.png)

Ejemplo del producto inicial real:

```http
GET http://localhost:8000/api/products/1/
Accept: application/json
```

```json
{
  "id": 1,
  "name": "Lenovo IdeaPad",
  "description": "Demo laptop with a 15.6-inch display, 16 GB RAM and 512 GB SSD.",
  "price": "2299.90",
  "stock": 12,
  "image": "http://localhost:8000/media/catalog/demo/lenovo-ideapad.png",
  "category": {
    "id": 1,
    "name": "Laptops",
    "description": "Portable computers for study, work and daily use."
  }
}
```

**Detalle:** el producto 1 devuelve su imagen absoluta y la misma categoría
anidada del listado.

![Detalle real del producto Lenovo IdeaPad en la API](evidencias/02-api-servicios/03-api-product-detail.png)

**CRUD:** POST real con respuesta 201 sobre una categoría temporal; ese registro
se eliminó después de la captura. No representa una cuarta categoría permanente.

![Creación temporal con respuesta HTTP 201](evidencias/02-api-servicios/04-api-created-201.png)

El listado envuelve estos objetos en
`{ "count": 8, "next": "…?page=2", "previous": null, "results": […] }`.
Hay cinco elementos por página, como en `quiz`; `?page=2` obtiene los restantes.
La interfaz navegable de DRF está disponible abriendo las URLs en el navegador.
`/api/` muestra los cinco recursos: los dos nuevos y `exams`, `questions`,
`options`, cuyas rutas y funcionalidades se mantienen.

**Seguridad:** se conserva `AllowAny` para la demostración académica, incluida
la escritura anónima. Ejecutar solo en localhost. No publicar ni desplegar
esta configuración sin autenticación, permisos y ajustes de producción.

## Capa de servicios

### Pasos 5–6 — Cliente centralizado y servicios CRUD

`src/services/api.js` es la única configuración Axios: `VITE_API_BASE_URL`,
barra final normalizada, timeout de 10 segundos y `Accept: application/json`.
No fija Content-Type global: Axios establece JSON o el boundary multipart.
`src/api/client.js` reexporta la misma instancia para no romper `quiz`.
Ningún componente importa Axios ni contiene peticiones HTTP directas.

`productService.js` y `categoryService.js` comparten `createCrudService.js`:

| Operación | Contrato |
|---|---|
| `getAll(params = {}, config = {})` | GET; devuelve el sobre paginado de DRF |
| `getById(id, config = {})` | GET detalle; devuelve el objeto |
| `create(data, config = {})` | POST JSON o FormData; devuelve el objeto creado |
| `update(id, data, options = {})` | PATCH; con `{ replace: true }`, PUT |
| `remove(id, config = {})` | DELETE; devuelve `undefined` tras 204 |

Los datos de entrada no se modifican. Los errores se propagan como AxiosError
original: `error.response.status`, `error.response.data` y `error.code` quedan
disponibles. `getApiErrorMessage` proporciona mensajes comunes e
`isRequestCanceled` permite distinguir cancelaciones. `config` admite `signal`.

Ejemplo para la siguiente fase, sin implementar todavía una pantalla:

```js
import productService from './services/productService.js'

const page = await productService.getAll({ page: 1 })
const product = await productService.getById(page.results[0].id)

// For creation, use a real selected File and an existing category ID.
const form = new FormData()
form.append('name', 'Temporary product')
form.append('description', 'Local demonstration product.')
form.append('price', '123.45')
form.append('stock', '3')
form.append('category_id', String(product.category.id))
form.append('image', selectedFile)
// await productService.create(form)
```

La integración automatizada sí ejecuta creación, PUT/PATCH, imagen nueva,
validaciones y borrado con registros UUID temporales; nunca borra los originales.

## Interfaz y actividades React

| Ruta del frontend | Página |
|---|---|
| `/` (también `/catalog`) | Catálogo tecnológico |
| `/products/new` | Registro de producto |
| `/products/{id}/edit` | Edición de producto |
| `/quiz` | Aplicación heredada: cine y exámenes |
| Otras rutas | Página no encontrada y regreso al catálogo |

Navegación SPA con History API, enlaces nativos y Atrás/Adelante, sin router
externo. Vite admite acceso directo a estas rutas; un futuro hosting estático
necesitará fallback hacia `index.html`.

- `CatalogPage` consume productos y categorías mediante sus servicios.
  `getAllPages` recorre todas las páginas DRF y valida `results`/`count`.
  Las tarjetas usan `product.category`, sin consultas individuales de categoría.
- `ProductCard`, `ProductGrid` y `CategoryFilter` muestran datos reales,
  disponibilidad, stock y precios PEN con `Intl.NumberFormat('es-PE')`.
  El filtro usa IDs y se combina con búsqueda local por nombre/descripción,
  insensible a mayúsculas y tildes. Escribir no dispara peticiones HTTP.
- `LoadingState`, `ErrorState` y `EmptyState` cubren carga, reintento y selección
  vacía. Hay una imagen alternativa SVG local ante fallos de carga.
- `CreateProductPage` y `EditProductPage` reutilizan `ProductForm`, controlado:
  campos obligatorios, precio no negativo con hasta dos decimales, stock entero
  no negativo y categoría dinámica. Admite PNG/JPG/WebP/GIF de hasta 5 MB,
  verifica la decodificación y libera las object URLs de vistas previas.
- El alta envía FormData con `category_id`; la edición usa PATCH y omite `image`
  al conservar el archivo actual. Los errores del backend se muestran en español.
  Se bloquean envíos duplicados y se vuelve al catálogo sin recargar el documento.
- `ConfirmDialog` es un diálogo nativo accesible: cancelar no elimina; confirmar
  actualiza el estado solo después del éxito. Un error conserva el producto y
  permite reintentar. Las tres operaciones muestran notificaciones.
- Cabecera y pie propios, navy/azul, fondos claros y tarjetas proporcionadas.
  Rejilla 4/2/1 a 1440/768/390 px, foco visible, salto al contenido y botones de
  al menos 44 px en las tarjetas. Los estilos anteriores se conservan para `/quiz`.

La estructura separa las páginas, los componentes reutilizables y los servicios.
Resultado: la UI no importa Axios ni llama a fetch para consumir la API.

![Páginas y servicios React en el editor real](evidencias/04-documentacion/03-estructura-react-vscode.png)

![Carpetas de componentes React reutilizables](evidencias/04-documentacion/04-componentes-react-vscode.png)

### Paso 7 — Catálogo completo

El efecto carga todas las páginas y muestra imágenes, descripción, precio,
categoría anidada, stock y acciones. Resultado: ocho productos originales,
sin suponer que la primera página de cinco registros es todo el catálogo.

![Catálogo completo de TechStore con ocho productos](evidencias/03-frontend/01-catalogo-completo.png)

### Paso 8 — Filtros y búsqueda combinables

**Laptops:** tres productos, filtrados por ID de categoría.

![Filtro Laptops con tres productos](evidencias/03-frontend/02-filtro-laptops.png)

**Accessories:** tres productos, incluidos los de la segunda página de la API.

![Filtro Accessories con tres productos](evidencias/03-frontend/03-filtro-accessories.png)

**Monitors:** dos productos. La opción Todos restaura los ocho sin recargar.

![Filtro Monitors con dos productos](evidencias/03-frontend/04-filtro-monitors.png)

**Búsqueda:** nombre o descripción combinados con la categoría activa, sin
peticiones al escribir. Resultado mostrado: Lenovo dentro de Laptops.

![Búsqueda local de Lenovo combinada con Laptops](evidencias/03-frontend/05-busqueda-productos.png)

### Paso 9 — Registro con imagen

Formulario controlado con categorías de la API, validaciones y vista previa.
Resultado: FormData envía `category_id` y el archivo de imagen válido.

![Formulario real de registro de producto](evidencias/03-frontend/06-formulario-registro.png)

La prueba registró un producto UUID temporal, visible al regresar al catálogo
sin recargar el documento. Se comprobó también el indicador Agotado con stock 0.
El noveno producto de esta evidencia ya fue eliminado por la limpieza de pruebas.

![Producto temporal creado correctamente y visible en el catálogo](evidencias/03-frontend/07-producto-creado.png)

### Paso 10 — Edición y eliminación confirmada

La edición precarga valores y muestra la imagen existente. Se verificaron tanto
la conservación del archivo como su sustitución opcional.

![Formulario de edición con valores e imagen precargados](evidencias/03-frontend/08-formulario-edicion.png)

Resultado: precio y existencias del registro temporal actualizados; no se
modificó ninguno de los ocho productos originales.

![Producto temporal actualizado correctamente](evidencias/03-frontend/09-producto-actualizado.png)

El diálogo accesible identifica el producto y permite cancelar sin DELETE.
Confirmar espera el éxito del servidor; un fallo conserva el producto.

![Confirmación accesible de eliminación con nombre del producto](evidencias/03-frontend/10-confirmacion-eliminacion.png)

Resultado: se eliminó únicamente el registro temporal y el catálogo volvió
a sus ocho productos originales, sin recargar la página.

![Catálogo tras eliminar exclusivamente el producto de prueba](evidencias/03-frontend/11-catalogo-despues-eliminacion.png)

### Calidad visual, validaciones y recuperación

**Responsive:** pruebas a 1440/768/390 px; captura real móvil de 390 px,
sin desbordamiento horizontal. La imagen completa puede ampliarse para leerla.

![TechStore responsive en celular de 390 píxeles](evidencias/03-frontend/12-vista-movil.png)

**Validación:** campos obligatorios, precio/stock no negativos, stock entero e
imagen válida. Los errores 400 de Django también se muestran junto a los campos.

![Errores de validación visibles en el formulario](evidencias/03-frontend/13-validacion-formulario.png)

**Error controlado:** Chrome/CDP respondió 503 durante esta comprobación.
Después se retiró la condición y Reintentar recuperó los datos reales.
No se modificó la API ni se simuló el contenido del catálogo.

![Estado de error bajo HTTP 503 controlado y botón Reintentar](evidencias/03-frontend/14-estado-error.png)

## URLs locales y puertos

- Django Admin: <http://localhost:8000/admin/>.
- Categorías: <http://localhost:8000/admin/catalog/category/>.
- Productos: <http://localhost:8000/admin/catalog/product/>.
- Ejemplo de imagen: <http://localhost:8000/media/catalog/demo/lenovo-ideapad.png>.
- API conjunta: <http://localhost:8000/api/>.
- API categorías: <http://localhost:8000/api/categories/>.
- API productos: <http://localhost:8000/api/products/>.
- Frontend: <http://localhost:5173/>.
- Nuevo producto: <http://localhost:5173/products/new>.
- Aplicación heredada: <http://localhost:5173/quiz>.

CORS permite `http://localhost:5173` y `http://127.0.0.1:5173`.
Si un puerto está ocupado, identificar su proceso y no cerrarlo. Se puede usar
`runserver localhost:8001` y `npm run dev -- --port 5174`, exportando
`DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:5174` y ajustando el frontend a
`VITE_API_BASE_URL=http://127.0.0.1:8001/api/` antes de iniciarlos.

## Pruebas y evidencias

Los siguientes son **resultados registrados en fases anteriores**, no ejecuciones
nuevas de la fase documental. El código funcional se conserva sin cambios.

| Caso o suite | Resultado | Procedencia |
|---|---|---|
| Modelos, Admin, relaciones y seed | Cubiertos en la suite Django | Fases 01–03 |
| API: CRUD, anidamiento, imágenes, negativos, 404, PROTECT y N+1 | 89 pruebas Django correctas, junto a quiz/catalog | Fase 03 |
| Servicios, paginación, validaciones y regresión JavaScript | 58 unitarias correctas | Fase 03 |
| Catálogo, filtros, búsqueda, CRUD real y limpieza | 27 comprobaciones correctas | Fase 03 |
| Navegador heredado | 68 comprobaciones correctas | Fase 03 |
| Integración heredada con Django real | 44 comprobaciones correctas | Fase 03 |
| Build y lint | Código 0, sin avisos de lint | Fase 03 |
| Responsive y consola | 1440/768/390 px; sin excepciones inesperadas | Fase 03 |

La captura siguiente muestra **la fase 02**: 89 pruebas Django y 42 unitarias
JavaScript, compilación e integración HTTP. La fase 03 amplió las unitarias a
58; su resultado más reciente se conserva en su JSON, no se atribuye a esta imagen.

![Resultados auténticos de pruebas, build e integración HTTP de la fase 02](evidencias/02-api-servicios/05-test-results.png)

**Paso 11 — Verificaciones nuevas:** auditoría de enlaces y PNG, cotejo de
hashes, migraciones/check en terminal real, consultas HTTP de lectura y
reconstrucción aislada de SQLite/media mediante migrate y seed. El informe
documental distingue estas comprobaciones de las suites previas. No se
reinstalaron dependencias ni se repitió toda la regresión.

Desde `backend`:

```powershell
.\.venv\Scripts\python.exe manage.py test quiz catalog
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Desde `frontend`:

```powershell
npm run build
npm run lint
node --test tests/exams.test.mjs tests/movieAdapter.test.mjs tests/requestAudit.test.mjs
npm run test:services
npm run test:catalog:unit
# With local Django and Vite running:
npm run test:catalog:browser
# With the local backend running and Chrome/Edge available:
npm run test:catalog:integration
npm test
npm run test:integration
```

`backend/scripts/verify_phase.py` conserva las comprobaciones de la primera fase;
`backend/scripts/verify_api_phase.py` agrupa las comprobaciones de la segunda,
inicia un backend propio, ejecuta las pruebas heredadas, comprueba las ocho
imágenes por HTTP y obtiene capturas reales con Chrome/Edge.
Los puertos 8000 y 5173 deben estar libres. Solo termina procesos que él crea.
Su auditoría Git compara con el estado inicial de **este checkout**, incluidos
archivos ajenos no versionados; no debe interpretarse como una línea base válida
para otro clon. No ejecutar simultáneamente con ediciones o servidores propios.

Para verificar la fase 03 desde `backend`:

```powershell
.\.venv\Scripts\python.exe scripts/verify_frontend_phase.py
```

Conserva la línea base, reutiliza servidores locales disponibles sin detener
procesos ajenos y deja Django/Vite activos para revisión. Ejecuta unitarias,
CRUD de navegador con Django real, regresiones, build, lint y auditoría de
datos/Git. No repetir `--snapshot`. Los PID vigentes se registran en el JSON.

Resultados y pendientes: [PASO01-02.md](evidencias/01-backend/PASO01-02.md)
y [VERIFICACION.json de fase 01](evidencias/01-backend/VERIFICACION.json).
Fase 02: [PASO03-06.md](evidencias/02-api-servicios/PASO03-06.md)
y [VERIFICACION.json](evidencias/02-api-servicios/VERIFICACION.json).
Al retomar la fase 02 se reutiliza la implementación existente: el apartado
«Reanudación» del informe distingue la comprobación posterior del desarrollo
original y conserva su línea base. La revalidación del 26/11/2026 terminó sin
fallos a las 13:49:22 UTC. No es necesario reinstalar dependencias.
Fase 03: [PASO07-10.md](evidencias/03-frontend/PASO07-10.md) y
[VERIFICACION.json](evidencias/03-frontend/VERIFICACION.json), con 14 capturas
reales del catálogo, filtros, formularios, CRUD, móvil, validación y error controlado.

## Observaciones

- Las capturas de estructura y terminal pendientes de fase 01 se incorporaron
  en fase 04 mediante VS Code y Windows Terminal reales. No se recrearon las
  22 capturas anteriores ni se alteraron sus píxeles.
- El diagrama de aula y la redacción oficial de las tres capacidades no fueron
  facilitados. El ER documenta el código actual; falta cotejar las capacidades.
- Solo se dispone de información sobre Michael Fernandez Camarena. Si la guía
  exige equipo, faltan datos de otros participantes; no se inventa un reparto.
- Se conservan los datos en inglés provenientes de la API, con interfaz en
  español. Las ilustraciones son originales CC0-1.0; no fotografías comerciales.
- AllowAny, DEBUG y servicio local de imágenes son decisiones de demostración.
  Una publicación de código no equivale a un despliegue seguro de la aplicación.
- Las imágenes largas se pueden ampliar desde Markdown. El inventario de
  publicación excluye SQLite, secretos, entornos, cachés y resultados temporales.

## Cinco conclusiones

1. Separar modelos, API, servicios y páginas facilitó incorporar el catálogo sin
   eliminar las funciones heredadas del Lab12.
2. El serializador anidado y `select_related` entregan la categoría en cada
   producto sin consultas N+1 ni peticiones individuales desde React.
3. Una sola instancia Axios mantiene coherencia entre CRUD, errores y FormData,
   sin imponer un Content-Type que rompa las imágenes.
4. La paginación completa antes del filtrado evita ocultar productos de páginas
   posteriores y permite combinar categoría y búsqueda sin tráfico adicional.
5. Las pruebas con registros temporales, la limpieza y las evidencias trazables
   permiten demostrar resultados sin arriesgar los datos originales.

## Entregables y publicación

- [Desarrollo académico de los pasos 1–11](ENTREGABLE-LAB13.md).
- [Informe del paso 11](evidencias/04-documentacion/PASO11.md).
- [Auditoría documental y reproducibilidad](evidencias/04-documentacion/VERIFICACION.json).
- [Inventario cerrado y exclusiones de publicación](PUBLICACION-LAB13.txt).

El inventario describe exclusivamente archivos de Lab13. No se ejecutaron
`git add`, commit ni push. **Paso 12 pendiente:** la publicación y la revisión
real del README en GitHub requieren autorización en la fase 05.

## Estado actual

Preparación y pasos 1–2 **completados y verificados**: 68 pruebas Django,
25 pruebas unitarias de JavaScript, 68 comprobaciones de navegador y 44 de
integración con Django real, sin fallos. Las ocho imágenes respondieron HTTP 200.
Se obtuvieron tres capturas reales del Admin; las de estructura y terminal
se completaron posteriormente en la fase documental.
Los servidores de verificación fueron detenidos y los puertos quedaron libres.
Pasos 3–6 **completados y verificados**: 89 pruebas Django, 42 pruebas unitarias
de JavaScript, 11 comprobaciones de integración servicios–Django y las
regresiones heredadas (68 de navegador y 44 de integración), sin fallos.
Se obtuvieron cinco capturas reales de la API y las pruebas. CORS, imágenes,
categoría anidada, ausencia de N+1 y conservación de los datos fueron comprobados.
Los servidores temporales quedaron detenidos y el staging sin cambios.
Pasos 7–10 **completados y verificados**: catálogo, filtros, búsqueda y CRUD;
89 pruebas Django, 58 unitarias JavaScript, 27 comprobaciones TechStore y las
regresiones heredadas de 68 y 44 comprobaciones, sin fallos. Se obtuvieron las
14 capturas reales; build y lint correctos. Datos originales conservados.
El informe de fase 03 registra los PID de Django/Vite dejados activos para revisión.
Paso 11: README y entregable elaborados, evidencias integradas y auditoría local.
Pendiente únicamente el cotejo académico literal de las capacidades con la guía
original; no se declara verificado ese texto. Paso 12 pendiente de publicación.
No se hicieron commits ni push.
