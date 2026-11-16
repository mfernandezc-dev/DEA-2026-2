# Laboratorio 06: motor de plantillas con Django

## 1. Identificación

**Curso:** Desarrollo de Aplicaciones Empresariales.<br>
**Tema:** motor de plantillas con Django.<br>
**Aplicación principal:** `news`.<br>
**Fecha de documentación y capturas:** 16 de noviembre de 2026.

Este directorio contiene el proyecto recuperado y sus evidencias reales. El desarrollo se explica en [INFORME-LAB06.md](INFORME-LAB06.md).

## 2. Objetivo

Desarrollar un portal de noticias que separe datos, lógica y presentación mediante modelos, vistas y plantillas de Django. Se aplican herencia, fragmentos reutilizables, variables, etiquetas, filtros, navegación con rutas nombradas y administración personalizada, manteniendo el escapado de contenido.

## 3. Tecnologías utilizadas

| Tecnología | Versión comprobada | Uso |
|---|---|---|
| Python | 3.14.3 | Ejecución del proyecto y comprobaciones. |
| Django | 6.1 | ORM, rutas, vistas, plantillas, formularios y administrador. |
| Pillow | 12.3.0 | Soporte de `ImageField`. |
| django-jazzmin | 3.0.5 | Presentación del administrador. |
| SQLite | Base de datos local | Datos recuperados en una copia externa al repositorio. |
| HTML y CSS | Archivos del proyecto | Estructura y diseño responsive. |
| Chrome | 157.0.8103.51 | Navegación y capturas de página completa en modo headless. |

Las dependencias se declaran en [requirements.txt](requirements.txt), codificado en UTF-8. Los rangos de Django y Pillow permiten otras versiones; la tabla identifica el entorno efectivamente comprobado, no una promesa sobre cualquier combinación futura.

## 4. Estructura del proyecto

```text
Lab06-DEA/
├── config/                 # Configuración, rutas y puntos de entrada
├── movies/                 # Aplicación coexistente de películas
├── news/
│   ├── migrations/         # 0001 y 0002, ya aplicadas en la copia
│   ├── admin.py
│   ├── models.py
│   ├── urls.py
│   ├── views.py
│   └── tests.py
├── static/css/style.css
├── templates/
│   ├── base.html
│   └── news/
│       ├── _article_card.html
│       ├── index.html
│       ├── article_detail.html
│       └── category_detail.html
├── evidencias/             # PNG, fuentes de texto y resultados sin credenciales
├── manage.py
├── requirements.txt
├── XSS_NOTES.txt
├── README.md
└── INFORME-LAB06.md
```

La [captura de estructura](evidencias/08-estructura.png) registra los **34 archivos funcionales** existentes antes de añadir esta documentación. Su [listado de texto](evidencias/fuentes/08-estructura.txt) permite revisar los nombres completos.

No se incluye ninguna base SQLite. `movies` y `news` comparten configuración y administrador, pero sus modelos no tienen relaciones cruzadas. La documentación no modifica `Lab05-DEA` ni otros laboratorios.

## 5. Modelos y relaciones

El código se encuentra en [news/models.py](news/models.py).

| Modelo | Campos principales | Relación |
|---|---|---|
| `Article` | `title`, `slug`, `content`, `published_at`, `image` | Pertenece a un `Author` y admite varias `Category`. |
| `Category` | `name`, `slug` | Agrupa artículos mediante una relación muchos-a-muchos. |
| `Author` | `name`, `bio`, `photo` | Puede tener varios artículos. |

```text
Author 1 ─── N Article N ─── M Category
```

La copia verificada contiene **6 artículos, 3 categorías, 3 autores y 6 asociaciones** en `news_article_categories`. Cada categoría contiene dos noticias. La categoría es opcional en el modelo, aunque los seis registros recuperados tienen una asignada.

Las migraciones existentes de `news` son `0001_initial` y `0002_remove_article_created_at_remove_article_updated_at_and_more`. Ambas figuran como aplicadas. No se ejecutaron migraciones durante la preparación de evidencias.

