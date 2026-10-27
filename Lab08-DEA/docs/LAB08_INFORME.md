# Laboratorio N.º 08 — Implementación de Servicios Web con Django

**Curso:** Desarrollo de Aplicaciones Empresariales.  
**Carrera/ciclo:** Diseño y Desarrollo de Software, cuarto ciclo.  
**Estudiante:** completar en el formato del docente.  
**Fecha de verificación:** 27 de octubre de 2026.  
**Repositorio existente:** `https://github.com/mfernandezc-dev/DEA-2026-2`.  
**Directorio del trabajo:** `Lab08-DEA`.  
**Entrega:** preparación local; no se ha realizado commit ni push.

> Este archivo es material académico para trasladar a Word, no el documento
> definitivo. La numeración siguiente organiza en doce pasos los requisitos
> facilitados. Como no se adjuntaron la guía original ni la plantilla Word,
> debe cotejarse su numeración y formato antes de presentar el informe.

## Objetivo

Implementar una API REST con Django REST Framework que administre exámenes,
preguntas y opciones mediante JSON y operaciones HTTP, garantizando exactamente
una opción correcta por pregunta y verificando sus errores y consultas.

## Desarrollo de los doce pasos

### Paso 1. Inspección y preparación del entorno

Se comprobó que la carpeta estaba vacía y pertenecía al repositorio existente.
Python 3.14.3, pip 25.3 y Git 2.54.0.windows.1 estaban disponibles. El requisito
de Python 3.12 o superior se cumple. El lanzador `py` no estaba disponible;
se utilizó `python`. Django estaba instalado globalmente y DRF no.

Se creó `.venv` y se instalaron Django 5.2.15 LTS y DRF 3.16.1, sin alterar el
entorno global. `requirements.txt` fija las cinco bibliotecas instaladas,
incluidas las dependencias transitivas. `.gitignore` excluye entorno, cachés,
`.env`, SQLite y temporales. No se inicializó otro repositorio.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

**Resultado:** entorno local funcional. Si se bloquea la activación, usar
`.\.venv\Scripts\python.exe` directamente, sin cambiar políticas globales.

**Captura 1:** terminal en `Lab08-DEA` con `python --version`, versión de pip
del entorno y `git --version`; debe verse la ruta del laboratorio.

### Paso 2. Creación del proyecto y aplicación

Se ejecutaron los comandos de creación del proyecto `config` y la app `quiz`:

```powershell
.\.venv\Scripts\python.exe -m django startproject config .
.\.venv\Scripts\python.exe manage.py startapp quiz
```

`config` contiene la configuración general y `quiz` los modelos, serializadores,
ViewSets, rutas, pruebas y comando de datos demo.

**Resultado:** estructura estándar de Django, sin modificar otros laboratorios.

**Captura 2:** árbol del proyecto en el editor, mostrando `config`, `quiz`,
`scripts`, `docs`, `manage.py`, `.gitignore` y `requirements.txt`, sin expandir
`.venv` ni cachés.

### Paso 3. Configuración de Django y DRF

Se registraron `rest_framework` y `quiz.apps.QuizConfig`. Se mantuvo SQLite por
su sencillez y porque no requiere otro servicio para una práctica local.

Fragmento de `config/settings.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': (
        'rest_framework.pagination.PageNumberPagination'
    ),
    'PAGE_SIZE': 5,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}
```

**Resultado:** JSON y HTML navegable disponibles, cinco elementos por página,
permisos abiertos solo para desarrollo. La clave es un marcador local, no una
credencial de producción. No se expone el servidor a Internet.

### Paso 4. Modelos y migraciones

Se implementó la relación `Exam 1:N Question 1:N Option`:

| Modelo | Campos | Relación inversa |
|---|---|---|
| Exam | id, title, description, created_at | questions |
| Question | id, exam, text | options |
| Option | id, question, text, is_correct | — |

Fragmento de `quiz/models.py`:

```python
exam = models.ForeignKey(
    Exam, on_delete=models.CASCADE, related_name='questions'
)
```

Ambas relaciones usan `CASCADE`. Los títulos admiten 200 caracteres y los
textos de opciones 255. Los recursos se ordenan por id.

```powershell
.\.venv\Scripts\python.exe manage.py makemigrations quiz
.\.venv\Scripts\python.exe manage.py migrate
```

**Resultado:** `quiz/migrations/0001_initial.py` generado y aplicado.
`makemigrations --check --dry-run` confirmó que no faltan migraciones.

