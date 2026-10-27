# Laboratorio N.º 08 — Implementación de Servicios Web con Django

**Curso:** Desarrollo de Aplicaciones Empresariales.  
**Sistema:** API REST de exámenes, preguntas y opciones de respuesta.  
**Estado:** implementado y verificado localmente. Sin staging, commit, push ni
publicación externa.

## 1. Objetivo

Administrar los tres recursos mediante Django REST Framework (DRF), relaciones
anidadas, validaciones, operaciones HTTP, filtrado, búsqueda y paginación.
Cada pregunta debe conservar exactamente una opción correcta.

## 2. Tecnologías y decisiones

| Tecnología | Versión comprobada | Motivo |
|---|---|---|
| Python | 3.14.3 | Supera el requisito de Python 3.12 |
| Django | 5.2.15 LTS | Versión estable con soporte extendido |
| Django REST Framework | 3.16.1 | ModelSerializer, ModelViewSet y router |
| SQLite | Incluida con Python | Desarrollo local sin servidor adicional |
| pip | 25.3 | Instalación aislada en `.venv` |
| Git | 2.54.0.windows.1 | Solo consultas; se reutiliza el repositorio existente |
| PowerShell | Windows | Comandos compatibles con la terminal solicitada |

`requirements.txt` fija también las dependencias transitivas instaladas:
asgiref, sqlparse y tzdata. No se necesitan django-filter, requests ni Postman.
No hay llamadas a APIs externas. El contrato local está en
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## 3. Requisitos previos

- Windows, PowerShell, Python 3.12 o superior y pip.
- Trabajar exclusivamente en `Lab08-DEA`, dentro del repositorio existente.
- Puerto 8000 libre para iniciar un servidor de pruebas.
- No se requiere el lanzador `py`: no estaba instalado en este entorno.

La carpeta estaba vacía al comenzar, sin entorno virtual. Había Django global,
pero no DRF; no se modificaron esos paquetes globales.

## 4. Estructura y archivos

```text
Lab08-DEA/
├── .gitignore
├── requirements.txt
├── manage.py
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── quiz/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── tests.py
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py
│   └── management/
│       ├── __init__.py
│       └── commands/
│           ├── __init__.py
│           └── seed_demo.py
├── scripts/
│   ├── verify_local.py
│   └── verify_http.py
├── docs/
│   ├── API_CONTRACT.md
│   ├── LAB08_INFORME.md
│   └── evidence/
│       ├── local-checks.txt
│       ├── http-results.json
│       ├── HTTP_RESULTS.md
│       └── browsable-*.html (17 respuestas HTML conservadas)
├── .venv/                  # Local, excluido de Git
└── db.sqlite3              # Local, excluido de Git
```

Los archivos `__pycache__` son generados por Python y también están excluidos.
`admin.py` es el archivo inicial de Django; no publica los modelos para evitar
otra vía de escritura sin las validaciones de la API.

## 5. Instalación y activación en PowerShell

En una instalación nueva (el entorno actual ya está preparado):