## 6. Herencia de plantillas

[templates/base.html](templates/base.html) define `title`, `content` y `sidebar`, además de navegación, CSS y footer. Las plantillas de noticias utilizan `extends` para compartir esta estructura.

Fragmento real de [templates/news/index.html](templates/news/index.html):

```django
{% extends 'base.html' %}

{% block title %}Inicio - News Portal{% endblock %}
```

La [captura del código de herencia](evidencias/09-herencia.png) muestra los archivos reales con numeración de líneas para facilitar su lectura.

## 7. Fragmentos reutilizables

La portada y el listado por categoría incluyen [templates/news/_article_card.html](templates/news/_article_card.html):

```django
{% include 'news/_article_card.html' %}
```

El fragmento presenta título, autor, fecha, categorías, resumen y enlace al detalle. La imagen se muestra únicamente cuando existe. Véase la [captura del fragmento](evidencias/10-fragmento.png).

## 8. Variables, etiquetas y filtros

| Recurso | Ejemplo del proyecto | Finalidad |
|---|---|---|
| Variable | `{{ article.title }}` | Mostrar datos del contexto. |
| `for` y `empty` | Recorrido de `articles` | Generar tarjetas o indicar ausencia de resultados. |
| `if` | `{% if article.image %}` | Evitar una imagen cuando el campo está vacío. |
| `extends`, `block`, `include` | Base y tarjeta | Compartir estructura y componentes. |
| `url` | `{% url 'news:article_detail' article.pk %}` | Resolver enlaces mediante nombres de rutas. |
| `load static` y `static` | CSS de la base | Obtener la URL del recurso estático. |
| `date` | `{{ article.published_at\|date:"d/m/Y" }}` | Dar formato a la fecha. |
| `truncatewords` | `{{ article.content\|truncatewords:20 }}` | Limitar el resumen a veinte palabras. |
| `striptags` y `force_escape` | Contenido del detalle | Presentar texto sin interpretar HTML almacenado. |

En el detalle se utiliza:

```django
{{ article.content|striptags|force_escape }}
```

`striptags` se usa para presentación, **no como garantía de sanitización**. `force_escape` escapa el resultado. Las tarjetas conservan su escapado automático y pueden mostrar literalmente etiquetas como `<p>`; la eliminación de etiquetas se aplicó solo al detalle.

## 9. Administrador personalizado

[news/admin.py](news/admin.py) registra las tres entidades con `list_display`, `list_filter` y `search_fields`. Para `Article`:

```python
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'published_at')
    search_fields = ('title', 'content', 'author__name')
    list_filter = ('author', 'categories', 'published_at')
    filter_horizontal = ('categories',)
    prepopulated_fields = {'slug': ('title',)}
```

`published_at` es obligatorio y editable en el formulario. Jazzmin utiliza `default_theme_mode="auto"`, soportado por la versión instalada. Conserva la marca previa «Movies», visible en las capturas; no se cambió para ocultar la coexistencia de aplicaciones.

## 10. Rutas principales

| Ruta | Nombre | Función |
|---|---|---|
| `/` | `home` | Redirección temporal 302 a `/news/`. |
| `/news/` | `news:index` | Portada. |
| `/news/article/<int:pk>/` | `news:article_detail` | Detalle de noticia. |
| `/news/category/<int:pk>/` | `news:category_detail` | Listado por categoría. |
| `/admin/` | `admin:index` | Administrador; requiere autenticación. |
| `/recommended/` | `movies:recommended` | Ruta existente de películas. |

Las definiciones están en [config/urls.py](config/urls.py) y [news/urls.py](news/urls.py). Los detalles y categorías inexistentes responden 404.

## 11. Instrucciones para ejecutar Django con seguridad

### Condiciones previas

