# Laboratorio N.º 09 — Cartelera de cine con React y Vite

**Estudiante:** Michael Fernandez

**Curso:** Desarrollo de Aplicaciones Empresariales — TECSUP

**Desarrollo:** Cine Lumière: componentes funcionales, JSX y comunicación mediante props.

**Referencia indicada:** GLAB-S09-MMONTGOMERY-2026-02.

> La carpeta estaba vacía y no contenía el documento original de la guía. El desarrollo se basa en los requisitos transcritos por el estudiante; queda pendiente contrastar su numeración y presentación con el documento original. No se ha modificado información de docentes ni autores.

## 1. Ejecución

Desde la carpeta `Lab09-DEA`:

```sh
npm install
npm run dev
```

Abrir la dirección que indique Vite. El servidor de esta sesión se inició en **http://127.0.0.1:5173/** mediante:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Si ese servidor sigue activo, no es necesario iniciar otro. `Ctrl+C` detiene el servidor desde la terminal que lo ejecuta.

Comprobaciones de la versión final:

```sh
npm run build
npm run lint
npm ls --depth=0
```

`build` genera `dist/`, una salida local ignorada por Git. `lint` es el analizador incluido por la plantilla, no una suite adicional de pruebas.

### Entorno comprobado

| Herramienta | Versión observada |
| --- | --- |
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| React / React DOM | 19.3.1 |
| Vite | 8.3.6 |

La versión instalada de Vite requiere Node.js `^20.19.0` o `>=22.12.0`; no basta cualquier versión inicial de Node 20. Se utilizó `npm create vite@latest . -- --template react --no-interactive` y después `npm install`. El proyecto es JavaScript/JSX, no TypeScript. Las herramientas de desarrollo y declaraciones de tipos incluidas por la plantilla no añaden bibliotecas visuales a la aplicación.

## 2. Procedimiento aplicado en 12 pasos

Esta secuencia organiza los requisitos transcritos; no pretende reproducir una numeración de la guía que no se ha podido consultar.

1. **Inspección:** se comprobó la ubicación y que la carpeta estaba vacía, sin un proyecto anterior.
2. **Entorno:** se verificaron Node.js y npm; no fue necesario instalarlos.
3. **Creación:** se generó una sola aplicación React con JavaScript mediante Vite en la carpeta actual.
4. **Dependencias y limpieza:** se ejecutó `npm install`, se retiraron el contador, los estilos y las imágenes de demostración y se conservaron las configuraciones de Vite y del analizador.
5. **Organización:** se separaron componentes, datos y estilos; cada componente tiene su propia carpeta.
6. **Encabezado:** se implementó `Header` y se comprobó su renderizado en Chrome antes de integrar el resto de la interfaz.
7. **Pie de página:** se implementó `Footer` con información general y contacto claramente ficticio.
8. **Datos y destacado:** se centralizaron ocho películas en `movies.js`; `App` envía la primera a `Hero` mediante props.
9. **Tarjeta reutilizable:** se implementó `MovieCard`, que recibe una película y muestra sus datos sin fijar títulos ni horarios en el componente.
10. **Cartelera e integración:** `MovieList` recibe el arreglo, utiliza `map()` y genera tarjetas con `key={movie.id}`; `App` integra los cinco componentes.
11. **Presentación:** se aplicó CSS adaptable y se incorporaron ilustraciones SVG locales originales, sin servicios externos ni bibliotecas adicionales.
12. **Pruebas y evidencias:** se provocaron y corrigieron los tres errores solicitados, se verificó la aplicación final y se guardaron capturas reales.

## 3. Archivos y responsabilidades

```text
Lab09-DEA/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .oxlintrc.json
├── .gitignore
├── README.md
├── public/
│   ├── favicon.svg
│   └── images/                  # Ocho afiches y un banner SVG
├── evidencias/
│   ├── 01-cartelera-escritorio.png
│   └── 02-cartelera-movil.png
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/
    │   ├── Header/Header.jsx
    │   ├── Footer/Footer.jsx
    │   ├── Hero/Hero.jsx
    │   ├── MovieCard/MovieCard.jsx
    │   └── MovieList/MovieList.jsx
    ├── data/movies.js
    └── styles/global.css
```

`node_modules/` contiene las dependencias y `dist/` la compilación; no son código fuente para el informe.

| Archivo o componente | Responsabilidad |
| --- | --- |
| `index.html` | Documento en español, metadatos y nodo de montaje `root`. |
| `src/main.jsx` | Monta `App` con React DOM e importa el CSS global. |
| `src/App.jsx` | Importa los datos, selecciona la película destacada y compone la página. |
| `Header` | Nombre del cine y enlaces internos a inicio, cartelera y contacto. |
| `Hero` | Recibe `movie` por props y muestra banner, título, clasificación, género, valoración y sinopsis. |
| `MovieCard` | Recibe `movie` por props; muestra afiche, título, clasificación, género, sinopsis, valoración y horarios. Los horarios son informativos, no botones de compra. |
| `MovieList` | Recibe `movies` por props y genera una tarjeta por película con `map()` y una clave estable. |
| `Footer` | Información general y datos ficticios de contacto del cine. |
| `src/data/movies.js` | Fuente única de los datos de las ocho películas y de las rutas de sus imágenes. |
| `src/styles/global.css` | Estilos del encabezado, hero, tarjetas, cuadrícula y pie; adaptación a escritorio, tableta y móvil. |
| `public/images/` | Ilustraciones SVG locales: no requieren conexión con un proveedor de imágenes. |
| `vite.config.js`, `package*.json`, `.oxlintrc.json`, `.gitignore` | Configuración, dependencias reproducibles, análisis de código y exclusiones de archivos generados. |

