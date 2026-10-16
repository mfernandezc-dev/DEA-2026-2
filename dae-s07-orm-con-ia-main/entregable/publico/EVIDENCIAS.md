> Copia pública: rutas locales omitidas por privacidad. Los resultados corresponden a las ejecuciones históricas indicadas; no se repitieron para esta exportación. [Política y procedencia](../PUBLICACION.md).

# Evidencias reales del laboratorio

Los TXT contienen fecha UTC, directorio, argumentos reales, código de salida y salida combinada stdout/stderr del proceso. `comandos.jsonl` conserva el registro estructurado, incluidas las invocaciones internas del comando agent. No son capturas simuladas ni resultados reescritos.

Los números agrupan etapas; el orden temporal exacto está en las marcas UTC. Algunas lecturas/pruebas independientes se ejecutaron en paralelo. Los tests usan SQLite en memoria y no destruyen la base local del ejercicio.

**Salidas con código 1 preservadas:** fallo N+1 antes de optimizar (07 y 11), conflicto del test del starter (17, 33, 51 y 68) y primer intento de auditoría de cierre (61), que detectó un comentario de 80 columnas y se corrigió sin cambiar el ORM. Un comando agent puede terminar con código 0 y devolver `denied` o `approval_required`; el estado funcional está en su JSON.

La entrada de 12 se recuperó del encabezado auténtico de su TXT, sin repetir el comando ni modificar su salida. [Recibo de conciliación](evidencias/conciliacion_bitacora.json). El registrador ahora bloquea las escrituras entre procesos.

## Comandos registrados

En la tabla solo se abrevia el prefijo absoluto del intérprete local; el argv exacto permanece en cada TXT y en el JSONL. Los comandos de instalación no se ejecutaron globalmente.

