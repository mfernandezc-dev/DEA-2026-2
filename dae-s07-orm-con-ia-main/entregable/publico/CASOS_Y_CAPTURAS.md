> Copia pública: rutas locales omitidas por privacidad. Los resultados corresponden a las ejecuciones históricas indicadas; no se repitieron para esta exportación. [Política y procedencia](../PUBLICACION.md).

# Casos de prueba y capturas auténticas

Las capturas se obtuvieron con **Microsoft Edge headless**. No se fabricaron imágenes ni se modificó el HTML del blog. Las capturas de resultados muestran archivos TXT auténticos abiertos en el navegador: no se presentan como ventanas de terminal. El [manifiesto](evidencias/capturas_manifest.json) registra URL o archivo de origen, comando, fecha, dimensiones y hashes.

## Casos ejecutados

| Caso | Resultado esperado | Resultado observado | Evidencia |
|---|---|---|---|
| Configuración Django | Sin errores | `System check identified no issues` | [47](evidencias/47_check_cierre.txt) |
| q1–q8, equipo | `ok`, una consulta cada una | 8/8, una SQL por pregunta | [48](evidencias/48_duelo_cierre.txt), [código completo](CONSULTAS_ORM.md) |
| Fecha límite q3 | Incluir 01/03 y 31/05 | Equipo: 9 artículos; IA: 7, faltan ambos extremos | [49](evidencias/49_duelo_ia_cierre.txt), [SQL](SQL_DUELO.md) |
| Conteos q5 | 6/3, 4/2, 3/4 | Equipo coincide; IA produce 18/18, 12/12 y 8/8 | [detalle](evidencias/duelos_detalle.json) |
| Autor sin artículos q8 | Incluir Diego, además de Carla | Equipo devuelve Carla y Diego; IA excluye Diego e incluye Ana | [detalle](evidencias/duelos_detalle.json) |
| Portada antes de optimizar | El test de 2 consultas falla | 23 consultas; fallo original conservado | [07](evidencias/07_n1_antes_test.txt) |
| Portada después | Exactamente 2 consultas | Test aprobado; GET instrumentado: 2 SQL | [50](evidencias/50_portada_test_cierre.txt), [53](evidencias/53_portada_sql_cierre.txt) |
| Pruebas funcionales seleccionadas | Sin fallos | 22 descubiertas: 21 aprobadas, 1 omitida por `teacher/` ausente | [52](evidencias/52_funcionales_cierre.txt) |
| Suite completa original | Ejecutar y conservar su resultado | 24 descubiertas: 21 aprobadas, 1 fallida, 2 omitidas | [51](evidencias/51_suite_cierre.txt) |
| Lecturas del agente | `ok`, datos no confiables | Conteos y 6 comentarios bajo `untrusted_data` | [57](evidencias/57_intenciones_cierre.txt) |
| Borrado sin aprobación | Solo plan | `approval_required`, sin borrado | [57.3](evidencias/57_3_intencion.txt) |
| Acción no registrada | Denegar | `run_sql`: `denied` | [57.4](evidencias/57_4_intencion.txt) |
| Aprobación exacta del artículo 5 | Aplicar plan revisado | `applied`, un comentario eliminado | [22](evidencias/22_aprobacion5.txt), [23](evidencias/23_comentarios5_despues.txt) |
| Comentario agregado después del plan | No aplicar hash anterior | `approval_required`, nuevo hash; permanecen los dos comentarios | [28](evidencias/28_aprobacion_obsoleta.txt), [29](evidencias/29_verificacion_no_borrado.txt) |
| Restauración | Recuperar datos de práctica | Seed restaurado y respaldo exacto recuperado; datos preservados al cierre | [31](evidencias/31_restauracion_exacta2.txt), [54](evidencias/54_datos_cierre.txt) |
| Navegación real | Portada y administrador disponibles | HTTP 200; `/admin/` redirige al login; 11 artículos con datos correctos | [58](evidencias/58_http_servidor.txt) |

La ejecución funcional de 52 selecciona expresamente módulos de agente, seed y portada, y dos pruebas funcionales del verificador. No reemplaza la suite completa ni convierte su fallo en una aprobación. La prueba del starter y la referencia de duelo ausente quedan fuera de esa selección; el test original de referencia de portada se omite por su propio decorador. Ninguna prueba fue modificada.

## Galería

### Portada original, sin estilos añadidos

![Portada real del blog](evidencias/capturas/portada.png)

### Administrador: acceso sin autenticación

![Login real del administrador](evidencias/capturas/admin_login.png)

### Duelo del equipo: salida TXT auténtica en el navegador

![Duelo del equipo](evidencias/capturas/duelo_equipo.png)

### Respuestas de IA y diferencias

![Duelo IA](evidencias/capturas/duelo_ia.png)

### N+1 antes y después

![Fallo original de 23 consultas](evidencias/capturas/n1_antes.png)

![Prueba de portada aprobada](evidencias/capturas/n1_despues.png)

### Suite completa, con el fallo real visible

![Suite completa original](evidencias/capturas/suite_completa.png)

### Cuatro intenciones del README

![Intenciones y resultados](evidencias/capturas/agente_intenciones.png)

### Aprobación válida y aprobación obsoleta

![Plan aplicado](evidencias/capturas/plan_aplicado.png)

![Plan anterior no aplicado](evidencias/capturas/plan_obsoleto.png)

### Restauración exacta

![Restauración del respaldo](evidencias/capturas/restauracion.png)

Los casos destructivos se ejecutaron durante el desarrollo inicial sobre la base local recién creada. En esta finalización se conservaron esas evidencias y se reejecutaron sus pruebas aisladas en memoria; no se volvieron a borrar ni recargar los datos locales. Las imágenes de esos casos muestran los registros históricos, no afirman una nueva ejecución del borrado.