### Código que demuestra JSX, props y renderizado dinámico

En `App.jsx`:

```jsx
const featuredMovie = movies[0]

<Hero movie={featuredMovie} />
<MovieList movies={movies} />
```

En `MovieList.jsx`:

```jsx
{movies.map((movie) => (
  <MovieCard key={movie.id} movie={movie} />
))}
```

En `MovieCard.jsx`:

```jsx
function MovieCard({ movie }) {
  // Full implementation is in the component file.
}
```

El flujo es `movies.js → App → Hero / MovieList → MovieCard`. Cada película tiene `id`, `title`, `image`, `synopsis`, `classification`, `rating` y `showtimes`. El género complementa la información principal, y la película destacada incluye `banner`. Las valoraciones se muestran sobre 5. `ATP` significa apta para todo público.

El código completo para presentar está en los archivos indicados; no es necesario copiarlo a archivos duplicados. Para las capturas del código, mostrar las funciones completas de cada componente.

## 4. Casos de prueba solicitados: errores provocados y corregidos

Los siguientes mensajes se obtuvieron realmente con Vite en desarrollo y Chrome. Se transcriben sin inventar ni sustituir el texto del diagnóstico. React registró los dos avisos de propiedades/listas en la consola con nivel `error`, aunque no impidieron renderizar la interfaz. El caso de dos raíces sí impidió compilar.

### Prueba 1 — `class` en lugar de `className`

**Archivo:** `src/components/Header/Header.jsx`.

Se cambió temporalmente:

```jsx
<header class="site-header" id="inicio">
```

**Mensaje real de la consola:**

```text
Invalid DOM property `class`. Did you mean `className`?
```

**Causa:** React espera `className` para expresar la clase CSS en sus propiedades JSX; `class` no es el nombre que espera esta interfaz de React DOM.

**Corrección aplicada:**

```jsx
<header className="site-header" id="inicio">
```

**Resultado:** encabezado visible; aviso ausente en la comprobación final con una página nueva.

### Prueba 2 — Dos nodos raíz adyacentes en JSX

**Archivo:** `src/components/Header/Header.jsx`.

Se agregó temporalmente un párrafo después del cierre de `header`, dentro del mismo `return`, sin un contenedor:

```jsx
return (
  <header>...</header>
  <p>Temporary JSX check</p>
)
```

**Mensaje real del panel de error de Vite en el navegador:**

```text
[plugin:vite:oxc] Transform failed with 1 error:

[PARSE_ERROR] Adjacent JSX elements must be wrapped in an enclosing tag.
```

**Diagnóstico real en `npm run build`:**

```text
[builtin:vite-transform] Adjacent JSX elements must be wrapped in an enclosing tag.
```

Ambos señalaron `src/components/Header/Header.jsx:16:5` y sugirieron:

```text
Help: Did you want a JSX fragment `<>...</>`?
```

**Causa:** dos expresiones JSX hermanas no constituyen una única expresión de retorno. Deben estar dentro de un contenedor o fragmento.

**Corrección aplicada:** se retiró el párrafo de prueba, dejando un único `header`. Cuando se necesitan varios hermanos, puede utilizarse `<>...</>`, como hace `App`.

**Resultado:** el fallo de compilación esperado se reprodujo, y la compilación volvió a completarse después de corregirlo.

### Prueba 3 — Falta de `key` en `map()`

**Archivo:** `src/components/MovieList/MovieList.jsx`.

Se omitió temporalmente la clave:

```jsx
{movies.map((movie) => (
  <MovieCard movie={movie} />
))}
```

**Mensaje real de la consola:**

```text
Each child in a list should have a unique "key" prop.

Check the render method of `MovieList`. See https://react.dev/link/warning-keys for more information.
```

**Causa:** React utiliza claves únicas y estables para identificar los elementos de una lista entre renderizados. Sin ellas no puede asociarlos de forma fiable cuando la lista cambia.

**Corrección aplicada:**

```jsx
{movies.map((movie) => (
  <MovieCard key={movie.id} movie={movie} />
))}
```

**Resultado:** las ocho tarjetas se renderizan y el aviso desapareció en la comprobación final. También se usa `key={showtime}` en los horarios; no se repiten horarios dentro de una misma película.

## 5. Verificación de la aplicación final

