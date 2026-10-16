"""Record real command output and exit codes inside the project."""
import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "entregable" / "evidencias"


@contextmanager
def ledger_lock():
    """Serialize ledger writes between independent Windows processes."""
    lock_path = ROOT / ".venv" / "evidence-ledger.lock"
    with lock_path.open("a+b") as lock:
        if lock.tell() == 0:
            lock.write(b"\0")
            lock.flush()
        lock.seek(0)
        if os.name == "nt":
            import msvcrt

            msvcrt.locking(lock.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl

            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            lock.seek(0)
            if os.name == "nt":
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def append_record(record):
    """Append a genuine record once, under an interprocess lock."""
    path = EVIDENCE / "comandos.jsonl"
    with ledger_lock():
        records = [
            json.loads(line)
            for line in path.read_text(encoding="utf-8").splitlines()
        ] if path.exists() else []
        for existing in records:
            if existing["evidence"] == record["evidence"]:
                if existing != record:
                    raise ValueError("Conflicting metadata for one evidence")
                return False
        with path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
    return True


def record_command(filename, command):
    """Run and record one real process; return its captured result."""
    if Path(filename).name != filename or not command:
        raise SystemExit("Use: registrar.py evidence.txt command [arguments]")
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    if (EVIDENCE / filename).exists():
        raise SystemExit(f"Evidence already exists: {filename}; choose another name.")
    env = os.environ.copy()
    env.update(PYTHONIOENCODING="utf-8", PYTHONUTF8="1", NO_COLOR="1")
    started = datetime.now(timezone.utc).isoformat()
    result = subprocess.run(
        command, cwd=ROOT, env=env, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, encoding="utf-8", errors="replace",
    )
    record = {
        "started_utc": started,
        "finished_utc": datetime.now(timezone.utc).isoformat(),
        "cwd": str(ROOT), "argv": command,
        "exit_code": result.returncode, "evidence": filename,
    }
    text = (
        json.dumps(record, ensure_ascii=False, indent=2)
        + "\n\n--- REAL OUTPUT ---\n" + result.stdout
    )
    (EVIDENCE / filename).write_text(text, encoding="utf-8")
    append_record(record)
    print(text)
    return result


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    filename, *command = sys.argv[1:]
    raise SystemExit(record_command(filename, command).returncode)


if __name__ == "__main__":
    main()
