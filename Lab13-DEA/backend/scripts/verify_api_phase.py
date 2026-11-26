"""Record and verify the local baseline for Lab13 API and service changes."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen

BACKEND = Path(__file__).resolve().parent.parent
LAB = BACKEND.parent
ROOT = LAB.parent
EVIDENCE = LAB / 'evidencias' / '02-api-servicios'
REPORT = EVIDENCE / 'VERIFICACION.json'
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['npm_config_cache'] = str(LAB / 'frontend' / '.npm-cache')

import django  # noqa: E402

django.setup()

from catalog.models import Category, Product  # noqa: E402
from quiz.models import Exam, Option, Question  # noqa: E402


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def data_snapshot():
    def records(model):
        return list(model.objects.order_by('pk').values())

    return json.loads(json.dumps({
        'categories': records(Category),
        'products': records(Product),
        'quiz': {model.__name__: records(model)
                 for model in (Exam, Question, Option)},
        'media_sha256': {
            path.relative_to(BACKEND / 'media').as_posix(): digest(path)
            for path in (BACKEND / 'media').rglob('*') if path.is_file()
        },
    }, default=str))


def save(report):
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )


def snapshot():
    if REPORT.exists():
        raise RuntimeError(
            'The phase baseline already exists; keep it intact.'
        )
    assert git('branch', '--show-current').decode().strip() == 'main'
    names = git('ls-files', '-z', '--cached', '--others',
                '--exclude-standard').decode('utf-8').split('\0')
    outside = {
        name: digest(ROOT / name) for name in names
        if name and not name.startswith('Lab13-DEA/')
        and (ROOT / name).is_file()
    }
    database = ROOT / 'Lab12-DEA' / 'backend' / 'db.sqlite3'
    if database.exists():
        outside[database.relative_to(ROOT).as_posix()] = digest(database)
    report = {
        'phase': 2,
        'started_at': datetime.now(timezone.utc).isoformat(),
        'progress': ['Línea base registrada; pasos 3–6 en preparación.'],
        'git_initial': {
            'branch': 'main',
            'head': git('rev-parse', 'HEAD').decode().strip(),
            'branches': git('for-each-ref', '--format=%(refname)',
                            'refs/heads').decode().splitlines(),
            'status': git('status', '--porcelain=v1',
                          '--untracked-files=all').decode().splitlines(),
            'staged_diff_sha256': hashlib.sha256(
                git('diff', '--cached', '--binary')
            ).hexdigest(),
            'outside_file_sha256': outside,
        },
        'data_initial': data_snapshot(),
        'checks': {},
    }
    save(report)
    print(f'Baseline recorded: {len(outside)} protected files, '
          f'{len(report["data_initial"]["products"])} products.')


def run(report, name, command, cwd=BACKEND):
    result = subprocess.run(
        command, cwd=cwd, capture_output=True,
        encoding='utf-8', errors='replace', timeout=240,
    )
    report['checks'][name] = {
        'command': ' '.join(str(part) for part in command),
        'exit_code': result.returncode,
        'status': 'passed' if result.returncode == 0 else 'failed',
        'output': (result.stdout + result.stderr).strip(),
    }
    save(report)
    print(f'{report["checks"][name]["status"].upper()}: {name}')
    if result.returncode:
        raise RuntimeError(report['checks'][name]['output'][-3000:])


def get(url, origin=None):
    request = Request(url, headers={'Origin': origin} if origin else {})
    with urlopen(request, timeout=10) as response:
        return response.status, response.headers, response.read()


def verify_baseline(report):
    initial = report['git_initial']
    changed = [
        name for name, expected in initial['outside_file_sha256'].items()
        if not (ROOT / name).is_file() or digest(ROOT / name) != expected
    ]
    outside = [line for line in git(
        'status', '--porcelain=v1', '--untracked-files=all'
    ).decode().splitlines() if 'Lab13-DEA/' not in line]
    original = [line for line in initial['status'] if 'Lab13-DEA/' not in line]
    result = {
        'branch': git('branch', '--show-current').decode().strip(),
        'head_unchanged': git('rev-parse', 'HEAD').decode().strip()
        == initial['head'],
        'branches_unchanged': git(
            'for-each-ref', '--format=%(refname)', 'refs/heads'
        ).decode().splitlines() == initial['branches'],
        'staging_unchanged': hashlib.sha256(
            git('diff', '--cached', '--binary')
        ).hexdigest() == initial['staged_diff_sha256'],
        'outside_status_unchanged': outside == original,
        'protected_files': len(initial['outside_file_sha256']),
        'changed_outside_lab13': changed,
        'data_and_media_unchanged': data_snapshot() == report['data_initial'],
        'commits_created': False, 'push_executed': False,
    }
    report['final_audit'] = result
    assert result['branch'] == 'main'
    assert not changed
    assert all(result[key] for key in [
        'head_unchanged', 'branches_unchanged', 'staging_unchanged',
        'outside_status_unchanged', 'data_and_media_unchanged',
    ]), 'The baseline changed; inspect the final audit.'


def main():
    report = json.loads(REPORT.read_text(encoding='utf-8'))
    report.pop('error', None)
    report['progress'] = ['Pasos 3–6 implementados; verificación en curso.']
    runtime = EVIDENCE / '.runtime'
    runtime.mkdir(exist_ok=True)
    frontend = LAB / 'frontend'
    npm = shutil.which('npm.cmd') or 'npm'
    server = None
    try:
        for port in (8000, 5173):
            with socket.socket() as probe:
                if probe.connect_ex(('localhost', port)) == 0:
                    raise RuntimeError(
                        f'Port {port} is occupied; no process was stopped.'
                    )
        for name, args in [
            ('django_check', ['check']),
            ('migrate_check', ['migrate', '--check']),
            ('migration_drift', ['makemigrations', '--check', '--dry-run']),
            ('django_tests', ['test', 'quiz', 'catalog', '--verbosity', '1']),
        ]:
            run(report, name, [sys.executable, 'manage.py', *args])
        run(report, 'frontend_unit_tests', [
            'node', '--test', 'tests/catalogServices.test.mjs',
            'tests/exams.test.mjs', 'tests/movieAdapter.test.mjs',
            'tests/requestAudit.test.mjs',
        ], frontend)
        run(report, 'frontend_build', [npm, 'run', 'build'], frontend)
        run(report, 'frontend_lint', [npm, 'run', 'lint'], frontend)
        with (runtime / 'django.log').open('w', encoding='utf-8') as log:
            server = subprocess.Popen(
                [sys.executable, 'manage.py', 'runserver',
                 'localhost:8000', '--noreload'],
                cwd=BACKEND, stdout=log, stderr=log,
            )
            base = 'http://localhost:8000'
            for _ in range(100):
                if server.poll() is not None:
                    raise RuntimeError('Owned Django server failed to start.')
                try:
                    get(base + '/api/')
                    break
                except OSError:
                    time.sleep(0.1)
            else:
                raise RuntimeError('Owned Django server was not ready.')
            run(report, 'services_django_http',
                [npm, 'run', 'test:catalog:integration'], frontend)
            report['http_integration'] = json.loads(
                (runtime / 'http.json').read_text(encoding='utf-8')
            )
            assert report['http_integration']['status'] == 'passed'
            report['http_cors'] = []
            for origin in ['http://localhost:5173', 'http://127.0.0.1:5173']:
                status, headers, _ = get(base + '/api/products/', origin)
                assert status == 200
                assert headers['Access-Control-Allow-Origin'] == origin
                report['http_cors'].append({
                    'origin': origin, 'status': status,
                    'allow_origin': headers['Access-Control-Allow-Origin'],
                })
            run(report, 'legacy_browser_tests', [npm, 'test'], frontend)
            run(report, 'legacy_integration_tests',
                [npm, 'run', 'test:integration'], frontend)
            sections = []
            for key, limit in [
                ('django_tests', 12), ('frontend_unit_tests', 10),
                ('frontend_build', 8), ('services_django_http', 13),
            ]:
                sections.append(key + '\n' + '\n'.join(
                    report['checks'][key]['output'].splitlines()[-limit:]
                ))
            (runtime / 'test-results.txt').write_text(
                '\n\n'.join(sections), encoding='utf-8'
            )
            run(report, 'api_screenshots', ['node', 'scripts/capture_api.mjs'])
        report['screenshots'] = [
            '01-api-categories.png', '02-api-products-nested.png',
            '03-api-product-detail.png', '04-api-created-201.png',
            '05-test-results.png',
        ]
        report['status'] = 'passed'
        report['progress'] = [
            'Pasos 3–6 completados y verificados.',
            'API, servicios y regresiones correctos; datos conservados.',
            'Pasos 7–12 no iniciados; no publicar en GitHub.',
        ]
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = str(error)
        raise
    finally:
        if server and server.poll() is None:
            server.terminate()
            server.wait(timeout=15)
        report['servers_left_running'] = False
        report['completed_at'] = datetime.now(timezone.utc).isoformat()
        try:
            verify_baseline(report)
        except Exception as error:
            report['status'] = 'failed'
            report['audit_error'] = str(error)
            raise
        finally:
            save(report)


if __name__ == '__main__':
    if '--snapshot' in sys.argv:
        snapshot()
    else:
        main()
