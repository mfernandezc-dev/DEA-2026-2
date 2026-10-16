# Publicación segura del laboratorio S07

## Qué se publica

Código Django, configuración de desarrollo sin credenciales reales, migración, pruebas originales, requisitos y documentación académica. Los informes, TXT, JSON y capturas preparados para revisión pública están en [`publico/`](publico/README.md).

## Qué permanece exclusivamente en local

Entorno virtual, bases de datos, respaldos, archivos de entorno, cachés y evidencias originales que contienen rutas del equipo. `.gitignore` excluye esos archivos. La publicación no reinicia ni modifica la base de datos y no crea ni revela credenciales de administración.

Los originales académicos de `entregable/evidencias/` y los informes anteriores no se borraron: se excluyeron del seguimiento público. El README anterior y el `.gitignore` anterior se respaldaron dentro del entorno local ignorado.

## Tratamiento de evidencias

1. Los TXT y JSON públicos son **copias redactadas de registros reales**, no nuevas ejecuciones. Se sustituyeron rutas absolutas por `<PROJECT_ROOT>`, `<WORKSPACE_ROOT>` o `<USER_HOME>`.
2. Se conservaron fechas, comandos —con sus rutas ocultas—, cantidades, resultados, SQL, veredictos y fallos. Cada TXT identifica expresamente su condición de copia pública.
3. Los hashes históricos de conciliación y validación describen los originales privados. No deben confundirse con el hash de la copia redactada. El [manifiesto de exportación](publico/evidencias/publicacion_manifest.json) relaciona ambos hashes sin publicar las rutas originales.
4. La bitácora pública mantiene la correspondencia de los encabezados redactados de los TXT con sus registros JSONL.
5. Las capturas de portada y login no contienen rutas privadas y se conservaron. Las otras nueve se obtuvieron de nuevo con un navegador real, mostrando los TXT ya redactados. **No se dibujó una terminal ficticia ni se repitieron los comandos del laboratorio para esas imágenes.**
6. El [manifiesto de capturas públicas](publico/evidencias/capturas_manifest.json) registra la procedencia relativa y los hashes de las imágenes publicadas. Sus fechas de captura pueden ser posteriores a la ejecución original del comando.

Los textos históricos que indican “no publicado” corresponden a la fase de desarrollo previa a la autorización posterior de publicación. La exportación no altera esa secuencia ni atribuye al estudiante trabajo realizado con IA.

## Revisión de seguridad

Se excluyen `.venv/`, `.env*`, bases SQLite y otras bases locales, cachés, archivos Git internos, llaves privadas y temporales. Se revisan las copias públicas para detectar rutas de perfiles, tokens de GitHub/OpenAI, llaves privadas, hashes de contraseñas y URLs con credenciales. La clave de reserva de `config/settings.py` es el valor de demostración declarado por el proyecto, no una credencial de producción; el valor real se obtiene del entorno.

Los hashes de aprobación del agente son datos del ejercicio local, no contraseñas de GitHub ni credenciales de usuario. Su funcionamiento y sus limitaciones están explicados en el informe.

El `.gitattributes` de este laboratorio evita conversiones automáticas de finales de línea, para conservar los bytes y checksums de los archivos publicados. Su alcance no afecta `Lab05-DEA`.

## Alcance Git

El laboratorio se agrega como carpeta normal `dae-s07-orm-con-ia-main/`, junto a `Lab05-DEA/`. No se inicializa un repositorio anidado, no se agrega un submódulo y no se modifica el laboratorio anterior. El commit autorizado es `Add Lab07 Django ORM con IA`; no se publica nada en el campus virtual.