| Evidencia | Código real | Comando |
|---|---:|---|
| [00_inspeccion.txt](evidencias/00_inspeccion.txt) | 0 | `python entregable/herramientas/inspeccion.py` |
| [01_venv.txt](evidencias/01_venv.txt) | 0 | `python -m venv .venv` |
| [02_dependencias.txt](evidencias/02_dependencias.txt) | 0 | `.venv/Scripts/python.exe -m pip install -r requirements.txt` |
| [03_migraciones.txt](evidencias/03_migraciones.txt) | 0 | `.venv/Scripts/python.exe manage.py migrate` |
| [04_seed_inicial.txt](evidencias/04_seed_inicial.txt) | 0 | `.venv/Scripts/python.exe manage.py seed_blog` |
| [05_conteos_shell.txt](evidencias/05_conteos_shell.txt) | 0 | `.venv/Scripts/python.exe manage.py shell -c "from blog.models import Author, Post, Comment, Category, Tag, Profile; print({model.__name__: model.objects.count() for model in (Author, Post, Comment, Category, Tag, Profile)}); print('Published:', Post.objects.filter(published=True).count()); print('Database:', __import__('django.conf', fromlist=['settings']).settings.DATABASES['default'])"` |
| [06_duelo_inicial.txt](evidencias/06_duelo_inicial.txt) | 0 | `.venv/Scripts/python.exe manage.py duel` |
| [07_n1_antes_test.txt](evidencias/07_n1_antes_test.txt) | 1 | `.venv/Scripts/python.exe manage.py test blog.tests.test_front_page --verbosity 2` |
| [08_n1_antes_sql.txt](evidencias/08_n1_antes_sql.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py portada portada_antes.json` |
| [09_fuentes_originales.txt](evidencias/09_fuentes_originales.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py fuentes fuentes_originales.json` |
| [10_datos_originales.txt](evidencias/10_datos_originales.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py datos datos_originales.json` |
| [11_suite_inicial.txt](evidencias/11_suite_inicial.txt) | 1 | `.venv/Scripts/python.exe manage.py test --verbosity 2` |
| [12_duelo_resuelto.txt](evidencias/12_duelo_resuelto.txt) | 0 | `.venv/Scripts/python.exe manage.py duel` |
| [13_duelo_ia.txt](evidencias/13_duelo_ia.txt) | 0 | `.venv/Scripts/python.exe manage.py duel --source ai` |
| [14_duelos_sql_detalle.txt](evidencias/14_duelos_sql_detalle.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py duelo duelos_detalle.json` |
| [15_n1_despues_test.txt](evidencias/15_n1_despues_test.txt) | 0 | `.venv/Scripts/python.exe manage.py test blog.tests.test_front_page --verbosity 2` |
| [16_n1_despues_sql.txt](evidencias/16_n1_despues_sql.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py portada portada_despues.json` |
| [17_suite_resuelta.txt](evidencias/17_suite_resuelta.txt) | 1 | `.venv/Scripts/python.exe manage.py test --verbosity 2` |
| [18_1_intencion.txt](evidencias/18_1_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"posts_per_author\", \"args\": {}}"` |
| [18_2_intencion.txt](evidencias/18_2_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"comments_of_post\", \"args\": {\"post_id\": 1}}"` |
| [18_3_intencion.txt](evidencias/18_3_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"delete_comments_of_post\", \"args\": {\"post_id\": 1}}"` |
| [18_4_intencion.txt](evidencias/18_4_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"run_sql\", \"args\": {}}"` |
| [18_intenciones.txt](evidencias/18_intenciones.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/intenciones.py` |
| [19_respaldo_previo.txt](evidencias/19_respaldo_previo.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/respaldo.py crear` |
| [20_comentarios5_antes.txt](evidencias/20_comentarios5_antes.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"comments_of_post\", \"args\": {\"post_id\": 5}}"` |
| [21_plan5.txt](evidencias/21_plan5.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"delete_comments_of_post\", \"args\": {\"post_id\": 5}}"` |
| [22_aprobacion5.txt](evidencias/22_aprobacion5.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"delete_comments_of_post\", \"args\": {\"post_id\": 5}}" --approve 4d7ffe2c0e99` |
| [23_comentarios5_despues.txt](evidencias/23_comentarios5_despues.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"comments_of_post\", \"args\": {\"post_id\": 5}}"` |
| [24_seed_restauracion1.txt](evidencias/24_seed_restauracion1.txt) | 0 | `.venv/Scripts/python.exe manage.py seed_blog` |
| [25_restauracion_exacta1.txt](evidencias/25_restauracion_exacta1.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/respaldo.py restaurar` |
| [26_plan5_cambio.txt](evidencias/26_plan5_cambio.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"delete_comments_of_post\", \"args\": {\"post_id\": 5}}"` |
| [27_comentario_intermedio.txt](evidencias/27_comentario_intermedio.txt) | 0 | `.venv/Scripts/python.exe manage.py shell -c "from blog.models import Comment; comment = Comment.objects.create(post_id=5, author_name='Prueba S07', text='Comentario temporal para invalidar el plan'); print({'id': comment.pk, 'post_id': comment.post_id, 'comments_on_5': Comment.objects.filter(post_id=5).count(), 'comments_total': Comment.objects.count()})"` |
| [28_aprobacion_obsoleta.txt](evidencias/28_aprobacion_obsoleta.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"delete_comments_of_post\", \"args\": {\"post_id\": 5}}" --approve 4d7ffe2c0e99` |
| [29_verificacion_no_borrado.txt](evidencias/29_verificacion_no_borrado.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"comments_of_post\", \"args\": {\"post_id\": 5}}"` |
| [30_seed_restauracion2.txt](evidencias/30_seed_restauracion2.txt) | 0 | `.venv/Scripts/python.exe manage.py seed_blog` |
| [31_restauracion_exacta2.txt](evidencias/31_restauracion_exacta2.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/respaldo.py restaurar` |
| [32_duelo_final.txt](evidencias/32_duelo_final.txt) | 0 | `.venv/Scripts/python.exe manage.py duel --strict` |
| [33_suite_final.txt](evidencias/33_suite_final.txt) | 1 | `.venv/Scripts/python.exe manage.py test --verbosity 2` |
| [34_portada_final_test.txt](evidencias/34_portada_final_test.txt) | 0 | `.venv/Scripts/python.exe manage.py test blog.tests.test_front_page --verbosity 2` |
| [35_datos_finales.txt](evidencias/35_datos_finales.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py datos datos_finales.json` |
| [36_pip_check.txt](evidencias/36_pip_check.txt) | 0 | `.venv/Scripts/python.exe -m pip check` |
| [37_versiones.txt](evidencias/37_versiones.txt) | 0 | `.venv/Scripts/python.exe -m pip freeze` |
| [38_check_django.txt](evidencias/38_check_django.txt) | 0 | `.venv/Scripts/python.exe manage.py check` |
| [39_estado_migraciones.txt](evidencias/39_estado_migraciones.txt) | 0 | `.venv/Scripts/python.exe manage.py showmigrations --plan` |
| [40_migraciones_pendientes.txt](evidencias/40_migraciones_pendientes.txt) | 0 | `.venv/Scripts/python.exe manage.py makemigrations --check --dry-run` |
| [41_fuentes_finales.txt](evidencias/41_fuentes_finales.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/diagnostico.py fuentes fuentes_finales.json` |
| [42_validacion_final.txt](evidencias/42_validacion_final.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/validacion_final.py` |
| [43_anexos.txt](evidencias/43_anexos.txt) | 0 | `.venv/Scripts/python.exe entregable/herramientas/generar_anexos.py` |
| [44_sintaxis.txt](evidencias/44_sintaxis.txt) | 0 | `.venv/Scripts/python.exe -m compileall -q blog config entregable/herramientas` |
| [45_revision_documental.txt](evidencias/45_revision_documental.txt) | 0 | `.venv/Scripts/python.exe -c "from pathlib import Path; import re; root=Path('entregable'); missing=[(str(p), target) for p in root.glob('*.md') for target in re.findall(r'\]\(([^)#]+)(?:#[^)]*)?\)', p.read_text(encoding='utf-8')) if not target.startswith(('http:', 'https:')) and not (p.parent/target).exists()]; print('Missing local links:', missing); assert not missing; print('Markdown files:', len(list(root.glob('*.md')))); print('Evidence TXT before this transcript:', len(list((root/'evidencias').glob('*.txt'))))"` |
| [46_conciliacion_bitacora.txt](evidencias/46_conciliacion_bitacora.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/conciliar_bitacora.py` |
| [47_check_cierre.txt](evidencias/47_check_cierre.txt) | 0 | `.venv/Scripts/python.exe -B manage.py check` |
| [48_duelo_cierre.txt](evidencias/48_duelo_cierre.txt) | 0 | `.venv/Scripts/python.exe -B manage.py duel` |
| [49_duelo_ia_cierre.txt](evidencias/49_duelo_ia_cierre.txt) | 0 | `.venv/Scripts/python.exe -B manage.py duel --source ai` |
| [50_portada_test_cierre.txt](evidencias/50_portada_test_cierre.txt) | 0 | `.venv/Scripts/python.exe -B manage.py test blog.tests.test_front_page --verbosity 2` |
| [51_suite_cierre.txt](evidencias/51_suite_cierre.txt) | 1 | `.venv/Scripts/python.exe -B manage.py test --verbosity 2` |
| [52_funcionales_cierre.txt](evidencias/52_funcionales_cierre.txt) | 0 | `.venv/Scripts/python.exe -B manage.py test blog.tests.test_agent blog.tests.test_seed blog.tests.test_front_page blog.tests.test_duel.DuelTests.test_the_assistant_fails_where_the_lab_says blog.tests.test_duel.DuelTests.test_single_question --verbosity 2` |
| [53_portada_sql_cierre.txt](evidencias/53_portada_sql_cierre.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/diagnostico.py portada portada_cierre.json` |
| [54_datos_cierre.txt](evidencias/54_datos_cierre.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/diagnostico.py datos datos_cierre.json` |
| [55_dependencias_cierre.txt](evidencias/55_dependencias_cierre.txt) | 0 | `.venv/Scripts/python.exe -B -m pip check` |
| [56_migraciones_cierre.txt](evidencias/56_migraciones_cierre.txt) | 0 | `.venv/Scripts/python.exe -B manage.py showmigrations --plan` |
| [57_1_intencion.txt](evidencias/57_1_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"posts_per_author\", \"args\": {}}"` |
| [57_2_intencion.txt](evidencias/57_2_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"comments_of_post\", \"args\": {\"post_id\": 1}}"` |
| [57_3_intencion.txt](evidencias/57_3_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"delete_comments_of_post\", \"args\": {\"post_id\": 1}}"` |
| [57_4_intencion.txt](evidencias/57_4_intencion.txt) | 0 | `.\.venv\Scripts\python.exe manage.py agent --intent "{\"action\": \"run_sql\", \"args\": {}}"` |
| [57_intenciones_cierre.txt](evidencias/57_intenciones_cierre.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/intenciones.py --prefix 57 --output agente_cierre.json` |
| [58_http_servidor.txt](evidencias/58_http_servidor.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/verificar_servidor.py` |
| [59_capturas_reales.txt](evidencias/59_capturas_reales.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/capturar_navegador.py` |
| [60_fuentes_cierre.txt](evidencias/60_fuentes_cierre.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/diagnostico.py fuentes fuentes_cierre.json` |
| [61_validacion_cierre.txt](evidencias/61_validacion_cierre.txt) | 1 | `.venv/Scripts/python.exe -B entregable/herramientas/validacion_final.py` |
| [62_diagnostico_estilo.txt](evidencias/62_diagnostico_estilo.txt) | 0 | `.venv/Scripts/python.exe -B -c "from pathlib import Path; files=['blog/duel/team.py','blog/queries.py']; print([(name, number, len(line), line) for name in files for number, line in enumerate(Path(name).read_text(encoding='utf-8').splitlines(), 1) if len(line)>79 or '\t' in line])"` |
| [63_validacion_cierre.txt](evidencias/63_validacion_cierre.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/validacion_final.py` |
| [64_check_final.txt](evidencias/64_check_final.txt) | 0 | `.venv/Scripts/python.exe -B manage.py check` |
| [65_duelo_final.txt](evidencias/65_duelo_final.txt) | 0 | `.venv/Scripts/python.exe -B manage.py duel` |
| [66_ia_final.txt](evidencias/66_ia_final.txt) | 0 | `.venv/Scripts/python.exe -B manage.py duel --source ai` |
| [67_portada_final.txt](evidencias/67_portada_final.txt) | 0 | `.venv/Scripts/python.exe -B manage.py test blog.tests.test_front_page --verbosity 2` |
| [68_suite_final.txt](evidencias/68_suite_final.txt) | 1 | `.venv/Scripts/python.exe -B manage.py test --verbosity 2` |
| [69_funcionales_final.txt](evidencias/69_funcionales_final.txt) | 0 | `.venv/Scripts/python.exe -B manage.py test blog.tests.test_agent blog.tests.test_seed blog.tests.test_front_page blog.tests.test_duel.DuelTests.test_the_assistant_fails_where_the_lab_says blog.tests.test_duel.DuelTests.test_single_question --verbosity 2` |
| [70_http_definitivo.txt](evidencias/70_http_definitivo.txt) | 0 | `.venv/Scripts/python.exe -B -c "import urllib.request; base='http://127.0.0.1:8000'; [(lambda response: print(path, response.status, response.geturl()))(urllib.request.urlopen(base + path, timeout=10)) for path in ['/', '/admin/']]"` |
| [71_fuentes_definitivas.txt](evidencias/71_fuentes_definitivas.txt) | 0 | `.venv/Scripts/python.exe -B entregable/herramientas/diagnostico.py fuentes fuentes_definitivas.json` |
| [72_revision_artefactos.txt](evidencias/72_revision_artefactos.txt) | 0 | `.venv/Scripts/python.exe -B -c "from pathlib import Path; import json, re; root=Path('entregable'); evidence=root/'evidencias'; missing=[(str(p), target) for p in root.glob('*.md') for target in re.findall(r'\]\(([^)#]+)(?:#[^)]*)?\)', p.read_text(encoding='utf-8')) if not target.startswith(('http:', 'https:')) and not (p.parent/target).exists()]; ledger=[json.loads(line) for line in (evidence/'comandos.jsonl').read_text(encoding='utf-8').splitlines()]; indexed={row['evidence']:row for row in ledger}; files=list(evidence.glob('*.txt')); bad=[p.name for p in files if indexed.get(p.name)!=json.JSONDecoder().raw_decode(p.read_text(encoding='utf-8'))[0]]; print({'missing_links':missing,'ledger_rows_before_this_record':len(ledger),'transcripts_before_this_record':len(files),'duplicate_rows':len(ledger)-len(indexed),'metadata_mismatches':bad,'png_captures':len(list((evidence/'capturas').glob('*.png'))),'audit_json_exists':(evidence/'validacion_cierre.json').is_file(),'audit_txt_exists':(evidence/'63_validacion_cierre.txt').is_file()}); assert not missing and not bad and len(ledger)==len(indexed)==len(files)"` |

## Datos estructurados

| Archivo | Contenido |
|---|---|
| [18_1_intencion.json](evidencias/18_1_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [18_2_intencion.json](evidencias/18_2_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [18_3_intencion.json](evidencias/18_3_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [18_4_intencion.json](evidencias/18_4_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [20_comentarios5_antes.json](evidencias/20_comentarios5_antes.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [21_plan5.json](evidencias/21_plan5.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [22_aprobacion5.json](evidencias/22_aprobacion5.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [23_comentarios5_despues.json](evidencias/23_comentarios5_despues.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [26_plan5_cambio.json](evidencias/26_plan5_cambio.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [28_aprobacion_obsoleta.json](evidencias/28_aprobacion_obsoleta.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [29_verificacion_no_borrado.json](evidencias/29_verificacion_no_borrado.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [57_1_intencion.json](evidencias/57_1_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [57_2_intencion.json](evidencias/57_2_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [57_3_intencion.json](evidencias/57_3_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [57_4_intencion.json](evidencias/57_4_intencion.json) | Datos estructurados de la ejecución; consultar su contenido y el TXT asociado. |
| [agente_cierre.json](evidencias/agente_cierre.json) | Reejecución de las cuatro intenciones sin aprobar borrados. |
| [agente_intenciones.json](evidencias/agente_intenciones.json) | Las cuatro intenciones del README y sus respuestas reales. |
| [capturas_manifest.json](evidencias/capturas_manifest.json) | Procedencia, fechas, comandos del navegador y hashes de once capturas reales. |
| [conciliacion_bitacora.json](evidencias/conciliacion_bitacora.json) | Recuperación documentada de metadatos auténticos de 12; no es una nueva ejecución. |
| [datos_cierre.json](evidencias/datos_cierre.json) | Seed preservado al cierre, sin reiniciar la base local. |
| [datos_finales.json](evidencias/datos_finales.json) | Verificación del seed después de ambas restauraciones. |
| [datos_originales.json](evidencias/datos_originales.json) | Conteos y correspondencia de artículos con IDs iniciales. |
| [duelos_detalle.json](evidencias/duelos_detalle.json) | Enunciados, resultados reales/esperados, diferencias y todo el SQL por pregunta y fuente. |
| [fuentes_cierre.json](evidencias/fuentes_cierre.json) | SHA-256 al primer cierre, antes de dividir un comentario de 80 columnas. |
| [fuentes_definitivas.json](evidencias/fuentes_definitivas.json) | SHA-256 definitivo; solo se ajustó un comentario, sin cambiar el ORM ni las pruebas. |
| [fuentes_finales.json](evidencias/fuentes_finales.json) | SHA-256 final para comprobar el alcance y pruebas intactas. |
| [fuentes_originales.json](evidencias/fuentes_originales.json) | SHA-256 de los archivos originales Python antes de implementar. |
| [portada_antes.json](evidencias/portada_antes.json) | 23 consultas: 1 artículos, 11 autores, 11 etiquetas; SQL íntegro. |
| [portada_cierre.json](evidencias/portada_cierre.json) | SQL y dos consultas confirmadas en la finalización. |
| [portada_despues.json](evidencias/portada_despues.json) | 2 consultas: artículos con autores y etiquetas precargadas. |
| [respaldo_inicial.json](evidencias/respaldo_inicial.json) | Ubicación del respaldo local y huella del volcado lógico completo. |
| [servidor_cierre.json](evidencias/servidor_cierre.json) | Proceso existente reutilizado, solicitudes HTTP y datos renderizados verificados. |
| [validacion_cierre.json](evidencias/validacion_cierre.json) | Auditoría actualizada de integridad, bitácora, capturas, pruebas y límites. |
| [validacion_final.json](evidencias/validacion_final.json) | Comprobaciones finales, suite no totalmente verde y pendientes explícitos. |

## Capturas reales generadas

Se generaron once PNG reales con Microsoft Edge en modo headless, sin modificar la página. Dos muestran el sitio local; las otras muestran los TXT auténticos abiertos en el navegador. **No son capturas de una terminal interactiva**, ni se dibujó una terminal ficticia. Si el docente exige específicamente terminal con su ventana visible, el estudiante debe tomar esa captura adicional.

El [manifiesto](evidencias/capturas_manifest.json) conserva procedencia, dimensiones, fecha y SHA-256. [Galería y casos de prueba](CASOS_Y_CAPTURAS.md).

### Correspondencia con las evidencias

1. 03–05: migraciones, carga y conteos.
2. 06 y 12/32: duelo vacío y duelo resuelto.
3. 13: respuestas de IA y diferencias.
4. 07 y 15/34: prueba de portada roja y verde.
5. 33: suite completa, mostrando también su fallo real y las dos omisiones.
6. 18: intenciones y cuarto comentario tratado como dato.
7. 20–23: plan, hash, aprobación y lista vacía.
8. 26–31: inserción, aprobación obsoleta, no borrado y restauración.

Si se vuelven a ejecutar comandos, usar nombres de evidencia nuevos. El registrador se niega a sobrescribir TXT existentes. No repetir el borrado ni restaurar respaldos sobre datos personales añadidos después de este ejercicio.

## Reproducibilidad

Usar `.venv\Scripts\python.exe`; las versiones instaladas se conservan en 37. La base y el entorno son locales y están ignorados por git. El respaldo de práctica queda bajo `.venv/`, no se propone publicarlo. Las herramientas no llaman a servicios LLM externos.

La integridad y las limitaciones están explicadas en [INFORME.md](INFORME.md). No se realizaron commits, push, publicaciones ni entregas.
