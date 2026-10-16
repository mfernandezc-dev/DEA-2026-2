"""Run the four README intents; never supply approval or execute a write."""
import argparse
import json
from pathlib import Path
import sys

from agente_cli import run_agent


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prefix", default="18")
    parser.add_argument("--output", default="agente_intenciones.json")
    options = parser.parse_args()
    if Path(options.output).name != options.output:
        parser.error("output must be a filename")
    root = Path(__file__).resolve().parents[2]
    output = root / "entregable" / "evidencias" / options.output
    if output.exists():
        parser.error("choose a new output filename")
    results = []
    for number, (action, args) in enumerate((
        ("posts_per_author", {}),
        ("comments_of_post", {"post_id": 1}),
        ("delete_comments_of_post", {"post_id": 1}),
        ("run_sql", {}),
    ), start=1):
        name = f"{options.prefix}_{number}_intencion.txt"
        results.append(run_agent(action, args, name))
    output.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
