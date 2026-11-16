# Catálogo y metodología de evidencias

**Fecha:** 16 de noviembre de 2026.<br>
**Proyecto:** Laboratorio 06, motor de plantillas con Django.

## Naturaleza y procedencia

Los PNG son capturas reales de página completa obtenidas con Chrome 157.0.8103.51 en modo headless. No son imágenes generadas, composiciones ni resultados reemplazados mediante edición del DOM.

Las capturas 01 a 07 y 13 muestran páginas servidas por Django con los datos de la copia SQLite externa. Las capturas 08 a 12 muestran archivos de texto reales abiertos en Chrome: listados del sistema de archivos, código numerado y salida de una prueba efectivamente ejecutada. Solo se amplió la tipografía del visor de texto; no se sustituyó su contenido. No se presentan esos visores como un IDE o una terminal.

## Catálogo

| Figura | Archivo | Contenido y alcance |
|---|---|---|
| 01 | [01-portada.png](01-portada.png) | Las seis noticias originales y categorías. |
| 02 | [02-detalle.png](02-detalle.png) | Detalle real del artículo 6; texto sin etiquetas activas. |
| 03 | [03-categoria.png](03-categoria.png) | Categoría 1, Technology, con dos noticias. |
| 04 | [04-admin-entidades.png](04-admin-entidades.png) | Panel real con Articles, Authors y Categories. |
| 05 | [05-admin-noticias.png](05-admin-noticias.png) | Seis filas y columnas del administrador. |
| 06 | [06-admin-filtro.png](06-admin-filtro.png) | Filtro real por autor 3; dos filas. |
| 07 | [07-admin-busqueda.png](07-admin-busqueda.png) | Búsqueda real `Digital`; una fila. |
| 08 | [08-estructura.png](08-estructura.png) | Los 34 archivos funcionales, antes de añadir documentación. |
| 09 | [09-herencia.png](09-herencia.png) | Código de `index.html` y `base.html`. |
| 10 | [10-fragmento.png](10-fragmento.png) | Código de `_article_card.html`. |
| 11 | [11-filtros-etiquetas.png](11-filtros-etiquetas.png) | Código real de variables, bucles y filtros. |
| 12 | [12-escapado.png](12-escapado.png) | Salida real del motor de plantillas, exclusivamente en memoria. |
| 13 | [13-responsive.png](13-responsive.png) | Portada en un viewport móvil de 390 px. |

Las dimensiones y SHA-256 de cada PNG se incluyen en [resultados-pruebas.json](resultados-pruebas.json).

La [verificación final](verificacion-final.json) registra la comprobación de enlaces, formatos de imagen y conservación del alcance autorizado.

## Fuentes de texto de las capturas

- [08-estructura.txt](fuentes/08-estructura.txt): nombres reales de archivos, sin contenido de configuración.
- [09-herencia.txt](fuentes/09-herencia.txt): líneas reales de las plantillas, con numeración añadida.
- [10-fragmento.txt](fuentes/10-fragmento.txt): fragmento real completo.
- [11-filtros-etiquetas.txt](fuentes/11-filtros-etiquetas.txt): portada y tarjeta reales.
- [12-escapado.txt](fuentes/12-escapado.txt): entrada inofensiva, expresiones ejecutadas y salidas comprobadas; no se guardó una noticia.

## Autenticación y privacidad

Las cuatro capturas administrativas proceden de una sesión real de una cuenta temporal autorizada. Solo recibió permisos de consulta sobre las tres entidades de `news`. El nombre visible identifica una cuenta de evidencias, no una cuenta personal original.

No se capturó la pantalla de introducción de credenciales ni se abrieron herramientas de desarrollo. No se incluyeron contraseñas, cookies, tokens, claves de seguridad, perfiles del navegador, bases SQLite o registros HTTP sin depurar.

La copia externa se restituyó a su SHA-256 inicial al finalizar; la cuenta y su sesión no permanecen disponibles. La base original no se abrió en escritura. Los nombres de autores y títulos visibles son los datos del laboratorio, no perfiles de autenticación.

## Resultados y límites

[resultados-pruebas.json](resultados-pruebas.json) diferencia las capturas actuales de las pruebas funcionales históricas y la revisión responsive posterior. No debe interpretarse que una captura estática prueba por sí sola validaciones, creación de registros o protección CSRF.

- La creación y las validaciones administrativas y CSRF se documentan mediante los resultados previos, no como capturas de altas realizadas ahora.
- La prueba de escapado 12 se ejecutó en memoria, sin persistir el contenido de prueba.
- Las tarjetas conservan etiquetas escapadas visibles; no se editaron las imágenes para ocultarlas.
- La ausencia de favicon permanece documentada; no se añadió uno.
- No hay imágenes asociadas a los registros originales; su entrega mediante MEDIA continúa sin prueba funcional.

## Documentos relacionados

- [README del laboratorio](../README.md).
- [Informe académico](../INFORME-LAB06.md).

Las evidencias se prepararon localmente. No se ejecutaron operaciones de publicación en GitHub.
