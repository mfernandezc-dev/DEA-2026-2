"""Preserve the newly seeded local SQLite database, including IDs and dates.

Only use in this lab, with no concurrent database users. Restore is allowed
only after seed_blog has recreated the fixed dataset, never over other data.
"""
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

from diagnostico import dataset
from django.conf import settings
from django.db import connection


ROOT = Path(__file__).resolve().parents[2]
DATABASE = ROOT / "db.sqlite3"
BACKUP = ROOT / ".venv" / "laboratorio_inicial.sqlite3"
METADATA = ROOT / "entregable" / "evidencias" / "respaldo_inicial.json"


def digest(path):
    with sqlite3.connect(path) as database:
        dump = "\n".join(database.iterdump())
    return hashlib.sha256(dump.encode("utf-8")).hexdigest()


def main():
    assert settings.DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3"
    assert Path(settings.DATABASES["default"]["NAME"]).resolve() == DATABASE.resolve()
    # Do not restore over blog data that differs from the approved fixed seed.
    report = dataset()
    with connection.cursor() as cursor:
        cursor.execute('SELECT COUNT(*) FROM "auth_user"')
        assert cursor.fetchone()[0] == 0, "Unrelated users present; stop."
        cursor.execute('SELECT COUNT(*) FROM "django_session"')
        assert cursor.fetchone()[0] == 0, "Unrelated sessions present; stop."
    connection.close()
    if sys.argv[1] == "crear":
        assert not BACKUP.exists(), "Do not overwrite an existing backup."
        with sqlite3.connect(DATABASE) as source, sqlite3.connect(BACKUP) as target:
            source.backup(target)
        original = digest(DATABASE)
        assert original == digest(BACKUP)
        result = {"database": str(DATABASE), "backup": str(BACKUP), "logical_sha256": original}
        METADATA.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    elif sys.argv[1] == "restaurar":
        original = json.loads(METADATA.read_text(encoding="utf-8"))["logical_sha256"]
        assert digest(BACKUP) == original
        recreated_ids = [post["id"] for post in report["posts"]]
        with sqlite3.connect(BACKUP) as source, sqlite3.connect(DATABASE) as target:
            source.backup(target)
        assert digest(DATABASE) == original
        restored = dataset()
        result = {
            "seed_blog_recreated_ids": recreated_ids,
            "restored_ids": [post["id"] for post in restored["posts"]],
            "logical_sha256": original,
            "exact_initial_database_restored": True,
        }
    else:
        raise SystemExit("Use: respaldo.py crear|restaurar")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
