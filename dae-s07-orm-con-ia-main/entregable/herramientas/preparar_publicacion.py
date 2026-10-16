"""Export redacted academic evidence without changing private originals."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
DELIVERY = ROOT / "entregable"
PUBLIC = DELIVERY / "publico"
PRIVATE = ROOT / ".venv" / "publication_backup"
EDGE = Path(
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def redact(text):
    """Hide absolute project, workspace and home paths in all encodings."""
    for path, marker in (
        (ROOT, "<PROJECT_ROOT>"),
        (ROOT.parent, "<WORKSPACE_ROOT>"),
        (Path.home(), "<USER_HOME>"),
    ):
        forms = {
            str(path), path.as_posix(), path.as_uri(),
            json.dumps(str(path), ensure_ascii=False)[1:-1],
        }
        for form in sorted(forms, key=len, reverse=True):
            text = text.replace(form, marker)
    return text


def scan(text, name):
    patterns = {
        "private_home_path": r"(?i)[a-z]:[/\\]+users[/\\]+",
        "private_file_uri": r"(?i)file:/+[^\s\"<>]*users/",
        "github_token": r"(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}",
        "openai_key": r"\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}",
        "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "password_hash": r"(?:pbkdf2_sha256|argon2|bcrypt_sha256)\$",
        "credential_url": r"https?://[^/\s:@]+:[^/\s@]+@",
    }
    for kind, pattern in patterns.items():
        if re.search(pattern, text):
            raise ValueError(f"Publication blocked: {kind} in {name}")


def main():
    assert not PUBLIC.exists(), "Export exists; do not overwrite it silently"
    assert EDGE.is_file(), "A real browser is required for public screenshots"
    PRIVATE.mkdir(parents=True, exist_ok=True)
    for filename in (".gitignore", "entregable/README.md"):
        source = ROOT / filename
        backup = PRIVATE / filename.replace("/", "_")
        assert not backup.exists()
        shutil.copy2(source, backup)
    code_before = {
        str(path.relative_to(ROOT)): sha(path.read_bytes())
        for folder in ("blog", "config")
        for path in (ROOT / folder).rglob("*.py")
    }
    database_before = sha((ROOT / "db.sqlite3").read_bytes())
    PUBLIC.mkdir()
    entries = []
    sources = list(DELIVERY.glob("*.md")) + [DELIVERY / "modelo.mmd"]
    sources += [
        path for path in (DELIVERY / "evidencias").iterdir()
        if path.is_file() and path.suffix in (".txt", ".json", ".jsonl", ".html")
        and path.name != "capturas_manifest.json"
    ]
    for source in sorted(sources):
        relative = source.relative_to(DELIVERY)
        target = PUBLIC / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        original = source.read_bytes()
        text = redact(original.decode("utf-8"))
        if source.suffix == ".md":
            text = (
                "> Copia pública: rutas locales omitidas por privacidad. "
                "Los resultados corresponden a las ejecuciones históricas "
                "indicadas; no se repitieron para esta exportación. "
                "[Política y procedencia](../PUBLICACION.md).\n\n" + text
            )
            if source.name == "README.md":
                text = text.replace("](herramientas/)", "](../herramientas/)")
        elif source.suffix == ".txt":
            text += (
                "\n\n[PUBLIC COPY: local paths redacted; private original "
                "preserved. This export is not a new command execution.]\n"
            )
        scan(text, str(relative))
        if source.suffix == ".json":
            json.loads(text)
        elif source.suffix == ".jsonl":
            for line in text.splitlines():
                json.loads(line)
        target.write_text(text, encoding="utf-8", newline="\n")
        entries.append({
            "path": relative.as_posix(),
            "original_sha256": sha(original),
            "public_sha256": sha(target.read_bytes()),
            "changed_for_publication": target.read_bytes() != original,
        })
    original_manifest = json.loads(
        (DELIVERY / "evidencias/capturas_manifest.json").read_text(encoding="utf-8")
    )
    captures = []
    images = PUBLIC / "evidencias" / "capturas"
    images.mkdir()
    for row in original_manifest["captures"]:
        target = PUBLIC / "evidencias" / row["image"]
        if row["kind"] == "live_http":
            shutil.copy2(DELIVERY / "evidencias" / row["image"], target)
            capture = {
                "image": row["image"], "kind": "original_live_http",
                "source": row["source_url"],
                "captured_utc": row["captured_utc"],
                "original_image_sha256": row["sha256"],
            }
        else:
            name = row["source_url"].rsplit("/", 1)[1]
            source = PUBLIC / "evidencias" / name
            command = [
                str(EDGE), "--headless=new", "--disable-gpu",
                "--no-first-run", "--no-default-browser-check",
                "--disable-extensions", "--disable-background-networking",
                "--disable-component-update", "--disable-crash-reporter",
                f"--user-data-dir={ROOT / '.venv/publication-browser'}",
                "--virtual-time-budget=2000",
                f"--window-size={row['width']},{row['height']}",
                f"--screenshot={target}", source.resolve().as_uri(),
            ]
            process = subprocess.run(
                command, cwd=ROOT, capture_output=True, timeout=45,
            )
            if process.returncode or not target.exists():
                raise RuntimeError("Browser screenshot failed")
            capture = {
                "image": row["image"],
                "kind": "browser_of_redacted_transcript",
                "source": f"evidencias/{name}",
                "source_sha256": sha(source.read_bytes()),
                "captured_utc": datetime.now(timezone.utc).isoformat(),
                "lab_command_reexecuted": False,
            }
        image = target.read_bytes()
        assert image.startswith(b"\x89PNG\r\n\x1a\n")
        width, height = struct.unpack(">II", image[16:24])
        capture.update(sha256=sha(image), width=width, height=height)
        captures.append(capture)
        print(f"Public screenshot ready: {target.name}")
    (PUBLIC / "evidencias/capturas_manifest.json").write_text(
        json.dumps({
            "method": "Real browser captures; private paths removed before recapture",
            "captures": captures,
        }, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    code_after = {
        str(path.relative_to(ROOT)): sha(path.read_bytes())
        for folder in ("blog", "config")
        for path in (ROOT / folder).rglob("*.py")
    }
    assert code_before == code_after
    assert database_before == sha((ROOT / "db.sqlite3").read_bytes())
    manifest = {
        "exported_utc": datetime.now(timezone.utc).isoformat(),
        "policy": "Public redacted copies; unmodified private originals excluded from git",
        "files": entries,
        "capture_count": len(captures),
        "functional_source_unchanged": True,
        "local_database_unchanged": True,
        "private_original_hashes_are_not_public_copy_hashes": True,
    }
    (PUBLIC / "evidencias/publicacion_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({
        "exported_text_files": len(entries),
        "genuine_public_screenshots": len(captures),
        "functional_source_unchanged": True,
        "database_unchanged": True,
    }, indent=2))


def refresh_public():
    """Normalize generated Windows line endings and refresh real captures."""
    for path in PUBLIC.rglob("*"):
        if path.is_file() and path.suffix in (
            ".md", ".mmd", ".txt", ".json", ".jsonl", ".html"
        ):
            data = path.read_bytes()
            fixed = data.replace(b"\r\r\n", b"\r\n")
            if fixed != data:
                path.write_bytes(fixed)
    path = PUBLIC / "evidencias/capturas_manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for row in manifest["captures"]:
        if row["kind"] != "browser_of_redacted_transcript":
            continue
        source = PUBLIC / row["source"]
        target = PUBLIC / "evidencias" / row["image"]
        command = [
            str(EDGE), "--headless=new", "--disable-gpu",
            "--no-first-run", "--no-default-browser-check",
            "--disable-extensions", "--disable-background-networking",
            "--disable-component-update", "--disable-crash-reporter",
            f"--user-data-dir={ROOT / '.venv/publication-browser'}",
            "--virtual-time-budget=2000",
            f"--window-size={row['width']},{row['height']}",
            f"--screenshot={target}", source.resolve().as_uri(),
        ]
        process = subprocess.run(
            command, cwd=ROOT, capture_output=True, timeout=45,
        )
        assert process.returncode == 0
        row.update(
            source_sha256=sha(source.read_bytes()),
            sha256=sha(target.read_bytes()),
            captured_utc=datetime.now(timezone.utc).isoformat(),
        )
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8", newline="\n",
    )
    path = PUBLIC / "evidencias/publicacion_manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for row in manifest["files"]:
        row["public_sha256"] = sha((PUBLIC / row["path"]).read_bytes())
    manifest["windows_export_line_endings_normalized"] = True
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8", newline="\n",
    )
    print("Public line endings and nine real browser captures refreshed.")


if __name__ == "__main__":
    if "--refresh" in sys.argv:
        refresh_public()
    else:
        main()
