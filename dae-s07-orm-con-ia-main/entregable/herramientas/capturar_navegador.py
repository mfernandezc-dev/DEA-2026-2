"""Capture actual browser pages and authentic TXT files, never fake terminals."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import struct
import subprocess


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "entregable" / "evidencias"
CAPTURES = EVIDENCE / "capturas"
BROWSER = Path(
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)


def main():
    assert BROWSER.is_file()
    CAPTURES.mkdir(exist_ok=True)
    targets = [
        ("portada", "http://127.0.0.1:8000/", 1800),
        ("admin_login", "http://127.0.0.1:8000/admin/", 1000),
        ("duelo_equipo", "48_duelo_cierre.txt", 1400),
        ("duelo_ia", "49_duelo_ia_cierre.txt", 1800),
        ("n1_antes", "07_n1_antes_test.txt", 2600),
        ("n1_despues", "50_portada_test_cierre.txt", 2000),
        ("suite_completa", "51_suite_cierre.txt", 2600),
        ("agente_intenciones", "57_intenciones_cierre.txt", 3200),
        ("plan_aplicado", "22_aprobacion5.txt", 1400),
        ("plan_obsoleto", "28_aprobacion_obsoleta.txt", 1400),
        ("restauracion", "31_restauracion_exacta2.txt", 1600),
    ]
    captures = []
    for name, target, height in targets:
        image = CAPTURES / f"{name}.png"
        assert not image.exists(), "Do not overwrite existing captures"
        source = None if target.startswith("http:") else EVIDENCE / target
        url = target if source is None else source.resolve().as_uri()
        command = [
            str(BROWSER), "--headless=new", "--disable-gpu",
            "--no-first-run", "--no-default-browser-check",
            "--disable-extensions", "--disable-background-networking",
            "--disable-component-update", "--disable-crash-reporter",
            f"--user-data-dir={ROOT / '.venv' / 'browser-capturas'}",
            "--virtual-time-budget=2000", f"--window-size=1600,{height}",
            f"--screenshot={image}", url,
        ]
        process = subprocess.run(
            command, cwd=ROOT, capture_output=True, timeout=45,
        )
        if process.returncode or not image.exists():
            raise RuntimeError(process.stderr.decode("utf-8", "replace"))
        data = image.read_bytes()
        assert data.startswith(b"\x89PNG\r\n\x1a\n")
        width, actual_height = struct.unpack(">II", data[16:24])
        row = {
            "image": f"capturas/{image.name}",
            "captured_utc": datetime.now(timezone.utc).isoformat(),
            "source_url": url,
            "kind": "live_http" if source is None else "browser_of_real_txt",
            "browser_argv": command,
            "exit_code": process.returncode,
            "width": width, "height": actual_height,
            "sha256": hashlib.sha256(data).hexdigest(),
        }
        if source is not None:
            row["source_sha256"] = hashlib.sha256(
                source.read_bytes()
            ).hexdigest()
        captures.append(row)
        print(f"Captured {image.name}: {width}x{actual_height}, {len(data)} bytes")
    manifest = {
        "method": "Real Edge headless screenshots; no synthetic terminal UI.",
        "captures": captures,
    }
    (EVIDENCE / "capturas_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