**Captura 3:** `showmigrations` con `[X] 0001_initial` dentro de `quiz`, junto
con el resultado de `manage.py check` sin problemas.

### Paso 5. Serializadores y relaciones anidadas

Se crearon `ExamSerializer`, `QuestionSerializer` y `OptionSerializer`, todos
derivados de `ModelSerializer`. El auxiliar `NestedOptionSerializer` limita los
campos de la representación anidada a id, texto y estado de correcta.

```python
class QuestionSerializer(serializers.ModelSerializer):
    options = NestedOptionSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'exam', 'text', 'options']
        read_only_fields = ['id']
```

`exam` se representa como identificador, no como objeto duplicado. Las opciones
se muestran dentro de la pregunta. Los identificadores y fechas de creación
son de solo lectura. Los campos expuestos están declarados explícitamente.

**Resultado:** JSON consistente y escrituras anidadas implementadas de forma
explícita, no delegadas al comportamiento predeterminado de DRF.

**Captura 4:** detalle de una pregunta en `/api/questions/1/`, mostrando
`exam: 1` y sus dos opciones anidadas.

### Paso 6. Validación de exactamente una opción correcta

La validación cuenta las opciones con `is_correct=True`:

```python
count = sum(option.get('is_correct', False) for option in options)
if count != 1:
    raise serializers.ValidationError(
        'A question must have exactly one correct option.'
    )
```

La creación y el reemplazo de opciones se realizan con `transaction.atomic`.
PATCH sin opciones las conserva; PATCH con opciones reemplaza la lista y exige
texto en cada elemento. Los ids anidados son de solo lectura y se regeneran.
PUT de pregunta exige también opciones. Se puede cambiar la correcta con un
solo PATCH anidado válido, sin pasar por un estado intermedio persistente.

En la base de datos se refuerza el máximo de una correcta:

```python
models.UniqueConstraint(
    fields=['question'],
    condition=models.Q(is_correct=True),
    name='one_correct_option_per_question',
)
```

Los endpoints directos de opciones rechazan una segunda correcta, desmarcar o
eliminar la única correcta y mover una opción a otra pregunta. Permiten editar
texto y crear/eliminar incorrectas. Se revalida al guardar dentro de la
transacción. Eliminar una pregunta o examen completo permite la cascada porque
la pregunta deja de existir.

**Límite explícito:** al menos una correcta es una regla de esta API, no un
trigger contra SQL directo ni cualquier escritura ORM. `select_for_update` no
provee bloqueo de filas en SQLite. Se probaron integridad y rollback, no carga
ni concurrencia; la práctica está orientada a desarrollo local.

**Resultado:** las entradas inválidas devolvieron 400 y no alteraron los datos.
Las pruebas de fallo durante `bulk_create` confirmaron rollback completo.

**Captura 5:** respuesta 400 al crear una pregunta con dos correctas y, después,
otra con cero correctas; incluir cuerpo JSON y mensaje de validación.

### Paso 7. Publicación mediante ViewSets

Se implementaron tres `ModelViewSet`: `ExamViewSet`, `QuestionViewSet` y
`OptionViewSet`. Proporcionan listado, detalle, creación, modificación parcial,
actualización PUT y eliminación. El de opciones protege la eliminación de la
única correcta mediante `perform_destroy` transaccional.

```python
class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
```

El de preguntas utiliza `select_related('exam')` y `prefetch_related('options')`
para evitar consultas repetidas al presentar opciones anidadas.

**Resultado:** los tres recursos tienen operaciones consistentes.

### Paso 8. Router y URLs

Fragmento de `quiz/urls.py`:

```python
router = DefaultRouter()
router.register('exams', ExamViewSet)
router.register('questions', QuestionViewSet)
router.register('options', OptionViewSet)
```

`config/urls.py` incluye `path('api/', include('quiz.urls'))`.
La raíz `/api/` muestra los enlaces de los tres recursos.

**Resultado:** `/api/exams/`, `/api/questions/` y `/api/options/` disponibles.
Todas las URLs documentadas usan barra final.

**Captura 6:** raíz `/api/` en el navegador con los enlaces de los tres recursos.

### Paso 9. Verificación de la API navegable

Primero se solicitaron por HTTP las páginas HTML de la raíz y los tres
recursos. Después se realizaron creación, detalle, PATCH y DELETE de cada
recurso y una validación de obligatorio ausente con `Accept: text/html`.
Se guardaron diecisiete respuestas HTML. Para publicación se anonimizaron
únicamente sus valores CSRF; los cuerpos y códigos de la API no se alteraron.

