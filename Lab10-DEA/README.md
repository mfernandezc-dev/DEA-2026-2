# Laboratorio N.º 10 — Componentes y eventos

**Alumno:** Michael Fernandez  
**Curso:** Desarrollo de Aplicaciones Empresariales — Tecsup  
**Proyecto:** Cine Lumière, continuación de la cartelera del Laboratorio 09.  
**Referencia solicitada:** GLAB-S10-MMONTGOMERY-2026-02.

> No se encontró el documento original de la guía en la copia. Se implementaron los diez requerimientos y la rúbrica transcritos en la solicitud. Queda pendiente contrastar el formato y cualquier indicación no transcrita con la guía original. Las capturas y los resultados indicados como ejecutados son reales; no se garantiza una calificación del docente.

## 1. Ejecución local

Desde **`Lab10-DEA`**, sin entrar en otra carpeta:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir **http://127.0.0.1:5173/**. Si las dependencias ya están disponibles, basta el segundo comando. Detener el servidor con `Ctrl+C`. Si el puerto está ocupado por otro laboratorio, no detenerlo: utilizar `--port 5174` y abrir ese puerto.

```powershell
npm run build
npm run lint
npm ls --depth=0
npm test
```

- `build` genera la salida de producción en `dist/`.
- `lint` ejecuta el analizador Oxlint existente.
- `test` abre Chrome o Edge sin interfaz gráfica, ejecuta las pruebas con eventos de navegador, regenera las seis capturas del laboratorio y guarda `evidencias/resultados-pruebas.json`. Levanta su propio servidor en un puerto libre y usa un perfil temporal dentro de `node_modules/.cache/`; cierra ambos y elimina ese perfil al terminar. No cambia las favoritas de tu navegador personal.
- No se añadieron dependencias. Las pruebas utilizan Node.js, el protocolo de depuración del navegador y Vite, que ya estaba instalado. Si Chrome o Edge no está en sus rutas habituales, definir su ejecutable antes de las pruebas: `$env:CHROME_PATH = 'C:\ruta\chrome.exe'`.

**Entorno verificado:** Windows, Node.js 24.15.0, npm 11.12.1, React/React DOM 19.3.1, Vite 8.3.6, plugin React 6.2.1 y Oxlint 1.91.0. Se recomienda Node.js 22.12 o posterior para Vite y las herramientas de prueba.

La persistencia pertenece al origen del navegador: cambiar entre `localhost` y `127.0.0.1`, cambiar el puerto, borrar los datos del sitio o usar otro perfil implica un almacenamiento diferente. Para verificar recargas, conservar la misma dirección y perfil.

## 2. Inspección y organización

La raíz real era `Lab10-DEA/Lab09-DEA`: una aplicación JavaScript/JSX con React y Vite, sin backend, Python, API ni base de datos. Se revisaron los componentes, los ocho registros de películas, los estilos, las imágenes, la configuración, las dependencias y la documentación heredada.

Antes de implementar se ejecutaron `build`, `lint` y `npm ls --depth=0`. Después de mover el contenido a `Lab10-DEA`, se verificaron los **482 archivos** por existencia y tamaño, y por SHA-256 para los archivos fuera de `node_modules`. Solo después se retiró la carpeta anidada, ya vacía. Se conservaron las dependencias, las imágenes y las dos capturas heredadas, sin duplicar la aplicación.

También se comprobó la cartelera original en Chrome: ocho tarjetas, 24 horarios, nueve imágenes cargadas, navegación y ausencia de desbordamiento a 1440, 390 y 320 píxeles. No se modificó el Laboratorio 09 original ni otros proyectos.

### Estructura final

```text
Lab10-DEA/
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── README.md
├── public/
│   ├── favicon.svg
│   └── images/                 # Ocho afiches y un banner SVG originales
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── Button/Button.jsx
│   │   ├── Footer/Footer.jsx
│   │   ├── Header/Header.jsx
│   │   ├── Hero/Hero.jsx
│   │   ├── MovieCard/MovieCard.jsx
│   │   ├── MovieList/MovieList.jsx
│   │   └── MovieSearch/MovieSearch.jsx
│   ├── data/movies.js
│   └── styles/global.css
├── tests/
│   └── browser.test.mjs
├── evidencias/
│   ├── 01-cartelera-escritorio.png       # Heredada del Laboratorio 09
│   ├── 02-cartelera-movil.png            # Heredada del Laboratorio 09
│   ├── 03-lab10-cartelera.png
│   ├── 04-lab10-favoritas.png
│   ├── 05-lab10-favoritas-recargadas.png
│   ├── 06-lab10-busqueda.png
│   ├── 07-lab10-estado-vacio.png
│   ├── 08-lab10-movil.png
│   └── resultados-pruebas.json
├── node_modules/               # Dependencias locales, ignoradas por Git
└── dist/                       # Compilación local, ignorada por Git
```

