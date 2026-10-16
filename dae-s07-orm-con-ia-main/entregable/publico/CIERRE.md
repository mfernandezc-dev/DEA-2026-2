> Copia pública: rutas locales omitidas por privacidad. Los resultados corresponden a las ejecuciones históricas indicadas; no se repitieron para esta exportación. [Política y procedencia](../PUBLICACION.md).

# Finalización del laboratorio S07 — ORM con IA: duelo y verificador

**Estado:** funcionamiento y evidencias verificables completados; queda una incompatibilidad justificada de la suite original y la revisión personal/académica del estudiante. No se publica ni se entrega desde esta sesión.

## 1. Estado de los 15 apartados originales

Se conserva la numeración del procedimiento original. “PARCIAL” señala un cierre que requiere intervención humana, no una consulta incorrecta escondida.

| N.º | Apartado | Estado final | Evidencia y observaciones |
|---:|---|---|---|
| 1 | Ubicación | COMPLETADO | Todos los registros incluyen el directorio obligatorio. [47](evidencias/47_check_cierre.txt). |
| 2 | Inspección inicial | COMPLETADO | [00](evidencias/00_inspeccion.txt), README y contratos revisados; se conservó la estructura. |
| 3 | Entorno y base | COMPLETADO | `.venv` operativo; [55, dependencias](evidencias/55_dependencias_cierre.txt), [56, migraciones](evidencias/56_migraciones_cierre.txt), [54, conteos](evidencias/54_datos_cierre.txt). |
| 4 | Modelos | COMPLETADO | [Informe C](INFORME.md), [Mermaid](modelo.mmd); relaciones y claves verificadas contra el código. |
| 5 | Duelo del equipo | COMPLETADO | [65](evidencias/65_duelo_final.txt): q1–q8 `ok`, una SQL cada una. [Código y resultados](CONSULTAS_ORM.md). |
| 6 | Comparación IA | COMPLETADO | [66](evidencias/66_ia_final.txt): 3/8 correctas y baratas; clasificación en [informe E](INFORME.md) y [SQL](SQL_DUELO.md). |
| 7 | N+1 y suite | PARCIAL, incompatibilidad justificada | N+1 resuelto: [23 antes](evidencias/07_n1_antes_test.txt), [2 después](evidencias/53_portada_sql_cierre.txt). [Prueba específica aprobada](evidencias/67_portada_final.txt). [68](evidencias/68_suite_final.txt) conserva el fallo del starter; no es una aprobación. |
| 8 | Cuatro intenciones | COMPLETADO | [57](evidencias/57_intenciones_cierre.txt): `ok`, `ok`, `approval_required`, `denied`. |
| 9 | Seguridad | COMPLETADO | [Informe G](INFORME.md): cuarto comentario, límite de confianza, validaciones y límites reales del registro. |
| 10 | Hash y restauración | COMPLETADO | [22](evidencias/22_aprobacion5.txt), [28](evidencias/28_aprobacion_obsoleta.txt), [31](evidencias/31_restauracion_exacta2.txt). Base preservada; no se repitió el borrado local en este cierre. |
| 11 | Entregable | PARCIAL, revisión personal | Contenido A–J, código, capturas y casos completos. Faltan identidad/sección no proporcionadas y contraste humano con el documento del campus. No se inventan esos datos. |
| 12 | Evidencias | COMPLETADO | [Conciliación](evidencias/46_conciliacion_bitacora.txt), [casos y once capturas](CASOS_Y_CAPTURAS.md), [índice](EVIDENCIAS.md). |
| 13 | Validación general | COMPLETADO con límites explícitos | [Auditoría de cierre](evidencias/validacion_cierre.json): integridad, bitácora, vínculos, capturas y resultados. No equivale a suite totalmente verde. |
| 14 | Restricciones | COMPLETADO | Pruebas y comportamiento preservados; solo se dividió un comentario de 80 columnas. Sin commits, push, publicaciones ni entregas. |
| 15 | Forma de trabajo | COMPLETADO | Se completaron solo pendientes y verificaciones, sin rehacer el laboratorio. Los comandos y decisiones son trazables. |

## 2. Las 15 comprobaciones verificables solicitadas en la finalización