**Resultado real:** HTML 200 en consultas y PATCH, 201 en creaciones y 400 en
el error obligatorio. En DELETE, DRF transforma 204 en **200 con HTML** para
renderizar la página. Esto difiere de JSON, que conserva 204 sin cuerpo.

No se utilizó un navegador gráfico automatizado. La existencia del HTML y sus
datos se comprobó mediante HTTP y análisis del contenido; la inspección visual
de formularios y las capturas siguen siendo una actividad manual.

**Captura 7:** con el servidor iniciado, abrir `/api/exams/`, crear un examen
de práctica en el formulario y capturar el 201. Para preguntas anidadas usar
la pestaña **Raw data**, tipo `application/json`, y el JSON del README.
Completar detalle, edición y eliminación de esos registros manuales si se
requiere evidencia visual de todas las interacciones.

### Paso 10. Pruebas desde un cliente HTTP independiente

Se usó `urllib.request` de la biblioteca estándar, desde un proceso Python
independiente del servidor. No se usaron llamadas internas de Django en este
verificador y **no se afirma haber utilizado Postman**.

```powershell
.\.venv\Scripts\python.exe scripts\verify_http.py --start-server
```

El script inicia el servidor local sin autoreload, espera disponibilidad,
ejecuta los casos y lo detiene. Si ya está iniciado, omitir `--start-server`.
Solo admite un origen HTTP local y elimina exclusivamente sus datos de prueba.

| Operación JSON | Esperado | Obtenido | Recursos |
|---|---|---|---|
| GET listado | 200 | 200 | Los tres |
| GET detalle | 200 | 200 | Los tres |
| POST válido | 201 | 201 | Los tres |
| PATCH válido | 200 | 200 | Los tres |
| PUT válido | 200 | 200 | Los tres |
| DELETE permitido | 204, vacío | 204, vacío | Los tres |
| GET tras eliminación | 404 | 404 | Los tres |

Ejemplos de errores **realmente obtenidos** en la ejecución registrada:

| Caso | Endpoint/método | Cuerpo enviado | HTTP esperado/real | Respuesta real |
|---|---|---|---|---|
| Obligatorio ausente | POST `/api/exams/` | `{"description":"Missing title"}` | 400 / 400 | `{"title":["This field is required."]}` |
| Tipo incorrecto | POST `/api/questions/` | JSON de pregunta con `"exam":"not-an-integer"` | 400 / 400 | `{"exam":["Incorrect type. Expected pk value, received str."]}` |
| Booleano incompatible | PATCH de opción correcta | `{"is_correct":{"invalid":true}}` | 400 / 400 | `{"is_correct":["Must be a valid boolean."]}` |
| Cero correctas | POST de pregunta y PATCH anidado | Dos opciones con `false` | 400 / 400 | `{"options":["A question must have exactly one correct option."]}` |
| Dos correctas | POST de pregunta y PATCH anidado | Dos opciones con `true` | 400 / 400 | `{"options":["A question must have exactly one correct option."]}` |
| Eliminar única correcta | DELETE de opción correcta | Sin cuerpo | 400 / 400 | `{"is_correct":["A question must have exactly one correct option."]}` |

Cada caso completo, incluidos ids, cuerpos y respuestas JSON exactos, se
encuentra en [`evidence/HTTP_RESULTS.md`](evidence/HTTP_RESULTS.md) y
[`evidence/http-results.json`](evidence/http-results.json). Los errores de
campos usan listas de mensajes; los errores 404 usan el campo `detail` de DRF.
La evidencia conserva las respuestas reales.

**Resultado:** 64/64 solicitudes PASS: 17 HTML y 47 JSON. Todas las cinco
operaciones requeridas y la operación PUT adicional del ModelViewSet se
comprobaron en los tres recursos. Los datos de prueba temporales se eliminaron
mediante la API; no permanecen los ids históricos de esta ejecución.

**Captura 8:** terminal tras ejecutar el verificador, mostrando operaciones,
sus códigos y `HTTP evidence: 64/64 PASS`. Abrir también el caso de error
relevante en `HTTP_RESULTS.md` para capturar cuerpo y respuesta completos.

### Paso 11. Filtrado, búsqueda y paginación

`QuestionViewSet` filtra `exam` tras validarlo como entero positivo y aplica
`SearchFilter` al enunciado. Se pueden combinar ambas condiciones.

```text
/api/questions/?exam=1
/api/questions/?search=Django
/api/questions/?exam=1&search=Django
/api/questions/?page=2
```