## 3. Desarrollos, código y evidencias

Los fragmentos siguientes explican los cambios; el código completo está en los archivos enlazados, sin copias adicionales de componentes.

### Desarrollo 1 — Conservar la cartelera y ampliar los estilos

**Alumno:** Michael Fernandez.

Se conservaron encabezado, navegación, banner, llamada a la acción, sinopsis, clasificaciones, valoraciones, afiches, horarios y contacto ficticio. [global.css](src/styles/global.css) añade únicamente estilos para botones, buscador, ayuda y estado vacío, manteniendo colores y diseño adaptable.

```css
button, input { font: inherit; }
.button--primary { background: var(--accent); color: #151821; }
.button--secondary { background: transparent; color: var(--accent); }
.favorite-button { width: 100%; margin-top: 20px; }
```

**Captura del resultado:** [cartelera completa](evidencias/03-lab10-cartelera.png).  
**Caso ejecutado:** ocho películas, 24 horarios y nueve imágenes; diseño comprobado a 1440, 390 y 320 píxeles, sin desbordamiento horizontal.

### Desarrollo 2 — Button reutilizable

**Alumno:** Michael Fernandez.

[Button.jsx](src/components/Button/Button.jsx) recibe `children`, `variant`, `className` y el resto de propiedades, incluido `onClick`. Comparte las clases base entre las variantes `primary` y `secondary`.

```jsx
function Button({ children, variant = 'primary', className = '', href, type = 'button', ...props }) {
  const buttonClassName = `button button--${variant} ${className}`.trim()

  if (href) {
    return <a className={buttonClassName} href={href} {...props}>{children}</a>
  }

  return <button className={buttonClassName} type={type} {...props}>{children}</button>
}
```

Se reutiliza en `Hero` y en las ocho tarjetas. La aplicación anterior no tenía elementos `<button>`: sus horarios eran informativos y la llamada a la acción era un enlace. `href` permite conservar esa navegación como enlace real, sin convertir los horarios en compras ni añadir comportamientos ajenos al laboratorio. Los botones de acción usan `type="button"` por defecto.

**Captura del resultado:** [variantes en banner y favoritas](evidencias/04-lab10-favoritas.png).  
**Caso ejecutado:** enlace `primary`, botones `secondary`, cambio a `primary` al marcar una favorita y navegación a `#cartelera` sin recargar.

### Desarrollo 3 — Favoritas con useState en App

**Alumno:** Michael Fernandez.

[App.jsx](src/App.jsx) es el propietario de `favoriteIds`. La actualización funcional utiliza el estado más reciente: agrega un ID si no existe o lo retira si ya estaba seleccionado, sin mutar el arreglo anterior.

```jsx
function handleToggleFavorite(movieId) {
  setFavoriteIds((currentIds) => (
    currentIds.includes(movieId)
      ? currentIds.filter((id) => id !== movieId)
      : [...currentIds, movieId]
  ))
}
```

**Captura del resultado:** [dos películas favoritas](evidencias/04-lab10-favoritas.png).  
**Casos ejecutados:** agregar dos películas, quitar una sin afectar la otra, volver a agregarla y comprobar que no se recarga la página ni se duplican IDs.

### Desarrollo 4 — Eventos y estado visual en MovieCard

**Alumno:** Michael Fernandez.

[MovieCard.jsx](src/components/MovieCard/MovieCard.jsx) recibe `movie`, `isFavorite` y `onToggleFavorite`. No tiene un estado independiente de favoritas ni modifica arreglos de `App`.

```jsx
<Button
  className="favorite-button"
  variant={isFavorite ? 'primary' : 'secondary'}
  aria-pressed={isFavorite}
  aria-label={`${isFavorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}: ${movie.title}`}
  onClick={() => onToggleFavorite(movie.id)}
>
  <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
  {isFavorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}
</Button>
```

