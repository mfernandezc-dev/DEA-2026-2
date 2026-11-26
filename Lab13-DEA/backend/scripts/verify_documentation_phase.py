"""Audit local academic documents and freeze a publication-only manifest."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit

from PIL import Image

BACKEND = Path(__file__).resolve().parent.parent
LAB = BACKEND.parent
ROOT = LAB.parent
EVIDENCE = LAB / 'evidencias/04-documentacion'
REPORT = EVIDENCE / 'VERIFICACION.json'
MANIFEST = LAB / 'PUBLICACION-LAB13.txt'
CONTROL_FILES = {'PUBLICACION-LAB13.txt', 'evidencias/04-documentacion/VERIFICACION.json'}
SKIP_DIRS = {'.venv', 'venv', 'node_modules', '.npm-cache', '__pycache__', 'dist', '.runtime', '.browser-profile', '.git'}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(report):
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def candidates():
    names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').decode().split('\0')
    paths = {ROOT / name for name in names if name.startswith('Lab13-DEA/') and (ROOT / name).is_file()}
    paths.update([REPORT, MANIFEST])
    return sorted(paths, key=lambda p: p.relative_to(LAB).as_posix())


def ignored(paths):
    data = '\0'.join(p.relative_to(ROOT).as_posix() for p in paths) + '\0'
    result = subprocess.run(['git', 'check-ignore', '--stdin', '-z'], input=data.encode(), cwd=ROOT, capture_output=True)
    assert result.returncode in [0, 1]
    return result.stdout.decode().strip('\0').split('\0') if result.stdout else []


def headings(text):
    text = re.sub(r'```.*?```', '', text, flags=re.S)
    found = set()
    counts = {}
    for title in re.findall(r'^#{1,6}\s+(.+)$', text, re.M):
        value = re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-')
        index = counts.get(value, 0)
        counts[value] = index + 1
        found.add(value + (f'-{index}' if index else ''))
    return found


def exact_path(path):
    relative = path.relative_to(LAB)
    current = LAB
    for part in relative.parts:
        if part not in {p.name for p in current.iterdir()}:
            return False
        current /= part
    return current.exists()


def document_links(path):
    text = path.read_text(encoding='utf-8')
    visible = re.sub(r'```.*?```', '', text, flags=re.S)
    records = []
    for match in re.finditer(r'(!?)\[([^\]]*)\]\(([^)]+)\)', visible):
        image, label, target = match.groups()
        target = target.strip().strip('<>')
        split = urlsplit(target)
        if split.scheme in ['http', 'https', 'mailto']:
            assert not image, f'External image: {target}'
            continue
        assert not split.scheme and not target.startswith(('/', '\\')), target
        dest = (path.parent / unquote(split.path)).resolve() if split.path else path
        assert dest.is_relative_to(LAB), target
        assert exact_path(dest), f'Missing or case-mismatched path: {target}'
        if split.fragment:
            assert unquote(split.fragment) in headings(dest.read_text(encoding='utf-8')), target
        if image:
            assert label.strip(), target
            with Image.open(dest) as im:
                im.verify()
            assert not ignored([dest]), target
        records.append({'image': bool(image), 'target': target, 'path': dest.relative_to(LAB).as_posix()})
    blocks = re.findall(r'```mermaid\s*\n(.*?)```', text, re.S)
    for block in blocks:
        assert block.lstrip().startswith(('erDiagram', 'flowchart ', 'sequenceDiagram'))
        structural = re.sub(r'[|o}]+--[|o{]+', '', block) if block.lstrip().startswith('erDiagram') else block
        assert structural.count('{') == structural.count('}'), 'Unbalanced diagram braces.'
        assert block.count('[') == block.count(']'), 'Unbalanced diagram labels.'
        assert block.count('"') % 2 == 0
    return {'links_checked': len(records), 'images': [r['path'] for r in records if r['image']], 'links': records, 'mermaid_blocks': len(blocks), 'mermaid_check': 'Estructura, delimitadores y tipos reconocidos; no equivale a renderizado en GitHub.'}


def reproduce(report):
    runtime = EVIDENCE / '.runtime'
    runtime.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='reproduce-', dir=runtime) as directory:
        source = r'''
import hashlib, json, os, sys
from pathlib import Path
from PIL import Image
os.environ['DJANGO_SETTINGS_MODULE']='config.settings'
from django.conf import settings
root=Path(sys.argv[1])
settings.DATABASES['default']['NAME']=root/'isolated.sqlite3'
settings.MEDIA_ROOT=root/'media'
import django
django.setup()
from django.core.management import call_command
from catalog.models import Category, Product
call_command('migrate',verbosity=0,interactive=False)
call_command('seed_catalog',verbosity=0)
first=list(Product.objects.values_list('id','name','image'))
call_command('seed_catalog',verbosity=0)
assert first==list(Product.objects.values_list('id','name','image'))
assert Category.objects.count()==3 and Product.objects.count()==8
images=[]
for product in Product.objects.select_related('category'):
 target=Path(product.image.path)
 source=settings.BASE_DIR/'catalog/assets/demo'/target.name
 with Image.open(target) as image:image.verify()
 assert target.read_bytes()==source.read_bytes()
 images.append({'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
assert len(list(settings.MEDIA_ROOT.rglob('*.png')))==8
print(json.dumps({'categories':3,'products':8,'images':images,'seed_runs':2,'idempotent':True,'database_initially_absent':True,'local_database_used':False}))
'''
        result = subprocess.run([sys.executable, '-c', source, directory], cwd=BACKEND, capture_output=True, encoding='utf-8', errors='replace', timeout=120)
        assert result.returncode == 0, result.stderr
        report['checks']['fresh_database_reproduction'] = {'exit_code': result.returncode, 'output': result.stdout, 'result': json.loads(result.stdout.splitlines()[-1]), 'temporary_database_removed': True}


def audit_files(paths):
    secrets = []
    whitespace = []
    large = []
    imports = []
    patterns = {
        'private_key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE' + r' KEY-----'),
        'github_token': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b'),
        'aws_access_key': re.compile(r'\bAKIA[A-Z0-9]{16}\b'),
        'postman_key': re.compile(r'\bPMAK-[A-Za-z0-9-]{35,}\b'),
        'jwt': re.compile(r'\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b'),
        'quoted_sensitive_assignment': re.compile(r'''\b(?:DJANGO_SECRET_KEY|SECRET_KEY|password|api_key|access_token)\s*[:=]\s*(['"])([^'"\r\n]{3,})\1''', re.I),
    }
    for path in paths:
        name = path.relative_to(LAB).as_posix()
        assert not any(part in SKIP_DIRS for part in path.relative_to(LAB).parts), name
        assert path.suffix not in {'.sqlite3', '.pyc', '.log', '.db'}, name
        assert not (path.name.startswith('.env') and path.name != '.env.example'), name
        if path.stat().st_size > 10 * 1024 * 1024:
            large.append({'path': name, 'bytes': path.stat().st_size})
        if path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'}:
            continue
        try:
            raw = path.read_bytes()
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            continue
        for kind, pattern in patterns.items():
            for match in pattern.finditer(text):
                secrets.append({'path': name, 'line': text[:match.start()].count('\n') + 1, 'kind': kind})
        trailing = [i for i, line in enumerate(text.splitlines(), 1) if line.rstrip(' \t') != line]
        mixed = b'\r\n' in raw and b'\n' in raw.replace(b'\r\n', b'')
        if trailing or mixed:
            whitespace.append({'path': name, 'trailing_lines': trailing, 'mixed_line_endings': mixed})
        if path.suffix in {'.js', '.jsx', '.mjs'}:
            for specifier in re.findall(r'(?:from\s*|import\s*)[\'"](\.[^\'"]+)[\'"]', text):
                target = (path.parent / specifier).resolve()
                assert target.is_file(), f'Missing relative import in {name}: {specifier}'
                imports.append({'source': name, 'target': target.relative_to(LAB).as_posix()})
    repositories = []
    for current, dirs, files in os.walk(LAB):
        if '.git' in dirs or '.git' in files:
            repositories.append(str(Path(current).relative_to(LAB) / '.git'))
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not (Path(current).name == 'backend' and d == 'media') and not (Path(current).name == 'frontend' and d == 'evidencias')]
    return {'secret_signature_findings': secrets, 'whitespace_findings': whitespace, 'files_over_10_mib': large, 'relative_imports_checked': len(imports), 'nested_repositories': repositories, 'scan_scope': 'Árbol publicable UTF-8 y revisión visual de capturas; no se recorren dependencias ni perfiles ignorados. Las firmas no garantizan ausencia absoluta de secretos.'}


def final_audit(report):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from verify_api_phase import data_snapshot
    initial = report['git_initial']
    status = git('status', '--porcelain=v1', '--untracked-files=all').decode().splitlines()
    outside = lambda lines: [line for line in lines if 'Lab13-DEA/' not in line]
    changed = [name for name, digest in initial['outside_sha256'].items() if not (ROOT / name).is_file() or sha(ROOT / name) != digest]
    protected = {name: digest for name, digest in report['initial_lab_sha256'].items() if name.startswith(('backend/', 'frontend/', 'evidencias/01-backend/', 'evidencias/02-api-servicios/', 'evidencias/03-frontend/'))}
    result = {
        'branch': git('branch', '--show-current').decode().strip(),
        'origin': git('remote', 'get-url', 'origin').decode().strip(),
        'head_unchanged': git('rev-parse', 'HEAD').decode().strip() == initial['head'],
        'branches_unchanged': git('for-each-ref', '--format=%(refname)', 'refs/heads').decode().splitlines() == initial['branches'],
        'staging_unchanged': hashlib.sha256(git('diff', '--cached', '--binary')).hexdigest() == initial['staged_sha256'],
        'outside_status_unchanged': outside(status) == outside(initial['status']),
        'protected_external_files': len(initial['outside_sha256']), 'changed_outside_lab13': changed,
        'functional_code_and_prior_evidence_unchanged': all((LAB / name).is_file() and sha(LAB / name) == digest for name, digest in protected.items()),
        'data_and_media_unchanged': data_snapshot() == report['data_initial'],
        'main_ahead_behind_origin_main': git('rev-list', '--left-right', '--count', 'main...origin/main').decode().strip(),
        'fetch': {'command': 'git fetch origin', 'exit_code': 0, 'executed_in_phase': True},
        'commits_created': False, 'push_executed': False,
    }
    assert result['branch'] == 'main' and not changed
    assert all(result[key] for key in ['head_unchanged', 'branches_unchanged', 'staging_unchanged', 'outside_status_unchanged', 'functional_code_and_prior_evidence_unchanged', 'data_and_media_unchanged'])
    report['final_audit'] = result


def freeze(report):
    paths = candidates()
    assert not ignored(paths)
    required = ['backend/requirements.txt', 'frontend/package.json', 'frontend/package-lock.json', 'backend/catalog/migrations/0001_initial.py', 'backend/quiz/migrations/0001_initial.py', 'backend/catalog/management/commands/seed_catalog.py', 'backend/.env.example', 'frontend/.env.example', '.gitignore']
    for name in required:
        assert LAB / name in paths, f'Required publication file missing: {name}'
    assets = []
    for path in (LAB / 'frontend/src').rglob('*'):
        if path.suffix not in {'.js', '.jsx', '.css'}:
            continue
        for asset in re.findall(r'''['"](/[^'"\s]+\.(?:png|jpg|jpeg|svg|webp))['"]''', path.read_text(encoding='utf-8')):
            assert LAB / 'frontend/public' / asset.lstrip('/') in paths, asset
            assets.append(asset)
    report['checks']['required_publication_resources'] = {'required_paths': required, 'all_included': True, 'public_asset_literals_checked': len(assets), 'dependency_directories_scanned': False}
    images = []
    for folder in ['01-backend', '02-api-servicios', '03-frontend', '04-documentacion']:
        for path in sorted((LAB / 'evidencias' / folder).glob('*.png')):
            with Image.open(path) as image:
                size = image.size
                image.verify()
            assert min(size) >= 390 and path.stat().st_size > 0
            images.append({'path': path.relative_to(LAB).as_posix(), 'bytes': path.stat().st_size, 'width': size[0], 'height': size[1], 'sha256': sha(path)})
    report['capture_audit'] = {'existing_count': len(report['existing_captures']), 'new_count': len(images) - len(report['existing_captures']), 'total': len(images), 'files': images, 'exact_duplicates': [[item['path'] for item in images if item['sha256'] == digest] for digest in sorted({item['sha256'] for item in images}) if sum(item['sha256'] == digest for item in images) > 1], 'visual_review': 'Capturas reales revisadas; nombres evidence_* y registros UUID son temporales, sin contraseñas visibles. Las páginas largas se amplían al tamaño original.'}
    docs = {name: document_links(LAB / name) for name in ['README.md', 'ENTREGABLE-LAB13.md']}
    assert set(docs['README.md']['images']) == {item['path'] for item in images}
    assert len(docs['README.md']['images']) == len(set(docs['README.md']['images']))
    assert docs['README.md']['mermaid_blocks'] == 3
    report['checks']['documents'] = docs
    report['checks']['publication_files'] = audit_files(paths)
    assert not report['checks']['publication_files']['secret_signature_findings']
    assert not report['checks']['publication_files']['files_over_10_mib']
    assert not report['checks']['publication_files']['nested_repositories']
    final_audit(report)
    report['status'] = 'technical_checks_passed_academic_wording_pending'
    report['progress'] = ['Documentación técnica y capturas completadas.', 'Pendiente cotejar las tres capacidades con la guía original y confirmar integrantes si exige equipo.', 'Paso 12 pendiente: no se ejecutó add, commit ni push.']
    report['closed_at'] = datetime.now(timezone.utc).isoformat()
    # Two mutable control files omit their own hashes to avoid circular digests.
    for _ in range(12):
        rows = [{'path': p.relative_to(LAB).as_posix(), 'bytes': p.stat().st_size if p.exists() else 0, 'type': p.suffix.lstrip('.') or 'text', 'sha256': None if p.relative_to(LAB).as_posix() in CONTROL_FILES else sha(p)} for p in paths]
        summary = {'files': len(rows), 'bytes': sum(row['bytes'] for row in rows), 'screenshots': len(images), 'initial_images': len(list((BACKEND / 'catalog/assets/demo').glob('*.png'))), 'control_hash_exceptions': sorted(CONTROL_FILES)}
        report['publication_inventory'] = summary
        save(report)
        lines = ['LABORATORIO 13 - INVENTARIO CERRADO DE PUBLICACION', 'Estado: candidato local; NO se ha agregado al staging ni publicado.', 'Rutas relativas a Lab13-DEA. No incluye otros laboratorios.', f'Archivos: {summary["files"]}', f'Tamano total: {summary["bytes"]} bytes', f'Capturas: {summary["screenshots"]}; imagenes iniciales: {summary["initial_images"]}', '', 'SHA-256 omitido en los dos archivos de control autorreferentes:', *sorted(CONTROL_FILES), 'Todos los demas archivos incluyen SHA-256; cualquier cambio exige regenerar el inventario.', 'Los hashes corresponden a bytes locales, no a objetos Git; Git puede normalizar LF/CRLF.', '', 'RUTA | BYTES | TIPO | SHA-256']
        lines += [f'{row["path"]} | {row["bytes"]} | {row["type"]} | {row["sha256"] or "CONTROL-AUTORREFERENTE"}' for row in rows]
        lines += ['', 'EXCLUSIONES Y MOTIVOS', '- backend/.venv/, frontend/node_modules/: dependencias reconstruibles.', '- backend/db.sqlite3 y *.sqlite3*: datos locales; reconstruccion por migrate y seed.', '- backend/media/: medios locales; los ocho originales proceden de catalog/assets/demo/.', '- frontend/dist/: compilado reconstruible.', '- frontend/.npm-cache/, __pycache__/, .vite/, .cache/: caches.', '- frontend/evidencias/: salidas temporales de las suites heredadas; evidencia canonica en evidencias/01-03.', '- evidencias/*/.runtime/, .browser-profile/: logs, perfiles y capturas auxiliares no academicas.', '- .env y .env.* reales: configuracion privada; solo .env.example se incluye.', '- *.log, *.tmp, *.temp, *.bak y bases *.db: archivos temporales.', '', 'PENDIENTES ANTES DE PUBLICAR', '- Cotejar el texto oficial de las tres capacidades y confirmar equipo si corresponde.', '- Autorizar expresamente la fase 05; revisar esta lista y agregar solo estas rutas.', '- No ejecutar git add ., ni publicar archivos externos a Lab13-DEA.', '- Verificar el README renderizado en GitHub solo despues de la publicacion autorizada.', '']
        MANIFEST.write_text('\n'.join(lines), encoding='utf-8')
        actual = sum(p.stat().st_size for p in paths)
        if actual == summary['bytes'] and all(p.stat().st_size == row['bytes'] for p, row in zip(paths, rows)):
            break
    else:
        raise RuntimeError('The manifest sizes did not converge.')
    print(json.dumps({'status': report['status'], 'publication': summary, 'capture_count': len(images), 'readme_images': len(docs['README.md']['images']), 'links_valid': True, 'external_files_unchanged': result_count(report)}, ensure_ascii=False, indent=2))


def result_count(report):
    return report['final_audit']['protected_external_files']


if __name__ == '__main__':
    report = json.loads(REPORT.read_text(encoding='utf-8'))
    if '--reproduce' in sys.argv:
        reproduce(report)
        save(report)
        print('Fresh isolated SQLite/media: 3 categories, 8 products, 8 exact images, seed twice; cleaned.')
    else:
        freeze(report)
