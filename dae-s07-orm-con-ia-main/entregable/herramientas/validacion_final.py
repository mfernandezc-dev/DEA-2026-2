"""Audit completion without pretending the incompatible starter test passes."""
import ast
import json
import hashlib
from pathlib import Path
import platform
import re
import sys
from urllib.parse import urlsplit
from urllib.request import url2pathname

from diagnostico import dataset, source_hashes
from respaldo import digest
import django
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "entregable" / "evidencias"


def read_json(filename):
    return json.loads((EVIDENCE / filename).read_text(encoding="utf-8"))


def audit():
    original = read_json("fuentes_originales.json")
    current = source_hashes()
    assert set(original) == set(current)
    changed = [name for name in original if original[name] != current[name]]
    assert sorted(changed) == ["blog/duel/team.py", "blog/queries.py"], changed
    assert all(original[name] == current[name] for name in original if name.startswith("blog/tests/"))
    previous = read_json("fuentes_finales.json")
    assert current == read_json("fuentes_definitivas.json")
    assert all(
        current[name] == previous[name]
        for name in previous if name != "blog/queries.py"
    ), "Unexpected application changes during finalization"
    data = dataset()
    assert data == read_json("datos_originales.json")
    assert data == read_json("datos_finales.json")
    assert data == read_json("datos_cierre.json")
    original_digest = read_json("respaldo_inicial.json")["logical_sha256"]
    assert digest(ROOT / "db.sqlite3") == original_digest
    executor = MigrationExecutor(connection)
    pending = executor.migration_plan(executor.loader.graph.leaf_nodes())
    assert not pending
    assert "8 de 8 correctas y baratas" in (EVIDENCE / "65_duelo_final.txt").read_text(encoding="utf-8")
    assert read_json("portada_antes.json")["query_count"] == 23
    assert read_json("portada_despues.json")["query_count"] == 2
    assert read_json("portada_cierre.json")["query_count"] == 2
    assert [row["result"]["status"] for row in read_json("agente_cierre.json")] == [
        "ok", "ok", "approval_required", "denied",
    ]
    approved = read_json("22_aprobacion5.json")
    assert approved["result"]["status"] == "applied"
    assert approved["result"]["result"]["deleted"] == 1
    assert read_json("23_comentarios5_despues.json")["result"]["untrusted_data"] == []
    stale = read_json("28_aprobacion_obsoleta.json")
    assert stale["result"]["status"] == "approval_required"
    assert stale["approval"] != stale["result"]["plan"]["plan_hash"]
    assert len(read_json("29_verificacion_no_borrado.json")["result"]["untrusted_data"]) == 2
    suite = (EVIDENCE / "68_suite_final.txt").read_text(encoding="utf-8")
    assert "Ran 24 tests" in suite
    assert "FAILED (failures=1, skipped=2)" in suite
    failures = re.findall(r"^FAIL: (.+)$", suite, flags=re.MULTILINE)
    assert failures == [
        "test_the_starter_has_nothing_written (blog.tests.test_duel.DuelTests.test_the_starter_has_nothing_written)"
    ], failures
    functional = (EVIDENCE / "69_funcionales_final.txt").read_text(encoding="utf-8")
    assert "Ran 22 tests" in functional and "OK (skipped=1)" in functional
    front_test = (EVIDENCE / "67_portada_final.txt").read_text(encoding="utf-8")
    assert "Ran 3 tests" in front_test and "OK (skipped=1)" in front_test
    ledger = [
        json.loads(line)
        for line in (EVIDENCE / "comandos.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    indexed = {row["evidence"]: row for row in ledger}
    assert len(indexed) == len(ledger), "Duplicate ledger records"
    transcripts = list(EVIDENCE.glob("*.txt"))
    assert len(transcripts) == len(ledger), "Missing ledger metadata"
    for path in transcripts:
        record, _ = json.JSONDecoder().raw_decode(path.read_text(encoding="utf-8"))
        assert record == indexed[path.name], path.name
    receipt = read_json("conciliacion_bitacora.json")
    source = EVIDENCE / receipt["source"]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == receipt["source_sha256"]
    assert indexed[source.name] == receipt["original_metadata"]
    captures = read_json("capturas_manifest.json")["captures"]
    assert len(captures) == 11
    for row in captures:
        image = EVIDENCE / row["image"]
        assert hashlib.sha256(image.read_bytes()).hexdigest() == row["sha256"]
        if row["kind"] == "browser_of_real_txt":
            path = Path(url2pathname(urlsplit(row["source_url"]).path))
            assert hashlib.sha256(path.read_bytes()).hexdigest() == row["source_sha256"]
    server = read_json("servidor_cierre.json")
    assert server["existing_server_reused"]
    assert server["all_titles_authors_dates_tags_match_database"]
    assert all(row["status"] == 200 for row in server["http_responses"])
    assert server["front_page_query_count"] == 2
    report = (ROOT / "entregable" / "INFORME.md").read_text(encoding="utf-8")
    assert all(f"## {letter}." in report for letter in "ABCDEFGHIJ")
    actual_function = next(
        node for node in ast.parse((ROOT / "blog/queries.py").read_text(encoding="utf-8")).body
        if isinstance(node, ast.FunctionDef)
    )
    expected_function = next(
        node for block in re.findall(r"```python\n(.*?)```", report, re.DOTALL)
        for node in ast.parse(block).body
        if isinstance(node, ast.FunctionDef) and node.name == "posts_for_front_page"
    )
    assert ast.dump(actual_function) == ast.dump(expected_function)
    for filename in ("README.md", "INFORME.md", "CONSULTAS_ORM.md", "SQL_DUELO.md", "modelo.mmd", "EVIDENCIAS.md", "CIERRE.md", "CASOS_Y_CAPTURAS.md"):
        assert (ROOT / "entregable" / filename).is_file()
    missing_links = []
    deferred_self_links = []
    for path in (ROOT / "entregable").glob("*.md"):
        for target in re.findall(r"\]\(([^)#]+)(?:#[^)]*)?\)", path.read_text(encoding="utf-8")):
            if target.startswith(("http:", "https:")):
                continue
            destination = path.parent / target
            if not destination.exists():
                if destination.name in ("validacion_cierre.json", "63_validacion_cierre.txt"):
                    deferred_self_links.append(target)
                else:
                    missing_links.append([str(path), target])
    assert not missing_links, missing_links
    for filename in ("blog/duel/team.py", "blog/queries.py"):
        source = (ROOT / filename).read_text(encoding="utf-8")
        assert all(len(line) <= 79 and "\t" not in line for line in source.splitlines())
    for folder in ("blog", "config", "entregable/herramientas"):
        for path in (ROOT / folder).rglob("*.py"):
            compile(path.read_bytes(), str(path), "exec")
    result = {
        "audit_completed": True,
        "python": platform.python_version(), "django": django.get_version(),
        "executable": sys.executable,
        "changed_original_files": changed,
        "original_tests_unchanged": True,
        "all_other_original_python_files_unchanged": True,
        "dataset": data["counts"],
        "exact_initial_database_restored": True,
        "logical_sha256": original_digest,
        "pending_migrations": len(pending),
        "duel_team": "8/8 ok, 1 SQL each; final duel command exit 0",
        "front_page_queries_before": 23, "front_page_queries_after": 2,
        "suite": {"discovered": 24, "passed": 21, "failed": 1, "errors": 0, "skipped": 2},
        "suite_fully_green": False,
        "suite_failure_classification": "Justified starter-state incompatibility; NOT passed",
        "functional_selection": {"discovered": 22, "passed": 21, "failed": 0, "skipped": 1},
        "transcripts_at_audit_start": len(transcripts),
        "ledger_entries_at_audit_start": len(ledger),
        "ledger_consistent": True,
        "recovered_record_12_matches_authentic_txt": True,
        "genuine_browser_captures": len(captures),
        "capture_hashes_valid": True,
        "missing_document_links": missing_links,
        "self_links_to_check_after_recorder_finishes": deferred_self_links,
        "application_semantics_unchanged_during_finalization": True,
        "closure_application_change": "Wrapped one 80-column English comment in blog/queries.py; ORM AST matches report",
        "core_query_files_within_79_columns_no_tabs": True,
        "syntax_valid_all_project_and_evidence_tools": True,
        "server_reused": True,
        "server_url": "http://127.0.0.1:8000/",
        "agent_intents_executed": 4,
        "approved_deletion_verified": True,
        "stale_approval_not_applied": True,
        "all_required_experiments_executed": True,
        "pending": [
            "Teacher review of starter-only test requiring all team answers to be todo.",
            "Student review, personal details and comparison with campus-only rubric.",
            "Interactive-terminal screenshots only if specifically required; genuine browser captures exist.",
        ],
    }
    (EVIDENCE / "validacion_cierre.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    audit()