La tarjeta notifica al padre con el ID. React recibe las nuevas props y actualiza texto, corazón, variante visual y `aria-pressed`.

**Captura del resultado:** [tarjetas marcadas y desmarcadas](evidencias/04-lab10-favoritas.png).  
**Casos ejecutados:** clics reales de navegador, cambio de `aria-pressed`, variantes y conservación de la selección de otras películas.

### Desarrollo 5 — Entrada controlada MovieSearch

**Alumno:** Michael Fernandez.

[MovieSearch.jsx](src/components/MovieSearch/MovieSearch.jsx) conserva únicamente el texto que está escribiendo el usuario.

```jsx
const [query, setQuery] = useState('')

<input
  id="movie-search"
  type="search"
  value={query}
  onChange={(event) => setQuery(event.target.value)}
  aria-describedby="movie-search-help"
  aria-controls="movie-results"
/>
```

El campo también tiene etiqueta visible, placeholder y una explicación del retardo. `value` proviene del estado y `onChange` lo actualiza, por lo que no es una entrada no controlada.

**Captura del resultado:** [buscador con texto](evidencias/06-lab10-busqueda.png).  
**Caso ejecutado:** el texto cambia inmediatamente al escribir; la cartelera todavía conserva las ocho películas antes del retardo.

### Desarrollo 6 — Retardo y limpieza de temporizadores

**Alumno:** Michael Fernandez.

El efecto de `MovieSearch` programa la comunicación con el padre y cancela la ejecución anterior cuando cambia `query`, cambia la función recibida o se desmonta el componente.

```jsx
useEffect(() => {
  const timeoutId = setTimeout(() => {
    console.info('[MovieSearch] Debounced search:', query)
    onSearchChange(query)
  }, 400)

  return () => clearTimeout(timeoutId)
}, [query, onSearchChange])
```

**Captura del resultado:** [resultado tras el retardo](evidencias/06-lab10-busqueda.png). Los mensajes reales están en [resultados-pruebas.json](evidencias/resultados-pruebas.json). La captura visual de DevTools queda pendiente manual.

**Caso ejecutado:** se escribió `faro` carácter por carácter con pausas de 25 ms; la lista seguía completa antes de vencer el retardo y luego mostró una película. Se registró un solo mensaje con `faro`, sin mensajes de las búsquedas intermedias. La limpieza al cambiar el texto fue comprobada en navegador; la limpieza al desmontar está implementada en el retorno del efecto, pero no tiene una prueba de desmontaje aislada.

### Desarrollo 7 — Filtrado de MovieList y estado vacío

**Alumno:** Michael Fernandez.

[MovieList.jsx](src/components/MovieList/MovieList.jsx) recibe `searchTerm` y genera una lista derivada, sin modificar `movies` ni conservar otra copia en estado.

```jsx
const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es')
const filteredMovies = movies.filter((movie) => (
  movie.title.toLocaleLowerCase('es').includes(normalizedSearch)
))
```

La lista usa `map()` y `key={movie.id}`. Si no hay coincidencias, muestra:

```jsx
<p className="empty-state" role="status">
  No se encontraron películas. Prueba con otro título.
</p>
```

El contenedor de resultados utiliza `aria-live="polite"`. La coincidencia es parcial por título, no distingue mayúsculas y descarta espacios externos; conserva las tildes. Por ejemplo, `faro` encuentra `El último faro`.

**Capturas del resultado:** [una coincidencia](evidencias/06-lab10-busqueda.png) y [estado vacío](evidencias/07-lab10-estado-vacio.png).  
**Casos ejecutados:** `faro`, ` FARO `, `cielo`, `zzzz-no-existe` y búsqueda vacía. Al borrar el criterio se recuperaron los ocho títulos, 24 horarios y las favoritas anteriores.

### Desarrollo 8 — Buscador integrado en el banner

**Alumno:** Michael Fernandez.

[Hero.jsx](src/components/Hero/Hero.jsx) mantiene la llamada a la acción y recibe la función del padre para transmitírsela al buscador:

```jsx
<Button className="hero-link" variant="primary" href="#cartelera">
  Explorar cartelera <span aria-hidden="true">↗</span>
</Button>
<MovieSearch onSearchChange={onSearchChange} />
```

