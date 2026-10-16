"""Check the exact S07 publication scope before staging or committing."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

from preparar_publicacion import scan


ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = ROOT.parent
PREFIX = ROOT.name + "/"
PRIVATE = ROOT / ".venv/publication_backup"


def git(*args):
    return subprocess.check_output(
        ["git", *args], cwd=REPOSITORY, encoding="utf-8"
    )


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staged", action="store_true")
    options = parser.parse_args()
    assert git("branch", "--show-current").strip() == "main"
    assert git("remote", "get-url", "origin").strip() == (
        "https://github.com/mfernandezc-dev/DEA-2026-2.git"
    )
    assert not git("status", "--porcelain", "--", "Lab05-DEA").strip()
    if options.staged:
        paths = git("diff", "--cached", "--name-only", "-z").split("\0")
        modes = git("ls-files", "--stage", "--", ROOT.name)
        assert not any(line.startswith("160000 ") for line in modes.splitlines())
    else:
        paths = git(
            "ls-files", "--others", "--exclude-standard", "-z", "--", ROOT.name
        ).split("\0")
    paths = [path for path in paths if path]
    assert paths, "No publication files found"
    for name in paths:
        assert name.startswith(PREFIX), "Changes outside the laboratory"
        relative = Path(name[len(PREFIX):])
        assert not any(
            part in (".venv", "venv", "__pycache__", ".git")
            for part in relative.parts
        ), name
        assert not relative.name.startswith(".env"), name
        assert relative.suffix.lower() not in (
            ".sqlite3", ".sqlite", ".db", ".pyc", ".pem", ".key", ".pfx", ".p12"
        ), name
        assert not str(relative).replace("\\", "/").startswith(
            "entregable/evidencias/"
        ), "Private evidence selected"
        path = REPOSITORY / name
        if path.suffix.lower() in (".py", ".md", ".txt", ".json", ".jsonl", ".html", ".mmd"):
            scan(path.read_text(encoding="utf-8"), name)
    for required in (
        "manage.py", "requirements.txt", "README.md", ".gitignore",
        "config/settings.py", "blog/models.py", "blog/duel/team.py",
        "blog/migrations/0001_initial.py", "blog/tests/test_agent.py",
        "entregable/README.md", "entregable/publico/INFORME.md",
        "entregable/publico/evidencias/65_duelo_final.txt",
    ):
        assert PREFIX + required in paths, required
    missing_links = []
    documents = list((ROOT / "entregable/publico").glob("*.md"))
    documents += [ROOT / "entregable/README.md", ROOT / "entregable/PUBLICACION.md"]
    for document in documents:
        for target in re.findall(
            r"\]\(([^)#]+)(?:#[^)]*)?\)",
            document.read_text(encoding="utf-8"),
        ):
            if not target.startswith(("http:", "https:")):
                destination = document.parent / target
                if not destination.exists():
                    missing_links.append([document.name, target])
                elif destination.is_file():
                    tracked_name = destination.resolve().relative_to(REPOSITORY).as_posix()
                    assert tracked_name in paths, f"Link to excluded file: {target}"
    assert not missing_links, missing_links
    expected = json.loads(
        (ROOT / "entregable/evidencias/fuentes_definitivas.json").read_text(encoding="utf-8")
    )
    assert all(sha(ROOT / name) == digest for name, digest in expected.items())
    captures = json.loads(
        (ROOT / "entregable/publico/evidencias/capturas_manifest.json").read_text(encoding="utf-8")
    )["captures"]
    for row in captures:
        image = ROOT / "entregable/publico/evidencias" / row["image"]
        assert sha(image) == row["sha256"]
    export_manifest = json.loads(
        (ROOT / "entregable/publico/evidencias/publicacion_manifest.json").read_text(encoding="utf-8")
    )
    for row in export_manifest["files"]:
        assert sha(ROOT / "entregable/publico" / row["path"]) == row["public_sha256"]
    text_files = list((ROOT / "entregable/publico/evidencias").glob("*.txt"))
    ledger = [
        json.loads(line) for line in
        (ROOT / "entregable/publico/evidencias/comandos.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    indexed = {row["evidence"]: row for row in ledger}
    assert len(indexed) == len(ledger) == len(text_files)
    for path in text_files:
        metadata, _ = json.JSONDecoder().raw_decode(path.read_text(encoding="utf-8"))
        assert indexed[path.name] == metadata
    state = {
        "base_commit": git("rev-parse", "HEAD").strip(),
        "lab05_tree": git("rev-parse", "HEAD:Lab05-DEA").strip(),
        "database_sha256": sha(ROOT / "db.sqlite3"),
    }
    state_path = PRIVATE / "pre_push_state.json"
    if state_path.exists():
        assert json.loads(state_path.read_text(encoding="utf-8")) == state
    else:
        state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    print(json.dumps({
        "mode": "staged" if options.staged else "candidate",
        "publication_files": len(paths),
        "public_transcripts": len(text_files),
        "public_ledger_entries": len(ledger),
        "public_captures": len(captures),
        "private_path_and_secret_scan": "passed",
        "published_links": "passed",
        "functional_source_and_tests_unchanged": True,
        "lab05_tree": state["lab05_tree"],
        "local_database_unchanged_since_first_publication_check": True,
        "no_submodule_added": True,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