```powershell
Set-Location 'C:\Users\USER\Desktop\4° Ciclo\DEA-2026-2\Lab08-DEA'
python --version
python -m pip --version
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Si PowerShell bloquea la activación, no es necesario cambiar políticas del
sistema: use directamente el ejecutable del entorno:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Los comandos siguientes usan esa alternativa para funcionar sin activación.

## 6. Migraciones, datos y servidor

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Abrir <http://127.0.0.1:8000/api/>. Detener con `Ctrl+C`.
El verificador automático inicia y detiene su propio servidor; no lo deja
ejecutándose al finalizar.

`seed_demo` crea dos exámenes, doce preguntas (8 y 4) y veinticuatro opciones.
Cada pregunta tiene una correcta y una incorrecta. Repetir el comando no duplica
esos datos ni elimina registros existentes; se comprobó una segunda ejecución
con **0 preguntas nuevas**. No editar sus títulos si se desea reutilizar la
misma identificación de los datos demo.

La migración inicial está incluida y aplicada. Solo al modificar modelos:

```powershell
.\.venv\Scripts\python.exe manage.py makemigrations quiz
.\.venv\Scripts\python.exe manage.py migrate
```

## 7. Configuración de DRF y seguridad local

- `INSTALLED_APPS`: `rest_framework` y `quiz.apps.QuizConfig`.
- SQLite; fechas UTC y zona horaria habilitada.
- Paginación `PageNumberPagination`, **5 elementos por página**.
- `SearchFilter` global; `QuestionViewSet.search_fields = ['text']`.
- Filtro por examen explícito y validado, sin dependencia adicional.
- `AllowAny`: acceso sin autenticación únicamente para esta práctica local.
- Renderizadores JSON y HTML navegable; JSON es el primero por defecto.
- `DEBUG=True`, hosts locales y clave de desarrollo claramente identificada.
  Puede suministrarse `DJANGO_SECRET_KEY` como variable del proceso.
  `.env` se ignora, pero **no se carga automáticamente**.

Esta configuración no es de producción: no exponer el servidor a Internet.
No se crearon usuarios, contraseñas ni credenciales reales.

## 8. Modelos y relaciones

```text
Exam 1 ─── N Question 1 ─── N Option
```

| Modelo | Campos |
|---|---|
| Exam | `id`, `title` (máx. 200), `description` (opcional), `created_at` |
| Question | `id`, `exam` (ForeignKey), `text` |
| Option | `id`, `question` (ForeignKey), `text` (máx. 255), `is_correct` |

`Exam.questions` y `Question.options` son las relaciones inversas (`related_name`).
Ambas claves foráneas usan `CASCADE`. Eliminar una pregunta elimina sus opciones;
eliminar un examen elimina sus preguntas y opciones. Orden estable por `id`.

## 9. Serializadores y regla de una correcta

`ExamSerializer`, `QuestionSerializer`, `OptionSerializer` y el auxiliar
`NestedOptionSerializer` derivan de `ModelSerializer`, con campos explícitos.
`id` y `created_at` son de solo lectura; `exam` y `question` son identificadores
de recursos existentes. Las preguntas incluyen sus opciones anidadas.

1. **POST de pregunta:** exige `exam`, `text` y `options`. Se cuentan las
   opciones correctas antes de guardar: el total debe ser exactamente uno.
2. **PATCH de pregunta sin `options`:** conserva todas las opciones.
3. **PATCH con `options`:** reemplaza la lista completa. Cada elemento necesita
   `text`, incluso en PATCH; el conjunto debe tener exactamente una correcta.
   Los ids anteriores desaparecen y se generan otros. Los ids enviados son
   de solo lectura; no sirven para actualizar opciones individualmente.
4. **PUT de pregunta:** exige los campos obligatorios, incluidas las opciones,
   y aplica la misma validación de reemplazo.
5. **Opciones directas:** crear una segunda correcta, desmarcar la única
   correcta, convertir otra en correcta o eliminar la única correcta devuelve
   **400**. Se pueden crear/eliminar incorrectas y editar textos. Una opción
   existente no puede cambiar de pregunta (400).
6. **Cambio de respuesta correcta:** se hace con un único PATCH de pregunta
   que incluya el nuevo conjunto completo de opciones.
7. **Atomicidad:** `transaction.atomic` impide guardar solo parte de una
   creación o reemplazo. Las pruebas simulan fallos internos y comprueban
   rollback de pregunta, texto y opciones.
8. **Base de datos:** una `UniqueConstraint` condicional impide tener dos
   correctas por pregunta. La obligación de **al menos una** la impone la API,
   no SQL directo ni escrituras arbitrarias por ORM.

Se vuelven a validar las opciones directas dentro de la transacción. Se usa
`select_for_update` para motores que lo soportan; SQLite **no tiene bloqueo de
filas** y serializa escrituras. No se realizaron pruebas de concurrencia ni de
carga; este laboratorio no afirma garantías de disponibilidad bajo contención.

## 10. ViewSets, router y tabla completa de la API

Los tres recursos usan `ModelViewSet`. Un `DefaultRouter` los registra en
`quiz/urls.py`; `config/urls.py` incluye esas rutas con el prefijo `api/`.
El router también ofrece la raíz navegable `GET /api/` (200).

Base: `http://127.0.0.1:8000`. La tabla corresponde a **JSON**
(`Accept: application/json`, y `Content-Type: application/json` si hay cuerpo).
Los ids de ejemplo requieren que esos recursos existan; `{id}` es un marcador.

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