`App` conecta el banner y la cartelera:

```jsx
<Hero movie={featuredMovie} onSearchChange={setSearchTerm} />
<MovieList
  movies={movies}
  searchTerm={searchTerm}
  favoriteIds={favoriteIds}
  onToggleFavorite={handleToggleFavorite}
/>
```

**Capturas del resultado:** [banner y cartelera filtrada](evidencias/06-lab10-busqueda.png), [vista móvil](evidencias/08-lab10-movil.png).  
**Casos ejecutados:** ubicación del campo dentro de `.hero`, búsqueda desde el banner y navegación de la llamada a la acción.

### Desarrollo 9 — Persistencia con localStorage

**Alumno:** Michael Fernandez.

`App` carga los IDs mediante un inicializador de `useState`, antes del primer guardado, y los sincroniza cuando cambia la selección.

```jsx
const favoritesStorageKey = 'lab10-dea:favoriteIds'
const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds)

useEffect(() => {
  try {
    localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds))
  } catch (error) {
    console.warn('[App] Could not save favorites:', error.message)
  }
}, [favoriteIds])
```

`loadFavoriteIds()` lee y analiza el JSON, acepta solo arreglos, conserva IDs presentes en la cartelera y elimina duplicados con `Set`. Los errores de lectura se capturan y se comienza con una selección vacía. No se creó una base de datos ni se duplicaron las películas completas en el almacenamiento.

**Captura del resultado:** [favoritas después de recargar realmente](evidencias/05-lab10-favoritas-recargadas.png).  
**Casos ejecutados:** conservar dos favoritas al recargar; quitar todas y recargar conservando `[]`; recuperar una lista almacenada con IDs repetidos, desconocidos y valores no válidos. No se simularon cuotas agotadas ni bloqueo de `localStorage`; esos fallos se manejan con `try/catch`, pero no se presentan como pruebas ejecutadas.

### Desarrollo 10 — Ubicación de estados y comunicación padre-hijo

**Alumno:** Michael Fernandez.

| Dato recordado o derivado | Ubicación | Motivo |
| --- | --- | --- |
| `favoriteIds` (`useState`) | `App` | La selección pertenece a toda la cartelera; es la única fuente de verdad de favoritas. |
| `query` (`useState`) | `MovieSearch` | Texto inmediato de la entrada controlada; cada pulsación solo actualiza el buscador. |
| `searchTerm` (`useState`) | `App` | Último criterio confirmado después del debounce; conecta buscador y lista, que están en ramas distintas. |
| `timeoutId` | Variable local de `useEffect` | Es un recurso temporal, no un dato visual; se cancela en la limpieza y no necesita `useState`. |
| `filteredMovies` | Variable derivada en `MovieList` | Se calcula desde props; almacenarla en estado duplicaría información y exigiría sincronizarla. |
| `isFavorite` | Prop derivada por `MovieList` | Se calcula con `favoriteIds.includes(movie.id)`; la tarjeta no conserva una segunda selección. |
| `movies` y `featuredMovie` | Datos estáticos / referencia en `App` | No cambian por los eventos; no necesitan estado. |
| IDs serializados | `localStorage` | Respaldo persistente de `favoriteIds`, no otro estado React independiente. |

`query` y `searchTerm` tienen momentos distintos: el primero refleja lo que se escribe y el segundo lo que ya puede filtrar. Durante el retardo pueden diferir deliberadamente; no son dos copias sincronizadas en cada pulsación. Se pasa directamente `setSearchTerm`, cuya referencia estable evita reiniciar el efecto al cambiar favoritas.

```text
App (favoriteIds, searchTerm)
├── Hero (onSearchChange)
│   ├── Button (children, variant, href)
│   └── MovieSearch (query → retardo → onSearchChange)
└── MovieList (movies, searchTerm, favoriteIds, onToggleFavorite)
    └── MovieCard (movie, isFavorite, onToggleFavorite)
        └── Button (children, variant, onClick)
```

**Capturas del resultado:** [selección compartida](evidencias/04-lab10-favoritas.png) y [búsqueda conectada](evidencias/06-lab10-busqueda.png). La captura de la estructura en el editor queda pendiente manual.