| Comprobación efectuada | Resultado observado |
| --- | --- |
| Instalación de dependencias | `npm install` completó; informó 0 vulnerabilidades en ese momento. |
| Dependencias directas | `npm ls --depth=0` sin dependencias faltantes. |
| Servidor de desarrollo | Vite accesible en `http://127.0.0.1:5173/`. |
| Compilación después de corregir los errores | `npm run build` completó correctamente. |
| Análisis estático | `npm run lint` terminó sin diagnósticos. |
| Renderizado real de React en Chrome | Encabezado, destacado, cartelera y pie visibles. |
| Películas y horarios | 8 tarjetas y 24 horarios renderizados. |
| Imágenes | 9 imágenes cargadas correctamente: banner y 8 afiches. |
| Props y `map()` | Revisados en `App`, `Hero`, `MovieList` y `MovieCard`; datos centralizados. |
| Escritorio y pantallas pequeñas | Comprobados anchos de 1440, 390 y 320 píxeles, sin desbordamiento horizontal. |
| Consola en versión final | Sin errores ni advertencias de React; sin solicitudes HTTP fallidas. |

El aviso informativo de React DevTools y los mensajes de conexión de Vite no son errores. Las verificaciones en navegador se realizaron con un auxiliar temporal sin instalar dependencias; no se entrega una suite de pruebas ni se dejan los cambios defectuosos.

## 6. Evidencias para el informe

### Capturas ya generadas

Son capturas reales de la aplicación en Chrome sin interfaz gráfica, no montajes:

- `evidencias/01-cartelera-escritorio.png`: página completa a 1440 píxeles de ancho, con encabezado, destacado, ocho tarjetas, horarios y pie.
- `evidencias/02-cartelera-movil.png`: página completa a 390 píxeles de ancho, con la adaptación a una columna.

### Capturas que debes registrar manualmente

No se han generado imágenes de Warp, del explorador de VS Code ni de la consola visual de DevTools. Para esas evidencias:

1. **Entorno y ejecución:** en Warp, ejecutar `node --version` y `npm --version`. Capturar también la salida de `npm run dev` con la URL local. No iniciar un segundo servidor en el mismo puerto si ya hay uno funcionando.
2. **Estructura:** abrir **únicamente `Lab09-DEA`** en VS Code. Expandir `src/components` y las cinco carpetas, `src/data`, `src/styles` y `public/images`. Dejar `node_modules` y `dist` contraídos y capturar el explorador.
3. **Código desarrollado:** capturar `App.jsx` y `movies.js`; después `Hero.jsx`, `MovieList.jsx` y `MovieCard.jsx` mostrando props, `map()` y `key`. Añadir `Header.jsx`, `Footer.jsx` y las reglas adaptables de `global.css` si el informe exige todo el código.
4. **Pruebas 1 y 3:** los mensajes reales están transcritos arriba, pero no hay captura de DevTools. Si se exige evidencia visual, abrir `F12 → Console`, introducir **un solo cambio temporal** exactamente como se describe en cada prueba, guardar y recargar la página. Capturar el mensaje; restaurar la corrección antes de pasar a la siguiente prueba.
5. **Prueba 2:** si se exige captura del error, introducir temporalmente el párrafo fuera de `header`, guardar y capturar el panel de error de Vite en el navegador o el fallo de `npm run build` en Warp. Eliminar el párrafo inmediatamente después.
6. **Versión corregida:** una vez restaurados `className`, la raíz única y `key`, recargar con la consola limpia. Capturar la aplicación sin avisos y la terminal con `npm run build` y `npm run lint` correctos.

No entregar el proyecto con los errores reproducidos para las capturas. Las imágenes completas de móvil son largas: pueden complementarse con recortes reales de la cabecera y una tarjeta, sin presentarlos como capturas adicionales ya generadas.

## 7. Observaciones

- Todos los archivos del desarrollo están dentro de `Lab09-DEA`; no se modificaron otros laboratorios.
- Películas, valoraciones, horarios y contacto son ficticios. La cartelera no anuncia sesiones reales.
- Las ilustraciones SVG se sirven desde `public/`; no hay APIs, peticiones a proveedores externos, backend ni base de datos.
- El contenido mostrado está en español; los identificadores de código y nombres de propiedades están en inglés.
- Los enlaces de navegación solo desplazan a secciones. No hay autenticación, búsqueda, filtros, compras ni pagos.
- No se crearon commits, ramas ni publicaciones; no se ejecutó `git push` ni se modificaron remotos.

## 8. Conclusiones

1. Vite permite crear, ejecutar y compilar una aplicación React con una configuración reducida.
2. Los cinco componentes funcionales separan responsabilidades y permiten construir una interfaz completa mediante JSX.
3. Las props transmiten los datos de `App` a los componentes hijos sin duplicarlos en la presentación.
4. `map()` y las claves estables permiten generar las ocho tarjetas desde un único arreglo.
5. Los errores reproducidos distinguen advertencias de React de fallos de sintaxis que detienen la compilación; todos quedaron corregidos.

**Estado:** implementación lista para revisión local. Pendientes las capturas manuales del informe y el contraste con la guía original. La publicación en GitHub requiere autorización posterior del estudiante.