| Punto de la fase 1 | Comprobación | Estado y evidencia |
|---:|---|---|
| 1 | Entorno y dependencias | Verificado: [55](evidencias/55_dependencias_cierre.txt). |
| 2 | Migraciones | Todas aplicadas: [56](evidencias/56_migraciones_cierre.txt). |
| 3 | Carga con `seed_blog` | Ejecución histórica auténtica: [04](evidencias/04_seed_inicial.txt). No se volvió a sembrar la base local. |
| 4 | Conteos | 4 autores, 15 artículos y 23 comentarios; además 4 perfiles, 4 categorías y 5 etiquetas: [54](evidencias/54_datos_cierre.txt). |
| 5 | Relaciones | [Informe C](INFORME.md) y [modelo](modelo.mmd). |
| 6 | Ocho consultas | 8/8 y una SQL cada una: [48](evidencias/48_duelo_cierre.txt). |
| 7 | Intentos reales | [Informe D](INFORME.md): una versión de solución asistida; reevaluaciones diferenciadas de intentos manuales. |
| 8 | Comparación de ocho respuestas IA | [49](evidencias/49_duelo_ia_cierre.txt) e informe E. |
| 9 | Clasificación con evidencia | [SQL](SQL_DUELO.md), [diferencias estructuradas](evidencias/duelos_detalle.json). |
| 10 | N+1 antes | [Fallo original de 23 consultas](evidencias/07_n1_antes_test.txt). |
| 11 | Precarga correcta | `select_related('author')`, `prefetch_related('tags')`; expresión ORM sin cambios en este cierre. |
| 12 | 23 → 2 | [Antes](evidencias/portada_antes.json), [medición actual](evidencias/portada_cierre.json), [test actual](evidencias/50_portada_test_cierre.txt). |
| 13 | Cuatro intenciones | [57](evidencias/57_intenciones_cierre.txt), JSON [actual](evidencias/agente_cierre.json). |
| 14 | Prompt injection | Informe G: salida no confiable, acciones cerradas, parámetros y aprobación. |
| 15 | Hash, modificación, restauración y uso de IA | Informe H–I, [22](evidencias/22_aprobacion5.txt), [28](evidencias/28_aprobacion_obsoleta.txt), [31](evidencias/31_restauracion_exacta2.txt). |

Estos quince puntos verificables están respaldados. Esto no borra las salvedades de los apartados originales 7 y 11.

## 3. Cobertura de los cuatro criterios

Se verifica evidencia suficiente respecto al texto de los criterios facilitado por el usuario. **No se asigna una nota ni se afirma haber obtenido puntos**. El docente conserva la evaluación final y cualquier requisito adicional del campus no adjuntado.

| Criterio | Evidencia disponible | Verificación |
|---|---|---|
| Criterio 1: ocho consultas ORM | Código completo, enunciados, contratos, resultados, SQL y duelo 8/8; captura real del resultado | Evidencia suficiente: [consultas](CONSULTAS_ORM.md), [48](evidencias/48_duelo_cierre.txt), [captura](evidencias/capturas/duelo_equipo.png). |
| Criterio 2: comparación con IA | Tabla de ocho preguntas, diferencias, categorías y SQL; IA original sin modificar | Evidencia suficiente: informe E, [49](evidencias/49_duelo_ia_cierre.txt), [SQL](SQL_DUELO.md), [captura](evidencias/capturas/duelo_ia.png). |
| Criterio 3: N+1 | Fallo antes de editar, desglose 1+11+11, código optimizado, dos SQL y prueba aprobada | Evidencia suficiente: informe F, [07](evidencias/07_n1_antes_test.txt), [50](evidencias/50_portada_test_cierre.txt), [53](evidencias/53_portada_sql_cierre.txt), capturas antes/después. |
| Criterio 4: confianza, agente y uso real de IA | Cuatro intenciones, cuarto comentario, validaciones, aprobación, invalidación, límites del diseño y tabla de uso de IA | Evidencia suficiente: informe G–I, [57](evidencias/57_intenciones_cierre.txt), evidencias históricas 20–31 y [casos](CASOS_Y_CAPTURAS.md). |

## 4. Problemas encontrados y correcciones

### Prueba del starter

`test_the_starter_has_nothing_written` verifica el estado inicial: espera `{'todo'}`. El equipo resuelto devuelve `{'ok'}`. Se conservó el test y se ejecutó la suite completa: **24 descubiertas, 21 aprobadas, 1 fallida y 2 omitidas**. No se eliminó el trabajo correcto ni se modificó el runner para simular un resultado.

La selección funcional explícita descubrió 22 pruebas: **21 aprobadas, cero fallos y una omitida**. Su omisión es la referencia de portada del docente ausente. La selección y la suite completa tienen registros separados; aprobar la selección no convierte la suite original en verde.

Tras dividir el comentario de estilo, se repitieron los cinco comandos obligatorios y la selección funcional: [64, check](evidencias/64_check_final.txt), [65, duelo](evidencias/65_duelo_final.txt), [66, IA](evidencias/66_ia_final.txt), [67, portada](evidencias/67_portada_final.txt), [68, suite completa](evidencias/68_suite_final.txt) y [69, funcionales](evidencias/69_funcionales_final.txt). Se obtuvieron los mismos resultados. La [verificación HTTP definitiva](evidencias/70_http_definitivo.txt) volvió a confirmar ambas rutas y las [huellas definitivas](evidencias/71_fuentes_definitivas.txt) conservan el alcance exacto del cambio.

### Bitácora