**Casos ejecutados:** una tarjeta cambia la selección mediante la función recibida; otras tarjetas conservan su estado; el buscador del banner actualiza la lista; filtrar y restablecer no borra las favoritas. La revisión del código confirma que los hijos no acceden al setter de favoritas ni mutan sus props.

## 4. Pruebas realizadas y resultados

### Comandos ejecutados

| Comando | Resultado observado |
| --- | --- |
| `npm run build` | Compilación correcta antes de los cambios y en la implementación final. |
| `npm run lint` | Sin diagnósticos en la copia inicial y en la implementación final. |
| `npm ls --depth=0` | Dependencias directas disponibles, sin faltantes. |
| `node tests/browser.test.mjs --baseline` | Verificación inicial de la cartelera, diseño y consola, antes de ampliar el archivo de pruebas. La opción era del auxiliar inicial, no es un modo de la suite final. |
| `npm test` | **14 grupos de verificación aprobados** en Chrome real sin interfaz gráfica. |

### Casos automatizados de la versión final

| N.º | Caso | Resultado |
| --- | --- | --- |
| 1 | Cartelera original: ocho tarjetas, 24 horarios, nueve imágenes y secciones originales | Aprobado |
| 2 | Reutilización de Button, variantes y llamada a la acción sin recargar | Aprobado |
| 3 | Agregar dos favoritas, estado visual y ausencia de duplicados | Aprobado |
| 4 | Quitar y volver a agregar sin afectar otra película ni recargar | Aprobado |
| 5 | Persistencia de selección y botones después de una recarga real | Aprobado |
| 6 | Campo controlado dentro del banner y actualización inmediata del texto | Aprobado |
| 7 | Debounce de 400 ms, cancelación de búsquedas intermedias y mensaje de consola | Aprobado |
| 8 | Coincidencia parcial, mayúsculas, espacios externos y selección al filtrar | Aprobado |
| 9 | Estado vacío, contador en cero y mensaje de estado accesible | Aprobado |
| 10 | Borrar la búsqueda recupera los datos y las favoritas originales | Aprobado |
| 11 | Eliminar todas las favoritas persiste un arreglo vacío tras recargar | Aprobado |
| 12 | Limpieza de IDs repetidos, desconocidos o no válidos almacenados | Aprobado |
| 13 | Vistas de 1440, 390 y 320 píxeles sin desbordamiento horizontal | Aprobado |
| 14 | Sin errores/advertencias de consola ni solicitudes fallidas | Aprobado |

El registro incluye la fecha real de ejecución en UTC, los mensajes de consola y las rutas de las capturas. Los mensajes informativos de React DevTools y conexión de Vite no son errores. La suite prueba el servidor de desarrollo; `build` comprueba por separado la compilación de producción, no una sesión de navegación sobre `preview`.

## 5. Evidencias y pendientes manuales

### Evidencias generadas del Laboratorio 10

| Archivo | Contenido real |
| --- | --- |
| [03-lab10-cartelera.png](evidencias/03-lab10-cartelera.png) | Página completa con banner, buscador y ocho películas. |
| [04-lab10-favoritas.png](evidencias/04-lab10-favoritas.png) | Dos películas seleccionadas; variantes de Button visibles. |
| [05-lab10-favoritas-recargadas.png](evidencias/05-lab10-favoritas-recargadas.png) | Selección conservada después de recargar la página. |
| [06-lab10-busqueda.png](evidencias/06-lab10-busqueda.png) | `faro` escrito en el banner y una coincidencia en la cartelera. |
| [07-lab10-estado-vacio.png](evidencias/07-lab10-estado-vacio.png) | `zzzz-no-existe`, cero películas y mensaje de estado vacío. |
| [08-lab10-movil.png](evidencias/08-lab10-movil.png) | Página completa con ventana de 390 píxeles y una favorita. |
| [resultados-pruebas.json](evidencias/resultados-pruebas.json) | Resultado de los 14 casos y mensajes reales del debounce. |

Las imágenes `01` y `02` se conservaron como antecedentes del Laboratorio 09: **no son evidencias nuevas del Laboratorio 10**. Las seis capturas nuevas son páginas completas obtenidas directamente del navegador, no montajes. Esta documentación enlaza cada resultado con su desarrollo y código.

### Evidencias que debes completar manualmente