1. Ejecutar desde el directorio que contiene `manage.py`.
2. Disponer de las dependencias de `requirements.txt`. Esta etapa no instaló paquetes ni modificó dependencias del sistema.
3. Disponer de una **copia SQLite de pruebas fuera del repositorio**, con las migraciones ya aplicadas. Nunca seleccionar el respaldo original.
4. Cerrar otros procesos que escriban en esa copia. El siguiente modo requiere que no existan auxiliares WAL, SHM o journal.
5. Definir la variable de entorno `SECRET_KEY` antes de cargar la configuración de Django.

### Configurar SECRET_KEY en Windows

En PowerShell, generar una clave aleatoria y asignarla directamente a la variable de entorno de la consola actual:

```powershell
$env:SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(64))"
```

La salida del comando se asigna a la variable, sin mostrarla en pantalla. No se debe imprimir su valor, incorporarlo al repositorio ni guardarlo en un archivo `.env`. Esta instrucción genera una clave de pruebas; no contiene una clave real escrita en el código.

`config/settings.py` lee `os.environ.get('SECRET_KEY')`. Si la variable falta, está vacía o solo contiene espacios, Django se detiene con `ImproperlyConfigured` y un mensaje explicativo. No existe una clave predeterminada ni una sustitución automática por la anterior.

La variable se hereda por los procesos iniciados desde esa consola y desaparece al cerrarla. Mantener el mismo valor mientras dure una sesión de trabajo. Para un despliegue futuro se debe proporcionar una clave estable mediante el entorno o un gestor de secretos externo, no mediante el código del laboratorio.

La clave anterior estaba versionada y debe considerarse expuesta: no debe reutilizarse. Eliminarla del archivo actual no la elimina de los commits previos; este cambio no modifica el historial de Git. Cambiar la clave puede invalidar sesiones y firmas anteriores, sin modificar las cuentas ni las noticias almacenadas.

### Arranque temporal con la copia SQLite de pruebas

> `config/settings.py` conserva su configuración original de ubicación de SQLite. No ejecutar directamente `python manage.py runserver` en esta entrega sin preparar la configuración temporal: no hay una base en el repositorio.

Para consultar el portal sin escribir en SQLite, se puede utilizar esta configuración **solo en memoria** desde PowerShell. Es una instrucción de ejecución, no un archivo funcional añadido al proyecto:

```powershell
$env:LAB06_TEST_DB = Read-Host "Ruta absoluta de la copia SQLite externa"
@'
import os
import sys
from pathlib import Path

project = Path.cwd().resolve()
assert (project / "manage.py").is_file(), "Ejecutar desde Lab06-DEA"
database = Path(os.environ["LAB06_TEST_DB"]).resolve(strict=True)
assert database.is_file(), "La copia debe ser un archivo existente"
assert not database.is_relative_to(project.parent), "La copia debe estar fuera del repositorio"
assert not any(database.with_name(database.name + suffix).exists()
               for suffix in ("-wal", "-shm", "-journal")), "Cerrar y revisar SQLite antes de continuar"
sys.path.insert(0, str(project))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
from django.conf import settings
settings.DATABASES = {"default": {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": database.as_uri() + "?mode=ro&immutable=1",
    "OPTIONS": {"uri": True},
}}
settings.ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
from django.core.management import execute_from_command_line
execute_from_command_line(["manage.py", "runserver", "127.0.0.1:8000", "--noreload"])
'@ | python -B -
```

Abrir `http://127.0.0.1:8000/news/` y detener con `Ctrl+C`. No ejecutar `migrate` ni `flush`. `--noreload` evita un proceso de recarga que pierda los ajustes en memoria.

Este modo permite consultar el portal, pero **no iniciar sesión ni guardar formularios administrativos**, porque esas acciones escriben sesiones o registros. Las capturas administrativas se obtuvieron con autorización específica sobre la copia, mediante una cuenta temporal de consulta. La cuenta y su sesión fueron retiradas al restituir la copia; no hay credenciales de demostración publicadas.