Se generaron doce preguntas demo. El verificador añadió siete preguntas en un
examen propio para aislar los resultados de cualquier dato previo:

| Prueba HTTP | Esperado | Obtenido |
|---|---|---|
| Primera página filtrada | count 7, 5 registros, next | Cumplido, 200 |
| Seguir next | count 7, 2 registros, previous, next nulo | Cumplido, 200 |
| Seguir previous | Regresar a los mismos 5 registros | Cumplido, 200 |
| Búsqueda + examen | 6 coincidencias de Pagination | Cumplido, 200 |
| Filtro exam=abc | Error de entero | Cumplido, 400 |
| Página 999 | Página inexistente | Cumplido, 404 |

Después de eliminar los datos temporales quedan dos exámenes demo, doce
preguntas y veinticuatro opciones. En la base inicial `/api/questions/`
permite ver tres páginas de 5, 5 y 2 resultados; el primer examen tiene ocho
preguntas. Los enlaces registrados del examen temporal son históricos.

**Captura 9:** `/api/questions/` mostrando `count: 12`, cinco elementos y
`next`. Capturar la página 2 con `previous` y, opcionalmente, la tercera con dos
elementos. Para aislar un examen usar el id real de `/api/exams/`.

**Captura 10:** resultados de `/api/questions/?exam=1&search=Django`, mostrando
que las preguntas pertenecen al examen indicado y coinciden con el texto.

### Paso 12. Pruebas automatizadas, documentación y preparación local

Se escribieron 48 pruebas con `TestCase` y `APITestCase`: modelos y cascada,
serializadores, campos de solo lectura, transacciones con rollback, regla de
correcta en escrituras anidadas/directas, CRUD, errores, filtros, búsqueda y
paginación. Se ejecutan en una base de datos de pruebas aislada.

```powershell
.\.venv\Scripts\python.exe scripts\verify_local.py
```

| Verificación | Resultado real |
|---|---|
| manage.py test --verbosity 2 | Ran 48 tests; OK; salida 0 |
| manage.py check | Sin problemas; salida 0 |
| makemigrations --check --dry-run | No changes detected; salida 0 |
| showmigrations | Migraciones aplicadas |
| pip check | No broken requirements found; salida 0 |
| Repetir seed_demo | 0 preguntas nuevas |
| Longitud y espacios finales de Python | Máximo 79, sin espacios finales |

La salida original está en `evidence/local-checks.txt`. Se redactaron README,
contrato, informe y tabla. Las evidencias proceden de las ejecuciones locales;
los valores CSRF de los HTML se anonimizaron antes de publicarlos. Los HTML
no se presentan como capturas de pantalla.

**Captura 11:** terminal ejecutando `manage.py test --verbosity 2`, con
`Ran 48 tests`, `OK` y `System check identified no issues`.

**Captura 12:** tabla de la API del README y `git status --short` mostrando
únicamente archivos nuevos de `Lab08-DEA`, sin staging ni commit.

**Pendiente:** capturas visuales, traslado a la plantilla Word y autorización
expresa antes de staging, commit, push o entrega en GitHub. No se puede marcar
la publicación del repositorio como realizada.

## Tabla completa de la API (representación JSON)

Base: `http://127.0.0.1:8000`. Usar `Accept: application/json` y, con cuerpo,
`Content-Type: application/json`. `{id}` representa un registro existente.
Los ids relacionados de ejemplo deben adaptarse a la base usada.

