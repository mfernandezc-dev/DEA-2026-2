# Fase 04 — Paso 11 y preparación del paso 12

## Progreso

Documentación técnica elaborada y auditada: README público y entregable de los
pasos 1–11, con 27 capturas integradas en cada documento reutilizando los mismos
archivos. Paso 12 pendiente de autorización/publicación. **No está completado el
cotejo literal de las tres capacidades con la guía original**, que no se recibió.
La línea base de Git, datos y archivos externos se conserva en `VERIFICACION.json`.

## Alcance

README público, entregable académico, auditoría de capturas y enlaces,
reproducibilidad aislada e inventario cerrado. Sin staging, commits ni push.
No se localizó el documento original de aula: las capacidades se identificarán
como formulaciones operativas, pendientes de cotejar literalmente con la guía.
El diagrama de modelos describirá únicamente la implementación comprobada.

## Evidencias y enlaces

| Origen | Capturas conservadas/nuevas |
|---|---:|
| Fase 01, Admin | 3 conservadas |
| Fase 02, API y resultados | 5 conservadas |
| Fase 03, interfaz | 14 conservadas |
| Fase 04, editor y terminal reales | 5 nuevas |
| Total | 27 PNG válidos |

Nuevas: `01-estructura-proyecto-vscode.png`,
`02-estructura-catalog-vscode.png`, `03-estructura-react-vscode.png`,
`04-componentes-react-vscode.png`, `05-migraciones-terminal.png`.
Se capturaron ventanas reales mediante píxeles de pantalla, sin dibujar editores
o terminales. El perfil aislado oculta dependencias y generados en el explorador;
no altera el código del proyecto.

Las 22 capturas anteriores mantienen sus hashes. No hay duplicados exactos por
SHA-256 ni se eliminó evidencia válida. Las de Admin cubren tres categorías,
ocho productos y un producto con imagen. `evidence_*` es un usuario temporal
eliminado, no una contraseña ni cuenta reutilizable. Los UUID de CRUD también
son registros de prueba ya limpiados.

Rutas, mayúsculas, formato de imagen, exclusiones Git, anclas y enlaces locales
verificados automáticamente. README: 27 imágenes únicas, sin desplegables ni
orígenes externos; entregable: referencias a los mismos 27 PNG. Los contadores
de enlaces están en `checks.documents`. Las imágenes largas se pueden ampliar
al tamaño original para leer los detalles.

## Diagramas y visor

README: ER de campos/tipos reales, arquitectura y secuencia del catálogo.
Entregable: ER reutilizado. Se revisaron bloques y delimitadores, considerando
que `o{` es cardinalidad ER, no una llave de cierre pendiente. Es una comprobación
estructural, no una certificación del motor Mermaid de GitHub.

Se inspeccionó el README en **Markdown Preview de Visual Studio Code**: portada,
tabla académica y catálogo con imagen embebida. Las capturas auxiliares de esa
inspección quedan en `.runtime/`, ignoradas y fuera del inventario académico.
No se afirma una visualización en GitHub no realizada.

## Resultados previos y comprobaciones nuevas

Se reutilizan los resultados de fase 03: 89 pruebas Django, 58 unitarias
JavaScript, 27 comprobaciones TechStore, 68 de navegador heredadas, 44 de
integración, build/lint correctos y responsive 1440/768/390. No se repitieron
esas suites porque el código funcional no cambió. La captura de fase 02 muestra
42 unitarias; ambos documentos explican esa diferencia histórica.

Comprobaciones nuevas:

- HTTP de lectura: categorías 200/count 3, productos 200/count 8, frontend y
  `/quiz` con 200, reutilizando los servidores existentes.
- Terminal real: migraciones catalog/quiz aplicadas, `migrate --check` y Django
  check con código 0, sin migraciones nuevas.
- SQLite/media inicialmente inexistentes en directorio temporal: migrate y seed
  dos veces produjeron 3 categorías, 8 productos y 8 PNG idénticos a los recursos
  fuente. No se usó la base actual para reconstruirlos. Solo se eliminaron la
  base y medios temporales propios al terminar.
- requirements fijado, lock v3 coherente con package.json, ocho recursos
  iniciales, ejemplos de entorno y 140 imports relativos comprobados. No se
  reinstalaron dependencias ni se realizó un clon/instalación npm limpios;
  el build previo y los manifiestos respaldan esa parte de la reproducibilidad.

## Inventario y seguridad de publicación

`PUBLICACION-LAB13.txt` contiene rutas relativas, tamaños, tipos y SHA-256.
Cantidad y tamaño exactos también en `publication_inventory` del JSON. Incluye
27 capturas y 8 imágenes iniciales. Solo se omiten los hashes de los dos controles
autorreferentes (inventario y JSON de esta fase) para evitar circularidad; sus
tamaños sí quedan estabilizados. Los hashes son de bytes locales, no objetos Git.

Se excluyen entornos, node_modules, SQLite, media regenerable, dist, cachés,
logs, perfiles, salidas temporales heredadas y `.env` reales. Los `.env.example`
y PNG necesarios se incluyen. No hay archivos mayores de 10 MiB ni repositorios
`.git` anidados en el árbol del proyecto inspeccionado; no se recorrieron
dependencias de terceros ni perfiles ignorados.

Firmas de tokens/claves privadas y asignaciones sensibles: sin hallazgos en
candidatos. Revisión visual: sin contraseñas o tokens visibles. Es una revisión
acotada, no una garantía absoluta de ausencia de secretos; no se imprimieron valores.

No hay espacios finales problemáticos. Hay LF/CRLF mezclados preexistentes en
`backend/config/settings.py`, `backend/config/urls.py` y
`backend/quiz/migrations/0001_initial.py`. Se conservaron para no modificar código
funcional por formato. No se cambió la configuración global Git.

`git fetch origin` no destructivo: main y origin/main a 0 commits por delante y
0 por detrás. HEAD, ramas, staging y estado externo iguales al inicio. Los 1499
archivos externos protegidos, código funcional, evidencias anteriores y datos
originales conservan sus hashes. Sin add, commit, push, pull, merge, rebase,
reset ni clean.

## Pendientes y reanudación

1. Facilitar la guía original o sus tres capacidades para cotejar el texto y
   sustituir las formulaciones operativas si corresponde; requisito no verificado.
2. Confirmar si exige equipo y, solo entonces, aportar datos reales de otros
   participantes. No se inventaron integrantes ni reparto de tareas.
3. Para utilizar Admin con cuenta personal, ejecutar interactivamente desde backend
   `.\.venv\Scripts\python.exe manage.py createsuperuser`; no escribir su contraseña
   en documentos, archivos ni terminales capturadas.
4. Autorizar fase 05 antes de staging/commit/push; revisar GitHub después de publicar.

**No quedan capturas manuales pendientes:** estructura, catalog, React y terminal
están cubiertos. Tras cualquier cambio documental, ejecutar desde backend
`.\.venv\Scripts\python.exe scripts/verify_documentation_phase.py` para recalcular
enlaces, hashes, tamaños e inventario. Añadir `--reproduce` para repetir únicamente
la reconstrucción aislada. No sustituir la línea base.