La copia utilizada localmente se conserva en `%LOCALAPPDATA%\Temp\opencode\Lab06-pruebas-20261116-vid5i9m9\db-trabajo.sqlite3`. Esa ubicación no existe necesariamente en otro equipo y no es un recurso del repositorio.

## 12. Evidencias del funcionamiento

| N.º | Evidencia auténtica |
|---|---|
| 01 | [Portada con las seis noticias](evidencias/01-portada.png) |
| 02 | [Detalle de noticia](evidencias/02-detalle.png) |
| 03 | [Categoría con dos noticias](evidencias/03-categoria.png) |
| 04 | [Administrador con las tres entidades](evidencias/04-admin-entidades.png) |
| 05 | [Seis noticias en el administrador](evidencias/05-admin-noticias.png) |
| 06 | [Filtro real por autor](evidencias/06-admin-filtro.png) |
| 07 | [Búsqueda real de noticias](evidencias/07-admin-busqueda.png) |
| 08 | [Estructura funcional real](evidencias/08-estructura.png) |
| 09 | [Código de herencia](evidencias/09-herencia.png) |
| 10 | [Código del fragmento reutilizable](evidencias/10-fragmento.png) |
| 11 | [Código de variables, etiquetas y filtros](evidencias/11-filtros-etiquetas.png) |
| 12 | [Prueba real de escapado en memoria](evidencias/12-escapado.png) |
| 13 | [Portada responsive a 390 px](evidencias/13-responsive.png) |

El [catálogo de evidencias](evidencias/README.md) explica su procedencia. Las capturas 08 a 12 muestran archivos de texto reales con listados, código y salida de pruebas; no pretenden representar un IDE ni una terminal. Se amplió la tipografía para facilitar la lectura, sin sustituir resultados.

## 13. Pruebas realizadas y límites

El [resumen de resultados](evidencias/resultados-pruebas.json) distingue las etapas:

- **Pruebas funcionales anteriores:** alta desde Admin, validaciones, CSRF, contenido temporal almacenado y escenarios vacíos; los registros temporales se revirtieron.
- **Verificación posterior a los ajustes de presentación:** sintaxis de 25 archivos Python, seis plantillas, rutas, vistas, administrador y siete casos de HTML peligroso o malformado en memoria. Revisión visual de 21 páginas en nueve anchos, de 320 a 1440 px, sin desbordamiento y con footer al fondo.
- **Sesión documental actual:** capturas nuevas del portal, autenticación real de una cuenta lectora temporal, seis filas administrativas, filtro con dos resultados y búsqueda `Digital` con un resultado. No se crearon ni modificaron noticias.

Los archivos `news/tests.py` y `movies/tests.py` siguen siendo esqueletos. Los casos ejecutados pertenecen a herramientas externas; **no se afirma que `manage.py test` ejecute esas pruebas**.

La [verificación documental final](evidencias/verificacion-final.json) registra enlaces, imágenes y conservación de los archivos originales y de las bases externas durante la preparación de evidencias. Es un registro histórico anterior al cambio del manejo de `SECRET_KEY`; no se ha reescrito para presentar verificaciones anteriores como nuevas.

Las seis noticias no tienen imagen asociada. Se verificó la configuración y el código de `ImageField`/MEDIA, pero **no se comprobó la entrega de una imagen subida**. Tampoco se realizó una auditoría exhaustiva de seguridad ni se probó un despliegue de producción.

## 14. Conclusiones

El laboratorio demuestra el uso integrado del motor de plantillas, la reutilización de estructura y componentes y la presentación de datos relacionados. La evidencia permite contrastar código y resultados sin incorporar bases de datos ni credenciales.

La base original y la copia finalizaron con el mismo SHA-256 inicial. No se modificó código funcional durante esta documentación. Quedan como observaciones la ausencia de favicon, las etiquetas escapadas visibles en resúmenes y la falta de imágenes originales para una prueba de MEDIA. No se realizó ninguna publicación ni operación de preparación, confirmación o envío de cambios en Git.
