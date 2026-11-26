"""Verify Lab13 locally, record evidence, and stop only owned processes."""

import hashlib
import json
import os
from pathlib import Path
import secrets
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
EVIDENCE = LAB / 'evidencias' / '01-backend'
REPORT = EVIDENCE / 'VERIFICACION.json'
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['npm_config_cache'] = str(LAB / 'frontend' / '.npm-cache')

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.db.migrations.executor import MigrationExecutor  # noqa: E402
from django.db import connection  # noqa: E402
from catalog.models import Category, Product  # noqa: E402


def git(*args):
    return subprocess.check_output(
        ['git', *args], cwd=ROOT
    ).decode('utf-8').splitlines()


def run(report, name, command, cwd=BACKEND, env=None):
    result = subprocess.run(
        command, cwd=cwd, env=env, capture_output=True,
        encoding='utf-8', errors='replace', timeout=240,
    )
    output = result.stdout + result.stderr
    report['checks'][name] = {
        'command': ' '.join(str(part) for part in command),
        'exit_code': result.returncode,
        'status': 'passed' if result.returncode == 0 else 'failed',
        'output': output.strip(),
    }
    print(f'{report["checks"][name]["status"].upper()}: {name}')
    if result.returncode:
        raise RuntimeError(output[-3000:])


def get(url, origin=None):
    request = Request(url, headers={'Origin': origin} if origin else {})
    with urlopen(request, timeout=10) as response:
        return response.status, response.headers, response.read()


def verify_git(report):
    initial = report['git_initial']
    changed = []
    for name, expected in initial['outside_file_sha256'].items():
        path = ROOT / name
        if not path.is_file():
            changed.append(name)
        elif hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            changed.append(name)
    current = git('status', '--porcelain=v1', '--untracked-files=all')
    outside = [line for line in current if 'Lab13-DEA/' not in line]
    unchanged = (
        not changed
        and outside == initial['status']
        and git('diff', '--cached', '--name-only') == initial['staged']
        and git('rev-parse', 'HEAD')[0] == initial['head']
        and git('branch', '--show-current') == ['main']
    )
    report['git_final'] = {
        'branch': git('branch', '--show-current')[0],
        'head': git('rev-parse', 'HEAD')[0],
        'ahead_behind': git(
            'rev-list', '--left-right', '--count', 'HEAD...origin/main'
        )[0],
        'staged': git('diff', '--cached', '--name-only'),
        'protected_file_count': len(initial['outside_file_sha256']),
        'changed_outside_lab13': changed,
        'outside_git_status_unchanged': outside == initial['status'],
        'previous_labs_unchanged': unchanged,
        'commits_created': False,
        'push_executed': False,
        'branches_created': False,
    }
    assert unchanged, 'Previous work or Git state changed.'


