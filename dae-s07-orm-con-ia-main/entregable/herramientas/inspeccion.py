"""Inspect the original project before installing dependencies."""
from pathlib import Path
import platform
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8")
print("Working directory:", Path.cwd())
print("Python:", platform.python_version(), sys.executable)
print("Virtual environment exists:", (ROOT / ".venv").exists())
print("Database exists:", (ROOT / "db.sqlite3").exists())
print("Original source files:")
for path in sorted(ROOT.rglob("*")):
    if path.is_file() and "entregable" not in path.parts:
        print(path.relative_to(ROOT))
print("Git status (containing repository; no changes made to git):")
print(subprocess.check_output(["git", "status", "--short"], cwd=ROOT).decode())
for filename in ("blog/duel/team.py", "blog/queries.py"):
    print(f"\n--- ORIGINAL: {filename} ---")
    print((ROOT / filename).read_text(encoding="utf-8"))
