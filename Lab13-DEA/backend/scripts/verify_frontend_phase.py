"""Verify the TechStore UI against local Django without altering prior labs."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
from datetime import datetime, timezone
from urllib.request import urlopen
import time

from verify_api_phase import data_snapshot, digest, git, LAB, ROOT, BACKEND

EVIDENCE = LAB / 'evidencias' / '03-frontend'
REPORT = EVIDENCE / 'VERIFICACION.json'
FRONTEND = LAB / 'frontend'


def save(report):
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def snapshot():
    if REPORT.exists():
        raise RuntimeError('Keep the existing phase baseline.')
    assert git('branch', '--show-current').decode().strip() == 'main'
    names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').decode().split('\0')
    protected = {name: digest(ROOT / name) for name in names if name and not name.startswith('Lab13-DEA/') and (ROOT / name).is_file()}
    previous_db = ROOT / 'Lab12-DEA/backend/db.sqlite3'
    if previous_db.exists():
        protected[previous_db.relative_to(ROOT).as_posix()] = digest(previous_db)
    save({
        'phase': 3, 'scope': 'Pasos 7–10 exclusivamente',
        'started_at': datetime.now(timezone.utc).isoformat(),
        'status': 'in_progress', 'progress': ['Línea base registrada; interfaz pendiente.'],
        'git_initial': {
            'branch': 'main', 'head': git('rev-parse', 'HEAD').decode().strip(),
            'branches': git('for-each-ref', '--format=%(refname)', 'refs/heads').decode().splitlines(),
            'status': git('status', '--porcelain=v1', '--untracked-files=all').decode().splitlines(),
            'staged_sha256': hashlib.sha256(git('diff', '--cached', '--binary')).hexdigest(),
            'outside_sha256': protected,
        },
        'prior_phase_sha256': {p.relative_to(LAB).as_posix(): digest(p) for folder in ['01-backend', '02-api-servicios'] for p in (LAB / 'evidencias' / folder).glob('*') if p.is_file()},
        'data_initial': data_snapshot(), 'checks': {},
    })
    print(f'Baseline saved: {len(protected)} external files; 3 categories and 8 products expected.')


def run(report, name, command, cwd):
    result = subprocess.run(command, cwd=cwd, capture_output=True, encoding='utf-8', errors='replace', timeout=360)
    report['checks'][name] = {'command': ' '.join(map(str, command)), 'exit_code': result.returncode, 'output': result.stdout + result.stderr}
    save(report)
    print(f'{"PASS" if result.returncode == 0 else "FAIL"} {name}', flush=True)
    if result.returncode:
        raise RuntimeError(report['checks'][name]['output'][-3500:])


def audit(report):
    initial = report['git_initial']
    outside = lambda lines: [line for line in lines if 'Lab13-DEA/' not in line]
    result = {
        'branch': git('branch', '--show-current').decode().strip(),
        'head_unchanged': git('rev-parse', 'HEAD').decode().strip() == initial['head'],
        'branches_unchanged': git('for-each-ref', '--format=%(refname)', 'refs/heads').decode().splitlines() == initial['branches'],
        'staging_unchanged': hashlib.sha256(git('diff', '--cached', '--binary')).hexdigest() == initial['staged_sha256'],
        'outside_status_unchanged': outside(git('status', '--porcelain=v1', '--untracked-files=all').decode().splitlines()) == outside(initial['status']),
        'protected_files': len(initial['outside_sha256']),
        'changed_outside_lab13': [name for name, value in initial['outside_sha256'].items() if not (ROOT / name).is_file() or digest(ROOT / name) != value],
        'prior_evidence_unchanged': all((LAB / name).is_file() and digest(LAB / name) == value for name, value in report['prior_phase_sha256'].items()),
        'data_and_media_unchanged': data_snapshot() == report['data_initial'],
        'commits_created': False, 'push_executed': False,
    }
    report['final_audit'] = result
    assert result['branch'] == 'main' and not result['changed_outside_lab13']
    assert all(result[key] for key in ['head_unchanged', 'branches_unchanged', 'staging_unchanged', 'outside_status_unchanged', 'prior_evidence_unchanged', 'data_and_media_unchanged']), result


def start_servers(report):
    runtime = EVIDENCE / '.runtime'
    runtime.mkdir(exist_ok=True)
    report.setdefault('servers', {})
    for name, port, command, cwd, url in [
        ('django', 8000, [sys.executable, 'manage.py', 'runserver', 'localhost:8000', '--noreload'], BACKEND, 'http://localhost:8000/api/products/'),
        ('vite', 5173, ['node', 'node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5173', '--strictPort'], FRONTEND, 'http://localhost:5173/'),
    ]:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                occupied = True
        except OSError:
            occupied = False
        if occupied:
            with urlopen(url, timeout=5) as response:
                assert response.status == 200
            # Check both address families; Vite can bind only to IPv6 localhost.
            pid = int(subprocess.check_output(['powershell.exe', '-NoProfile', '-Command', f'(Get-NetTCPConnection -State Listen -LocalPort {port} | Select-Object -First 1).OwningProcess'], encoding='utf-8').strip()) if os.name == 'nt' else None
            previous = report['servers'].get(name, {})
            report['servers'][name] = {**previous, 'pid': pid, 'url': url, 'owned': previous.get('pid') == pid and previous.get('owned', False), 'left_running': True, 'http_status': 200}
            continue
        with (runtime / f'{name}.log').open('w', encoding='utf-8') as log:
            flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS if os.name == 'nt' else 0
            process = subprocess.Popen(command, cwd=cwd, stdout=log, stderr=log, stdin=subprocess.DEVNULL, creationflags=flags)
        report['servers'][name] = {'pid': process.pid, 'url': url, 'owned': True, 'command': command, 'left_running': True}
        save(report)
        for _ in range(150):
            if process.poll() is not None:
                raise RuntimeError(f'{name} failed: see .runtime/{name}.log')
            try:
                with urlopen(url, timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError(f'{name} did not start.')


def main():
    report = json.loads(REPORT.read_text(encoding='utf-8'))
    report.pop('error', None)
    npm = shutil.which('npm.cmd') or 'npm'
    os.environ['npm_config_cache'] = str(FRONTEND / '.npm-cache')
    try:
        if '--servers' in sys.argv:
            start_servers(report)
            return
        report['progress'] = ['Interfaz implementada; verificación en curso.']
        save(report)
        for name, args in [('django_check', ['check']), ('migrate_check', ['migrate', '--check']), ('migration_drift', ['makemigrations', '--check', '--dry-run']), ('django_tests', ['test', 'quiz', 'catalog'])]:
            run(report, name, [sys.executable, 'manage.py', *args], BACKEND)
        run(report, 'frontend_unit_tests', ['node', '--test', 'tests/catalogUi.test.mjs', 'tests/catalogServices.test.mjs', 'tests/exams.test.mjs', 'tests/movieAdapter.test.mjs', 'tests/requestAudit.test.mjs'], FRONTEND)
        run(report, 'frontend_build', [npm, 'run', 'build'], FRONTEND)
        run(report, 'frontend_lint', [npm, 'run', 'lint'], FRONTEND)
        start_servers(report)
        run(report, 'techstore_browser', [npm, 'run', 'test:catalog:browser'], FRONTEND)
        report['browser'] = json.loads((EVIDENCE / '.runtime/browser-results.json').read_text(encoding='utf-8'))
        run(report, 'legacy_browser', [npm, 'test'], FRONTEND)
        run(report, 'legacy_integration', [npm, 'run', 'test:integration'], FRONTEND)
        report['status'] = 'passed'
        report['progress'] = ['Pasos 7–10 completos y verificados.', 'Servidores locales disponibles para revisión manual.', 'Fase 04 pendiente; sin publicación.']
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = str(error)
        raise
    finally:
        report['completed_at'] = datetime.now(timezone.utc).isoformat()
        try:
            audit(report)
        except Exception:
            report['status'] = 'failed'
            raise
        finally:
            save(report)


if __name__ == '__main__':
    if '--snapshot' in sys.argv:
        snapshot()
    else:
        main()
