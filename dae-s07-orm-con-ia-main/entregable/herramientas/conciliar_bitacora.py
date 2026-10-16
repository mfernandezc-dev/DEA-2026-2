"""Recover existing transcript metadata, without rerunning its command."""
from datetime import datetime, timezone
import hashlib
import json

from registrar import EVIDENCE, append_record


def main():
    source = EVIDENCE / "12_duelo_resuelto.txt"
    original_bytes = source.read_bytes()
    record, _ = json.JSONDecoder().raw_decode(
        original_bytes.decode("utf-8")
    )
    ledger = EVIDENCE / "comandos.jsonl"
    before = ledger.read_bytes()
    added = append_record(record)
    assert source.read_bytes() == original_bytes
    after = ledger.read_bytes()
    receipt = {
        "reconciled_utc": datetime.now(timezone.utc).isoformat(),
        "source": source.name,
        "source_sha256": hashlib.sha256(original_bytes).hexdigest(),
        "ledger_sha256_before": hashlib.sha256(before).hexdigest(),
        "ledger_sha256_after": hashlib.sha256(after).hexdigest(),
        "original_metadata": record,
        "metadata_appended": added,
        "original_command_rerun": False,
        "original_transcript_modified": False,
        "reason": "Metadata missing from ledger; authentic TXT preserved.",
    }
    output = EVIDENCE / "conciliacion_bitacora.json"
    if output.exists():
        raise SystemExit("Reconciliation receipt already exists")
    output.write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