Se recuperó la entrada ausente leyendo el encabezado JSON de `12_duelo_resuelto.txt`. No se cambió ese TXT ni se atribuyó una ejecución nueva a su fecha anterior. El [recibo de conciliación](evidencias/conciliacion_bitacora.json) conserva hashes antes/después y el metadato original. No se da por demostrada la causa histórica de la pérdida. Se añadió bloqueo entre procesos y comprobación de duplicados al registrador para proteger las nuevas escrituras.

### Documentación y capturas

Se mantuvieron informe, anexos y evidencias históricas. Se añadieron casos, once capturas reales y trazabilidad de la finalización. Las capturas de resultados son **del navegador mostrando TXT auténticos**, no de una terminal interactiva. Su procedencia se conserva en el manifiesto; no se fabricó una imagen con apariencia de terminal.

### Convenciones y conservación del código

Las ocho consultas no se modificaron durante esta finalización. La validación detectó un comentario de 80 columnas en `blog/queries.py` ([61](evidencias/61_validacion_cierre.txt), [diagnóstico 62](evidencias/62_diagnostico_estilo.txt)); se dividió en dos líneas, sin cambiar la expresión ORM. Se comprueba el mismo árbol sintáctico de la función que figura en el informe y se repitieron pruebas. Nombres, rutas ORM y comentarios añadidos están en inglés; los literales como “Perú” o “Tecnología” son datos del dominio, no nombres inventados. Los docstrings en español que reproducen preguntas del docente se conservaron del material original. Los archivos de consultas no contienen tabulaciones y respetan 79 columnas; el código Python del proyecto y herramientas se comprueba sintácticamente. No se reformatearon masivamente modelos, pruebas ni archivos del docente para alterar un material que debía conservarse.

## 5. Autoría y actividades manuales

| Actividad | Autoría o ejecución observada |
|---|---|
| q1–q8 y optimización | Generadas inicialmente con IA y verificadas por ejecuciones del asistente; no se atribuyen a una resolución sin ayuda. |
| Comandos y casos automatizados | Ejecutados por OpenCode con Python real. Son ejecuciones automatizadas, no intentos manuales del estudiante. |
| Visualización previa de la portada | El estudiante informó en la conversación que abrió y visualizó la página. No demuestra autoría manual de consultas. |
| Prueba destructiva del artículo 5 | Ejecutada por el asistente con autorización expresa del usuario para el ejercicio, no por instrucciones del comentario. |
| Finalización actual | Revisión y documentación asistidas por IA; solo se ajustó un comentario, sin modificar consultas, diseño ni base local. |
| Datos personales, aceptación y posible uso externo de ChatGPT | Pendientes de completar o confirmar por el estudiante; no se inventan. |

La tabla completa de uso de IA permanece en el apartado I del informe.

## 6. Servidor y comprobaciones HTTP

El puerto 8000 ya estaba ocupado por el servidor de este proyecto. Se verificó su comando y **se reutilizó el proceso existente**, sin iniciar otro ni cambiar el diseño.

- Portada: **http://127.0.0.1:8000/** — HTTP 200.
- Administración: **http://127.0.0.1:8000/admin/** — redirección al login, respuesta final HTTP 200; requiere una cuenta autorizada para entrar.
- Estático del administrador: `/static/admin/css/base.css` — HTTP 200, `text/css`.
- Se compararon los 11 artículos del HTML real con los modelos: títulos, autores, fechas y etiquetas coinciden; los borradores no aparecen.
- La medición instrumentada de la portada sigue en **2 consultas**.

Evidencias: [58](evidencias/58_http_servidor.txt), [JSON](evidencias/servidor_cierre.json), [HTML recibido](evidencias/portada_respuesta.html) y [capturas](CASOS_Y_CAPTURAS.md).

## 7. Límites que todavía requieren intervención humana

1. El docente debe decidir cómo considerar la prueba del starter incompatible con respuestas resueltas; no puede presentarse como aprobada.
2. El estudiante debe completar nombre/sección y revisar el texto antes de entregarlo.
3. El documento oficial completo del campus no fue proporcionado; se contrastaron README, código, quince pasos y los cuatro criterios transcritos. Si exige una ventana de terminal en las capturas, se necesita esa captura adicional.
4. El administrador requiere credenciales con permisos; no se creó ni modificó un usuario para este cierre.
5. La entrega, publicación o cualquier operación git continúa pendiente de autorización y no se realiza aquí.

**No hay una corrección funcional pendiente de las ocho consultas ni del N+1.** Los datos locales siguen siendo los originales restaurados. La auditoría actual y su correspondencia de archivos se conservan en [validacion_cierre.json](evidencias/validacion_cierre.json).

La [revisión posterior 72](evidencias/72_revision_artefactos.txt) resolvió la comprobación de los enlaces a los propios archivos de auditoría, que aún se estaban escribiendo durante 63. No encontró enlaces rotos, registros duplicados ni discrepancias de metadatos. El índice actualizado incluye también esta última revisión.