1. **Estructura en el editor:** abrir solamente `Lab10-DEA`; expandir `src/components` con sus siete carpetas, `data`, `styles`, `public`, `tests` y `evidencias`. Mantener `node_modules` y `dist` contraídos. Capturar el explorador real; no se generó una imagen del editor.
2. **Código:** si el formato de la guía exige capturas en lugar de los archivos y fragmentos incluidos, capturar `App.jsx`, `Button.jsx`, `MovieCard.jsx`, `MovieSearch.jsx`, `MovieList.jsx`, la integración de `Hero.jsx` y los estilos añadidos. Anotar en cada desarrollo el alumno y título indicados arriba.
3. **Consola visual:** abrir `F12 → Console`, habilitar mensajes informativos, limpiar la consola y escribir rápidamente `faro`. Capturar el único mensaje de búsqueda confirmado y su resultado. El JSON ya registra el mensaje, pero no sustituye una captura visual de DevTools si la guía la exige.
4. **Warp y entorno:** capturar `node --version`, `npm --version`, la URL de `npm run dev` y las salidas correctas de `npm run build`, `npm run lint` y `npm test` si se solicitan como evidencia visual.
5. **Guía original y entrega:** contrastar este README con el documento GLAB-S10-MMONTGOMERY-2026-02 y trasladar las evidencias a su formato de entrega si corresponde. No se ha preparado un documento con formato oficial que no estaba disponible.

No hace falta repetir manualmente el estado vacío para disponer de una captura: `07-lab10-estado-vacio.png` ya contiene ese resultado real.

## 6. Archivos creados, modificados y conservados

- **Creados:** `Button/Button.jsx`, `MovieSearch/MovieSearch.jsx`, `tests/browser.test.mjs`, seis capturas nuevas y el registro JSON de pruebas.
- **Modificados:** `App.jsx`, `Hero.jsx`, `MovieCard.jsx`, `MovieList.jsx`, `global.css` y este README. En `Footer.jsx` e `index.html` únicamente se actualizó la identificación del laboratorio; en `package.json` se actualizó el nombre y se añadió `test`; en `package-lock.json` solo se actualizó el nombre del proyecto.
- **Conservados sin cambios de funcionalidad:** `Header`, datos originales de películas, `main.jsx`, ilustraciones, favicon y configuraciones de Vite/Oxlint/Git. La compilación local se regeneró al verificar.
- **Reubicados:** todo el contenido necesario de la copia, incluidos archivos ocultos, dependencias y evidencias heredadas. No queda una aplicación duplicada o anidada.

## 7. Comprobación de la rúbrica

| Criterio | Valor de la guía | Evidencia de cumplimiento | Estado |
| --- | --- | --- | --- |
| Componentes reutilizables | 5 puntos | Mismo `Button` en banner y tarjetas; `children`, `variant`, eventos y atributos cambian mediante props. `MovieCard` también se repite por cada registro. | Implementado y probado |
| useState y eventos | 5 puntos | Favoritas en `App`, texto controlado, debounce y respuestas a `onClick`/`onChange` sin recargas. | Implementado y probado |
| Comunicación padre-hijo | 5 puntos | Funciones mediante props; `MovieSearch` y `MovieCard` notifican al padre sin modificar su estado. | Implementado, revisado y probado |
| Entrega y observaciones | 5 puntos | Raíz organizada, una carpeta por componente, código y explicaciones de estados, pruebas, evidencias y conclusiones. | Documentado; faltan capturas manuales y contraste con la guía original |

Los diez requerimientos funcionales están implementados. La tabla no asigna una nota ni declara completadas las evidencias manuales pendientes.

## 8. Conclusiones

1. `Button` permite reutilizar presentación y eventos sin escribir una implementación por cada apariencia.
2. Mantener las favoritas en `App` evita que cada tarjeta conserve selecciones diferentes; las props permiten reflejar siempre el estado del padre.
3. Separar el texto inmediato del criterio confirmado permite aplicar el retardo antes de filtrar, cancelando búsquedas intermedias.
4. `localStorage` conserva una selección pequeña entre recargas sin incorporar backend ni base de datos, mientras el filtrado deja intacta la cartelera original.

**Restricciones respetadas:** todos los cambios quedaron en `Lab10-DEA`; no se modificaron otros laboratorios, no se añadieron tecnologías ni dependencias, no se ejecutaron commits o pushes, no se crearon ramas y no se publicó nada en GitHub. La subida requiere autorización posterior.
