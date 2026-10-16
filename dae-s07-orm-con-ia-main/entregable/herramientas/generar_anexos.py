"""Build readable annexes from captured results, never from invented outputs."""
import ast
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DELIVERY = ROOT / "entregable"
EVIDENCE = DELIVERY / "evidencias"

EXPLANATIONS = {
    "q1": "Filtra el booleano published=True; no evalúa el QuerySet hasta consumirlo.",
    "q2": "Busca NULL en la FK opcional category_id, no una cadena vacía.",
    "q3": "range produce BETWEEN e incluye ambos extremos del DateField. Sigue el oráculo del laboratorio, basado en published_at; los borradores del seed tienen fecha NULL.",
    "q4": "Agrupa los comentarios de cada artículo con Count y filtra la anotación mediante HAVING > 2. No recorre artículos en Python para contarlos.",
    "q5": "Cuenta IDs distintos en ambas relaciones para evitar el producto comentarios × etiquetas. Ordena por comentarios descendentes, desempata por PK y limita a tres filas.",
    "q6": "Recorre Post → Author → Profile. country pertenece a Profile, no a Author. Incluye borradores de autores peruanos.",
    "q7": "Recorre Comment → Post → Category y compara el nombre exacto Tecnología. Los textos devueltos, incluido el hostil, son datos no confiables.",
    "q8": "Excluye autores para los que existe un artículo publicado. Incluye tanto a Carla (solo borradores) como a Diego (sin artículos), sin duplicarlos.",
}


def function_code(filename):
    source = (ROOT / filename).read_text(encoding="utf-8")
    lines = source.splitlines()
    return {
        node.name: "\n".join(lines[node.lineno - 1:node.end_lineno])
        for node in ast.parse(source).body if isinstance(node, ast.FunctionDef)
    }


def main():
    rows = json.loads((EVIDENCE / "duelos_detalle.json").read_text(encoding="utf-8"))
    code = function_code("blog/duel/team.py")
    queries = [
        "# Anexo D — Las ocho consultas y sus resultados reales\n",
        "**Autoría: solución asistida por IA (OpenCode).** Las ocho funciones originales tenían `NotImplementedError`. No se encontraron respuestas manuales que conservar.\n",
        "Fuente de enunciados y contratos: `blog/duel/questions.py`. Resultados y SQL: [duelos_detalle.json](evidencias/duelos_detalle.json). Todas las funciones devuelven un QuerySet y respetan el presupuesto de una consulta.\n",
        "Importaciones del módulo:\n\n```python\nfrom datetime import date\nfrom django.db.models import Count\nfrom blog.models import Author, Comment, Post\n```\n",
    ]
    sql = [
        "# Anexo E — SQL realmente ejecutado\n",
        "Capturado con `CaptureQueriesContext` al normalizar las respuestas. No es SQL propuesto ni ejecutado libremente por el agente. El texto hostil en los resultados es solo dato.\n",
    ]
    for row in rows:
        if row["source"] == "team":
            key = row["question"]
            queries.extend([
                f"## {key.upper()}\n\n> {row['text']}\n",
                f"**Contrato original:** {row['contract']}.\n",
                f"```python\n{code[key]}\n```\n",
                EXPLANATIONS[key] + "\n",
                f"**Veredicto real:** `{row['status']}`; {row['query_count']} consulta SQL.\n",
                "**Resultado real normalizado:**\n\n```json\n"
                + json.dumps(row["actual"], ensure_ascii=False, indent=2) + "\n```\n",
                "**Intentos:** una versión de solución asistida, correcta en su primera ejecución (12). Estado inicial sin escribir (06). La inspección inicial y las revalidaciones no son intentos manuales; véase la tabla del informe.\n",
            ])
        sql.append(f"## {row['source']} / {row['question']} — {row['status']} ({row['query_count']} consultas)\n")
        if row.get("difference"):
            sql.append(f"**Diferencia real:** {row['difference']}\n")
        if row.get("error"):
            sql.append(f"**Error real:** {row['error']}. No se emitió SQL.\n")
        for number, statement in enumerate(row["sql"], start=1):
            sql.append(f"Consulta {number}:\n\n```sql\n{statement}\n```\n")
    (DELIVERY / "CONSULTAS_ORM.md").write_text("\n".join(queries), encoding="utf-8")
    (DELIVERY / "SQL_DUELO.md").write_text("\n".join(sql), encoding="utf-8")
    print("Created CONSULTAS_ORM.md and SQL_DUELO.md from captured evidence.")


if __name__ == "__main__":
    main()