| Recurso | Dirección | Método | Cuerpo de ejemplo | Respuesta esperada |
|---|---|---|---|---|
| Examen | `/api/exams/` | GET | — | 200, lista paginada |
| Examen | `/api/exams/{id}/` | GET | — | 200, examen |
| Examen | `/api/exams/` | POST | `{"title":"Backend","description":"Práctica"}` | 201, examen con id y fecha |
| Examen | `/api/exams/{id}/` | PATCH | `{"title":"Backend II"}` | 200, examen modificado |
| Examen | `/api/exams/{id}/` | PUT | `{"title":"Backend","description":"Actualizado"}` | 200, examen modificado |
| Examen | `/api/exams/{id}/` | DELETE | — | 204, sin cuerpo; cascada |
| Pregunta | `/api/questions/` | GET | — | 200, lista con opciones anidadas |
| Pregunta | `/api/questions/{id}/` | GET | — | 200, pregunta con opciones |
| Pregunta | `/api/questions/` | POST | `{"exam":1,"text":"¿Qué es Django?","options":[{"text":"Framework","is_correct":true},{"text":"BD","is_correct":false}]}` | 201, pregunta y opciones con ids |
| Pregunta | `/api/questions/{id}/` | PATCH | `{"text":"¿Qué es DRF?"}` | 200, conserva opciones |
| Pregunta | `/api/questions/{id}/` | PUT | `{"exam":1,"text":"¿Qué es Django?","options":[{"text":"Framework","is_correct":true}]}` | 200, opciones reemplazadas |
| Pregunta | `/api/questions/{id}/` | DELETE | — | 204, sin cuerpo; cascada |
| Opción | `/api/options/` | GET | — | 200, lista paginada |
| Opción | `/api/options/{id}/` | GET | — | 200, opción con id de pregunta |
| Opción | `/api/options/` | POST | `{"question":1,"text":"Otra alternativa","is_correct":false}` | 201, si conserva una correcta |
| Opción | `/api/options/{id}/` | PATCH | `{"text":"Texto corregido"}` | 200, opción modificada |
| Opción | `/api/options/{id}/` | PUT | `{"question":1,"text":"Otra","is_correct":false}` | 200, si no invalida la pregunta |
| Opción | `/api/options/{id}/` | DELETE | — | 204 si es incorrecta; 400 si es la única correcta |
| Pregunta | `/api/questions/?exam=1` | GET | — | 200, solo preguntas de ese examen |
| Pregunta | `/api/questions/?search=Django` | GET | — | 200, coincidencias de texto |
| Pregunta | `/api/questions/?page=2` | GET | — | 200, segunda página existente |

La raíz `GET /api/` devuelve 200. Recurso inexistente: 404. Campo obligatorio,
tipo inválido o regla de una correcta incumplida: 400. En HTML navegable, DELETE
permitido devuelve 200 para mostrar la página, no el 204 del cliente JSON.

## Estructura del proyecto

```text
Lab08-DEA/
  manage.py, requirements.txt, .gitignore, README.md
  config/       settings.py, urls.py, asgi.py, wsgi.py, __init__.py
  quiz/         models.py, serializers.py, views.py, urls.py, tests.py
                apps.py, admin.py, __init__.py
    migrations/ 0001_initial.py, __init__.py
    management/ commands/seed_demo.py y archivos __init__.py
  scripts/      verify_local.py, verify_http.py
  docs/         API_CONTRACT.md, LAB08_INFORME.md
    evidence/   local-checks.txt, HTTP_RESULTS.md, http-results.json
                17 respuestas browsable-*.html
  .venv/        entorno local excluido de Git
  db.sqlite3    base local excluida de Git
```

## Cinco observaciones

1. La representación anidada simplifica leer una pregunta con sus alternativas.
2. La escritura anidada requiere lógica explícita; ModelSerializer no basta.
3. Modificar opciones por separado puede romper la regla si no se valida.
4. Los códigos DELETE cambian entre JSON y HTML por el renderizador de DRF.
5. SQLite facilita la práctica, pero no implementa bloqueo de filas.

## Cinco conclusiones

1. Django REST Framework permite publicar los tres recursos con una estructura clara.
2. Las validaciones y transacciones mantienen una sola respuesta correcta por pregunta en la API.
3. Las pruebas automatizadas y el HTTP real aportan evidencias complementarias.
4. El filtrado, la búsqueda y la paginación permiten consultar datos de forma controlada.
5. El proyecto está preparado localmente; publicar y entregar requiere autorización posterior.

## Comprobación de la rúbrica y cierre

| Criterio | Valor | Evidencia y estado |
|---|---|---|
| 1. ModelSerializer, anidación y validaciones | 5 | Implementado y probado; serializadores, restricción y rollback |
| 2. Tres recursos con ViewSets y router navegable | 5 | Implementado; HTML real verificado; capturas visuales pendientes |
| 3. Cinco operaciones por cliente externo y errores | 5 | Verificado con Python HTTP independiente; códigos y respuestas guardados |
| 4. Repositorio preparado y tabla completa | 5 | Preparación local y tabla listas; publicación y entrega GitHub pendientes |

No se adjudica una calificación: corresponde al docente. Los doce pasos
técnicos están desarrollados y verificados en el alcance descrito; la edición
del Word, las capturas y la entrega no se declaran completadas.

**Confirmación:** no se ejecutaron `git add`, `git commit`, `git push`, reset,
clean, cambios de rama ni modificaciones del historial. No se publicó contenido
en GitHub, Postman u otro servicio. Todo se guardó dentro de `Lab08-DEA`.