**Importante sobre HTML:** el renderizador navegable de DRF convierte la
respuesta DELETE 204 en **200 con HTML** para poder mostrar la página. Se
comprobó para los tres recursos. Con JSON se obtuvo **204 sin cuerpo**.

### Códigos comprobados y errores

| Código JSON | Situación comprobada |
|---|---|
| 200 OK | GET, PATCH y PUT correctos |
| 201 Created | POST válido de los tres recursos |
| 204 No Content | DELETE permitido de los tres recursos |
| 400 Bad Request | Obligatorio ausente, tipo incompatible, regla de correcta o filtro inválido |
| 404 Not Found | Recurso inexistente o eliminado; página inexistente |

## 11. Ejemplos JSON

Crear examen, `POST /api/exams/`:

```json
{"title": "Python y Django", "description": "Evaluación de servicios web"}
```

Crear pregunta, `POST /api/questions/` (usar el id del examen creado):

```json
{
  "exam": 1,
  "text": "¿Qué componente transforma modelos a JSON?",
  "options": [
    {"text": "Un serializador", "is_correct": true},
    {"text": "Una migración", "is_correct": false}
  ]
}
```

Cambiar la correcta, `PATCH /api/questions/{id}/`:

```json
{
  "options": [
    {"text": "Primera alternativa", "is_correct": false},
    {"text": "Nueva respuesta correcta", "is_correct": true}
  ]
}
```

Error de título obligatorio, respuesta real de `POST /api/exams/` con
`{"description":"Missing title"}`:

```json
{"title": ["This field is required."]}
```

Error de regla propia (400):

```json
{"options": ["A question must have exactly one correct option."]}
```

Los mensajes están en inglés, como la configuración de DRF y el código.
`docs/evidence/HTTP_RESULTS.md` contiene **cada** endpoint, método, cuerpo,
código esperado/obtenido, respuesta y resultado real, no ejemplos inventados.

## 12. Filtrado, búsqueda y paginación

| URL demo | Resultado con los datos iniciales |
|---|---|
| `/api/questions/` | `count=12`, 5 resultados, enlace a página 2 |
| `/api/questions/?page=2` | 5 resultados, enlaces anterior y siguiente |
| `/api/questions/?page=3` | 2 resultados, sin siguiente |
| `/api/questions/?exam=1` | 8 preguntas del primer examen demo |
| `/api/questions/?search=REST` | 4 preguntas del segundo examen demo |
| `/api/questions/?exam=1&search=Django` | 8 coincidencias |

Los ids demo son 1 y 2 en la base recién creada; consultar `/api/exams/` si
se reutiliza otra base. `exam` debe ser entero positivo (inválido: 400).
Examen inexistente sin preguntas: lista vacía (200). Página inexistente: 404.
`search` busca fragmentos sin distinguir mayúsculas en el campo `text`;
no se promete normalización de acentos o reglas lingüísticas de SQLite.

**Prueba HTTP registrada:** se creó un examen temporal con 7 preguntas; la
primera página devolvió 5, la segunda 2 y `count=7` en ambas. Se siguieron
`next` y `previous` reales y la búsqueda combinada encontró 6 coincidencias.
Ese examen se eliminó al terminar; las URLs exactas son evidencia histórica,
no datos que permanezcan disponibles. Los doce registros demo sí permanecen.

## 13. Pruebas y resultados verificados

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test --verbosity 2
.\.venv\Scripts\python.exe scripts\verify_local.py
.\.venv\Scripts\python.exe scripts\verify_http.py --start-server
```

El último comando requiere puerto 8000 libre, usa HTTP real con `urllib.request`
y detiene únicamente su propio proceso de servidor. Si el servidor ya está
corriendo, usar sin `--start-server`. Alternativa:
`--base-url http://127.0.0.1:8001 --start-server`.

Los scripts regeneran sus archivos de evidencia. El cliente crea sus propios
registros, elimina únicamente esos registros mediante la API y no borra datos
demo ni registros del usuario. Una interrupción puede requerir eliminar
manualmente el examen de prueba que haya quedado.

