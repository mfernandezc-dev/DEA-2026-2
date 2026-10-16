"""Index actual terminal evidence and the commands that produced it."""
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
DELIVERY = ROOT / "entregable"
EVIDENCE = DELIVERY / "evidencias"


def main():
    lines = [
        "# Evidencias reales del laboratorio\n",
        "Los TXT contienen fecha UTC, directorio, argumentos reales, código de salida y salida combinada stdout/stderr del proceso. `comandos.jsonl` conserva el registro estructurado, incluidas las invocaciones internas del comando agent. No son capturas simuladas ni resultados reescritos.\n",
        "Los números agrupan etapas; el orden temporal exacto está en las marcas UTC. Algunas lecturas/pruebas independientes se ejecutaron en paralelo. Los tests usan SQLite en memoria y no destruyen la base local del ejercicio.\n",
        "**Salidas con código 1 preservadas:** fallo N+1 antes de optimizar (07 y 11), conflicto del test del starter (17, 33, 51 y 68) y primer intento de auditoría de cierre (61), que detectó un comentario de 80 columnas y se corrigió sin cambiar el ORM. Un comando agent puede terminar con código 0 y devolver `denied` o `approval_required`; el estado funcional está en su JSON.\n",
        "La entrada de 12 se recuperó del encabezado auténtico de su TXT, sin repetir el comando ni modificar su salida. [Recibo de conciliación](evidencias/conciliacion_bitacora.json). El registrador ahora bloquea las escrituras entre procesos.\n",
        "## Comandos registrados\n",
        "En la tabla solo se abrevia el prefijo absoluto del intérprete local; el argv exacto permanece en cada TXT y en el JSONL. Los comandos de instalación no se ejecutaron globalmente.\n",
        "| Evidencia | Código real | Comando |",
        "|---|---:|---|",
    ]
    count = 0
    for path in sorted(EVIDENCE.glob("*.txt")):
        text = path.read_text(encoding="utf-8")
        record, _ = json.JSONDecoder().raw_decode(text)
        argv = [arg.replace(str(ROOT) + "\\", ".\\") for arg in record["argv"]]
        command = subprocess.list2cmdline(argv).replace("|", "\\|")
        lines.append(f"| [{path.name}](evidencias/{path.name}) | {record['exit_code']} | `{command}` |")
        count += 1
    lines.extend([
        "\n## Datos estructurados\n",
        "| Archivo | Contenido |",
        "|---|---|",
    ])
    descriptions = {
        "duelos_detalle.json": "Enunciados, resultados reales/esperados, diferencias y todo el SQL por pregunta y fuente.",
        "portada_antes.json": "23 consultas: 1 artículos, 11 autores, 11 etiquetas; SQL íntegro.",
        "portada_despues.json": "2 consultas: artículos con autores y etiquetas precargadas.",
        "datos_originales.json": "Conteos y correspondencia de artículos con IDs iniciales.",
        "datos_finales.json": "Verificación del seed después de ambas restauraciones.",
        "agente_intenciones.json": "Las cuatro intenciones del README y sus respuestas reales.",
        "fuentes_originales.json": "SHA-256 de los archivos originales Python antes de implementar.",
        "fuentes_finales.json": "SHA-256 final para comprobar el alcance y pruebas intactas.",
        "respaldo_inicial.json": "Ubicación del respaldo local y huella del volcado lógico completo.",
        "validacion_final.json": "Comprobaciones finales, suite no totalmente verde y pendientes explícitos.",
        "conciliacion_bitacora.json": "Recuperación documentada de metadatos auténticos de 12; no es una nueva ejecución.",
        "agente_cierre.json": "Reejecución de las cuatro intenciones sin aprobar borrados.",
        "datos_cierre.json": "Seed preservado al cierre, sin reiniciar la base local.",
        "portada_cierre.json": "SQL y dos consultas confirmadas en la finalización.",
        "servidor_cierre.json": "Proceso existente reutilizado, solicitudes HTTP y datos renderizados verificados.",
        "capturas_manifest.json": "Procedencia, fechas, comandos del navegador y hashes de once capturas reales.",
        "validacion_cierre.json": "Auditoría actualizada de integridad, bitácora, capturas, pruebas y límites.",
        "fuentes_cierre.json": "SHA-256 al primer cierre, antes de dividir un comentario de 80 columnas.",
        "fuentes_definitivas.json": "SHA-256 definitivo; solo se ajustó un comentario, sin cambiar el ORM ni las pruebas.",
    }
    for path in sorted(EVIDENCE.glob("*.json")):
        description = descriptions.get(path.name, "Datos estructurados de la ejecución; consultar su contenido y el TXT asociado.")
        lines.append(f"| [{path.name}](evidencias/{path.name}) | {description} |")
    lines.extend([
        "\n## Capturas reales generadas\n",
        "Se generaron once PNG reales con Microsoft Edge en modo headless, sin modificar la página. Dos muestran el sitio local; las otras muestran los TXT auténticos abiertos en el navegador. **No son capturas de una terminal interactiva**, ni se dibujó una terminal ficticia. Si el docente exige específicamente terminal con su ventana visible, el estudiante debe tomar esa captura adicional.\n",
        "El [manifiesto](evidencias/capturas_manifest.json) conserva procedencia, dimensiones, fecha y SHA-256. [Galería y casos de prueba](CASOS_Y_CAPTURAS.md).\n",
        "### Correspondencia con las evidencias\n",
        "1. 03–05: migraciones, carga y conteos.",
        "2. 06 y 12/32: duelo vacío y duelo resuelto.",
        "3. 13: respuestas de IA y diferencias.",
        "4. 07 y 15/34: prueba de portada roja y verde.",
        "5. 33: suite completa, mostrando también su fallo real y las dos omisiones.",
        "6. 18: intenciones y cuarto comentario tratado como dato.",
        "7. 20–23: plan, hash, aprobación y lista vacía.",
        "8. 26–31: inserción, aprobación obsoleta, no borrado y restauración.",
        "\nSi se vuelven a ejecutar comandos, usar nombres de evidencia nuevos. El registrador se niega a sobrescribir TXT existentes. No repetir el borrado ni restaurar respaldos sobre datos personales añadidos después de este ejercicio.\n",
        "## Reproducibilidad\n",
        "Usar `.venv\\Scripts\\python.exe`; las versiones instaladas se conservan en 37. La base y el entorno son locales y están ignorados por git. El respaldo de práctica queda bajo `.venv/`, no se propone publicarlo. Las herramientas no llaman a servicios LLM externos.\n",
        "La integridad y las limitaciones están explicadas en [INFORME.md](INFORME.md). No se realizaron commits, push, publicaciones ni entregas.\n",
    ])
    (DELIVERY / "EVIDENCIAS.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Indexed {count} genuine terminal transcripts and available JSON evidence.")


if __name__ == "__main__":
    main()
