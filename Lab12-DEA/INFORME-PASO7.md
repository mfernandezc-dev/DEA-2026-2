# PASO 7 — Verificación final de Lab12-DEA

## Resultado

**Preparado para publicarse en GitHub como laboratorio académico, exclusivamente con la [lista cerrada de archivos](PUBLICACION-LAB12.txt).** No se ha publicado ni autorizado una operación de Git. No es una configuración de producción: conserva `DEBUG=True`, permisos locales `AllowAny` y una clave de desarrollo explícitamente insegura.

## Estado recibido y correcciones limitadas

- Se inspeccionaron los archivos antes de continuar. `Lab12-DEA` aparece completo como no versionado; no existe un diff de cambios previos de este laboratorio. Los archivos no versionados de Lab11 quedaron fuera del trabajo.
- Las dos capturas públicas y los `.gitignore` ya existían; no se repitió la anonimización ni se sobrescribieron los originales.
- Los auxiliares de `ERR_ABORTED` y cierre por PID ya estaban implementados. Se añadieron pruebas de regresión, sin reemplazar la lógica de la aplicación.
- La primera verificación del navegador detectó una carrera de CDP al recargar: `Inspected target navigated or closed`. Se corrigió el sondeo de la suite para reintentar solo el reemplazo de contexto del protocolo; las excepciones de la aplicación continúan fallando. El intento fallido se conserva localmente y no se cuenta como aprobado.
- Se actualizaron [README.md](README.md) y [ENTREGABLE-LAB12.md](ENTREGABLE-LAB12.md): ahora enlazan las dos capturas `*-publica.png` y describen las correcciones ya aplicadas, no como propuestas pendientes.

## Verificaciones ejecutadas

| Verificación | Resultado | Alcance |
|---|---|---|
| Sintaxis JavaScript y Python | Correcta | `node --check` en JS/MJS; AST de 21 archivos Python; JSX comprobado por lint/build |
| `npm run lint` | Código 0 | Sin diagnósticos |
| `npm run build` | Código 0 | 97 módulos; no prueba un despliegue de producción |
| `npm run test:api` | 14/14; código 0 | Axios sobre HTTP de prueba y adaptador de películas |
| `node --test tests/requestAudit.test.mjs` | 11/11; código 0 | Cancelación probada, navegación, recuperación y exclusiones negativas |
| `manage.py check` | Código 0 | Sin incidencias |
| `manage.py test --verbosity 2 --noinput` | 48/48; código 0 | Base de pruebas en memoria; sin migraciones sobre SQLite original |
| `npm run test:integration:fixture` | 47/47; código 0 | CRUD, paginación, HTTP 503, DELETE fallido y regresiones, solo en el servidor de pruebas |
| Suite de `npm test`, mediante `node tests/verify-step7.mjs` | 68/68; código 0 | Ejecuta `node tests/browser.test.mjs` contra Django real con SQLite de solo lectura |
| Cierre seguro | Correcto; código 0 | Rechaza un objeto PID sin `ChildProcess`, cierra el árbol propio, admite cierre repetido, conserva un proceso hermano y libera los puertos |

Evidencias actuales: [integración con fixture](frontend/evidencias/lab12-fixture-5nK7XI/results.json), [resumen del navegador](frontend/evidencias/lab12/paso7-verificacion/browser-summary.json) y [verificación de solo lectura y hashes](frontend/evidencias/lab12/paso7-verificacion/readonly-YVPoMM/read-only-browser.json). Los registros utilizan UTC y pueden indicar el 16 de noviembre; la fecha local de trabajo corresponde al 15 de noviembre de 2026.

### `ERR_ABORTED`

Se verificó una petición GET real pendiente, desmontaje de `ExamList`, cancelación de XHR y recuperación posterior con HTTP 200. El resumen registra 12 cancelaciones esperadas, todas con prueba de limpieza; cero errores de navegador y cero solicitudes fallidas inesperadas. El filtro exige endpoint, método, origen del componente, `canceled=true`, error exacto y recuperación; no acepta una cancelación desconocida solo por su texto.

Las pruebas negativas mantienen visibles CORS, conexión rechazada, bloqueos, otros endpoints, POST y errores HTTP. La navegación marcada por el ejecutor solo autoriza la excepción después de completarse y recuperarse el GET.

### Integridad y procesos

El [ejecutor de verificación](frontend/tests/verify-step7.mjs) cambia la conexión SQLite **solo en la memoria del proceso**, con URI `mode=ro`; no edita `settings.py`. El registro confirma hashes sin cambios en SQLite, configuración Django, requirements, package.json, package-lock y las dos capturas originales. Al terminar no quedan servidores de esta verificación en 8000 ni 5173. No se terminó ningún servidor preexistente: los puertos estaban libres antes de iniciar.

No se repitieron `seed_demo`, migraciones sobre la base original, la retirada de CORS ni `npm run test:integration` con CRUD en Django real. Sus evidencias anteriores siguen identificadas como históricas; esta etapa no las presenta como una ejecución nueva. Las 48 pruebas de Django crean su esquema y datos únicamente en memoria.

## Publicación y enlaces

La [lista exacta](PUBLICACION-LAB12.txt) contiene código, archivos de bloqueo, configuración no sensible, migraciones, pruebas, documentación, 11 capturas revisadas y los JSON seleccionados. No incluye comodines ni directorios completos de evidencias.

**Verificación final de la selección:** 111 archivos existentes, 119 enlaces Markdown comprobados, cero enlaces rotos y cero archivos seleccionados ignorados por Git; código de salida 0.

Quedan fuera, sin eliminarlos: SQLite y sus auxiliares, `.venv`, `node_modules`, `dist`, `.npm-cache`, perfiles, cachés, logs, respaldos, variables privadas, intentos incompletos y las dos capturas originales con token HMR. Los nombres dentro de los JSON históricos permanecen como registro de aquella ejecución; las versiones públicas se enlazan desde los documentos actuales. La captura de estructura conserva una ruta local con el usuario genérico `USER`; no contiene credenciales.

La comprobación reproducible de enlaces y selección es:

```powershell
# Desde Lab12-DEA/frontend; no modifica el índice Git.
node tests/verify-publication.mjs
```

Comprueba existencia de cada archivo, ausencia de rutas privadas o ignoradas y que cada enlace Markdown de la documentación esté incluido en la selección. Las direcciones `localhost` del texto son instrucciones de ejecución local, no enlaces públicos ni un despliegue publicado.

## Restricciones respetadas y siguiente acción

No se modificaron otros laboratorios, datos originales, dependencias ni modelos. No se eliminaron capturas ni archivos fuente existentes. Solo se limpiaron temporales nuevos creados por las propias pruebas y se regeneró la salida de build. No se ejecutaron `git add`, commits ni push.

**Detenido a la espera de autorización.** La publicación debe utilizar solo los archivos de `PUBLICACION-LAB12.txt`, no toda la carpeta de evidencias ni todos los archivos no versionados del repositorio padre.