| Verificación ejecutada | Resultado |
|---|---|
| Pruebas Django/DRF | **48/48 OK**, base de pruebas aislada |
| Solicitudes HTTP reales | **64/64 PASS**: 17 HTML y 47 JSON |
| `manage.py check` | Sin problemas, salida 0 |
| `makemigrations --check --dry-run` | Sin cambios pendientes, salida 0 |
| `showmigrations` | Migraciones aplicadas |
| `pip check` | Sin dependencias incompatibles, salida 0 |
| Repetición de `seed_demo` | 0 preguntas nuevas |
| Revisión de líneas Python | Hasta 79 caracteres, sin espacios finales |

Las pruebas cubren modelos/relaciones, serializadores, solo lectura, creación
anidada, rollback, CRUD de los tres recursos, tipos incorrectos, campos
obligatorios, cero/dos correctas, opciones directas, traslado rechazado,
404, filtro, búsqueda y enlaces de paginación.

Evidencias locales:

- [`docs/evidence/local-checks.txt`](docs/evidence/local-checks.txt): salida real
  de versiones, dependencias, migraciones, check y las 48 pruebas.
- [`docs/evidence/HTTP_RESULTS.md`](docs/evidence/HTTP_RESULTS.md): los 64 casos.
- [`docs/evidence/http-results.json`](docs/evidence/http-results.json): registro
  estructurado equivalente.
- `docs/evidence/browsable-*.html`: 17 respuestas del renderizador, con valores
  CSRF anonimizados para publicación; cuerpos y códigos de la API sin alterar.

Al regenerar estas evidencias, revisar y anonimizar nuevamente los valores
CSRF de los HTML antes de preparar otro commit.

**No se probó Postman.** El ejecutable estaba disponible, pero se utilizó el
cliente Python independiente autorizado para evitar servicios externos.
Se verificó primero HTML navegable (listado, detalle, creación, PATCH, DELETE
y error) y después JSON. No se automatizó un navegador gráfico ni se inventaron
capturas: la inspección visual y las capturas deben completarse manualmente.

## 14. Informe, capturas y estado de la rúbrica

<img width="1371" height="502" alt="API Root" src="https://github.com/user-attachments/assets/bca69e03-ecac-46af-b3bf-184374d3840c" />
<img width="1196" height="724" alt="Consulta de exámenes registrados mediante el método GET" src="https://github.com/user-attachments/assets/c0d93f01-9d50-4b43-b340-6bc9bf05b6ac" />
<img width="955" height="727" alt="Consulta de preguntas con opciones anidadas y paginación" src="https://github.com/user-attachments/assets/356cc540-5ffb-44ec-9c40-88fe8c77dd95" />
<img width="985" height="734" alt="Verificación de la paginación de preguntas" src="https://github.com/user-attachments/assets/13223a0d-49c8-4c0f-bbc3-51e395a1acbc" />
<img width="949" height="733" alt="Filtrado de preguntas por examen" src="https://github.com/user-attachments/assets/edc749d9-0b9b-49af-bbac-39c2e66ea507" />
<img width="940" height="727" alt="Búsqueda de preguntas por texto del enunciado" src="https://github.com/user-attachments/assets/93ea1545-02b9-4c32-a268-98fe0b609866" />
<img width="933" height="730" alt="Consulta de opciones de respuesta mediante la API REST" src="https://github.com/user-attachments/assets/4de9c3dc-d0cc-4449-a8f6-78726ec2f59f" />
<img width="940" height="566" alt="Creación de un examen mediante el método POST" src="https://github.com/user-attachments/assets/e9a0ab64-cfc9-45cd-87a1-18085965471e" />
<img width="933" height="709" alt="Actualización parcial de un examen mediante PATCH" src="https://github.com/user-attachments/assets/6aa0d1f7-4b43-4010-884b-b7636ecab3c3" />
<img width="932" height="634" alt="Eliminación de un examen mediante DELETE" src="https://github.com/user-attachments/assets/09d3a1ed-7a6a-4e73-9071-7f4782fa022a" />
<img width="930" height="698" alt="Validación de un campo obligatorio mediante Django REST Framework" src="https://github.com/user-attachments/assets/8442827e-fbd1-4348-9841-769a5418b12d" />
<img width="927" height="698" alt="Validación de un tipo de dato incorrecto" src="https://github.com/user-attachments/assets/9894a79f-5b91-488c-b320-3102c494122e" />
<img width="719" height="272" alt="Ejecución exitosa de las pruebas automatizadas en Django" src="https://github.com/user-attachments/assets/487e3628-dd3e-40e7-b8b3-f131c9deefb3" />









