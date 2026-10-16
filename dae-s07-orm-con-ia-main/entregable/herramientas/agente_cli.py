"""Pass JSON as one native Windows argument, without shell quoting ambiguity."""
import argparse
import json
from pathlib import Path
import sys

from registrar import record_command


ROOT = Path(__file__).resolve().parents[2]


def run_agent(action, args, evidence, approval=None):
    intent = {"action": action, "args": args}
    command = [
        str(ROOT / ".venv" / "Scripts" / "python.exe"),
        "manage.py", "agent", "--intent", json.dumps(intent, ensure_ascii=False),
    ]
    if approval is not None:
        command.extend(["--approve", approval])
    process = record_command(evidence, command)
    if process.returncode:
        raise SystemExit(process.returncode)
    # The command can append a human-readable warning after the JSON object.
    result, _ = json.JSONDecoder().raw_decode(process.stdout.lstrip())
    payload = {"intent": intent, "approval": approval, "result": result}
    (ROOT / "entregable" / "evidencias" / evidence.replace(".txt", ".json")).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return payload


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action")
    parser.add_argument("--post-id", type=int)
    parser.add_argument("--approve")
    parser.add_argument("--evidence", required=True)
    options = parser.parse_args()
    args = {} if options.post_id is None else {"post_id": options.post_id}
    run_agent(options.action, args, options.evidence, options.approve)