def main():
    report = json.loads(REPORT.read_text(encoding='utf-8'))
    report.pop('error', None)
    report.pop('git_error', None)
    report['checks'] = {}
    report['tools'] = {
        'python': sys.version.split()[0],
        'node': subprocess.check_output(
            ['node', '--version']
        ).decode().strip(),
        'npm': subprocess.check_output(
            [shutil.which('npm.cmd') or 'npm', '--version']
        ).decode().strip(),
        'git': git('--version')[0],
    }
    report['dependencies'] = json.loads(subprocess.check_output(
        [sys.executable, '-m', 'pip', 'list', '--format=json']
    ))
    report['progress'] = ['Environment and steps 1-2 implemented; verifying.']
    server = None
    user = None
    runtime = EVIDENCE / '.runtime'
    runtime.mkdir(exist_ok=True)
    try:
        for port in (8000, 5173):
            with socket.socket() as probe:
                if probe.connect_ex(('localhost', port)) == 0:
                    raise RuntimeError(
                        f'Port {port} is occupied; no process was stopped.'
                    )
        for name, args in [
            ('django_check', ['check']),
            ('migration_drift', ['makemigrations', '--check', '--dry-run']),
            ('migrations', ['showmigrations', '--plan']),
            ('seed_first', ['seed_catalog']),
            ('seed_repeated', ['seed_catalog']),
            ('django_tests', ['test', 'quiz', 'catalog', '--verbosity', '1']),
        ]:
            run(report, name, [sys.executable, 'manage.py', *args])
        executor = MigrationExecutor(connection)
        assert not executor.migration_plan(executor.loader.graph.leaf_nodes())
        assert Category.objects.count() == 3
        assert Product.objects.count() == 8
        products = list(Product.objects.select_related('category'))
        for product in products:
            product.full_clean()
        report['catalog'] = {
            'categories': list(Category.objects.values('name', 'description')),
            'products': [{
                'name': item.name, 'price_pen': str(item.price),
                'stock': item.stock, 'category': item.category.name,
                'image': item.image.name,
            } for item in products],
            'images': 'Original local illustrations, not photographs.',
            'pending_migrations': 0,
        }
        npm = shutil.which('npm.cmd') or 'npm'
        frontend = LAB / 'frontend'
        for name, command in [
            ('frontend_build', [npm, 'run', 'build']),
            ('frontend_lint', [npm, 'run', 'lint']),
            ('frontend_unit_tests', [
                'node', '--test', 'tests/exams.test.mjs',
                'tests/movieAdapter.test.mjs', 'tests/requestAudit.test.mjs',
            ]),
        ]:
            run(report, name, command, frontend)

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
                    get(f'{base}/api/')
                    break
                except OSError:
                    time.sleep(0.1)
            else:
                raise RuntimeError('Owned Django server was not ready.')
            media_results = []
            for product in products:
                status, headers, body = get(base + product.image.url)
                assert status == 200
                assert headers.get_content_type() == 'image/png'
                expected = Path(product.image.path).read_bytes()
                assert body == expected
                media_results.append({
                    'product': product.name,
                    'url': base + product.image.url,
                    'status': status, 'bytes': len(body),
                    'sha256': hashlib.sha256(body).hexdigest(),
                })
            report['http_images'] = media_results
            report['http_cors'] = []
            for origin in ['http://localhost:5173', 'http://127.0.0.1:5173']:
                status, headers, _ = get(f'{base}/api/exams/', origin)
                assert status == 200
                assert headers['Access-Control-Allow-Origin'] == origin
                report['http_cors'].append({
                    'origin': origin, 'status': status,
                    'allow_origin': headers['Access-Control-Allow-Origin'],
                })
            run(report, 'frontend_browser_tests', [npm, 'test'], frontend)
            run(report, 'frontend_integration_tests',
                [npm, 'run', 'test:integration'], frontend)
            password = secrets.token_urlsafe(32)
            user = get_user_model().objects.create_superuser(
                username=f'evidence_{secrets.token_hex(4)}', password=password,
            )
            run(report, 'admin_screenshots',
                ['node', 'scripts/capture_admin.mjs'], env={
                    **os.environ,
                    'ADMIN_EVIDENCE_USERNAME': user.username,
                    'ADMIN_EVIDENCE_PASSWORD': password,
                    'LAB13_BACKEND_URL': base,
                })
        report['progress'] = [
            'Preparation and steps 1-2 verified.',
            'Steps 3-12 not started.',
            'Manual terminal/IDE screenshots remain pending.',
        ]
        report['status'] = 'passed'
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = str(error)
        raise
    finally:
        if user:
            user.delete()
        if server and server.poll() is None:
            server.terminate()
            server.wait(timeout=15)
        report['servers_left_running'] = False
        report['completed_at'] = datetime.now(timezone.utc).isoformat()
        try:
            verify_git(report)
        except Exception as error:
            report['status'] = 'failed'
            report['git_error'] = str(error)
            raise
        finally:
            REPORT.write_text(
                json.dumps(report, indent=2, ensure_ascii=False) + '\n',
                encoding='utf-8',
            )


if __name__ == '__main__':
    main()
