"""Verify a real localhost server using only the Python standard library."""

import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / 'docs' / 'evidence'


class ResponseHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_pre = False
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag == 'pre':
            self.in_pre = True
            self.blocks.append('')

    def handle_endtag(self, tag):
        if tag == 'pre':
            self.in_pre = False

    def handle_data(self, data):
        if self.in_pre:
            self.blocks[-1] += data

    def response_json(self):
        for block in self.blocks:
            if block.startswith('HTTP '):
                start = block.find('{')
                if start >= 0:
                    return json.loads(block[start:])
        return None


def payload(exam_id, text='HTTP - What is Django?'):
    return {
        'exam': exam_id,
        'text': text,
        'options': [
            {'text': 'A Python framework', 'is_correct': True},
            {'text': 'A database', 'is_correct': False},
        ],
    }


class HTTPVerifier:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.records = []

    def request(self, name, method, path, expected, body=None,
                check=None, expectation='', html=False):
        url = path if path.startswith('http://') else self.base_url + path
        target = urlparse(url)
        origin = urlparse(self.base_url)
        if (target.scheme, target.hostname, target.port) != (
            origin.scheme, origin.hostname, origin.port
        ):
            raise ValueError('Pagination must stay on the same local server.')
        headers = {'Accept': 'text/html' if html else 'application/json'}
        data = None
        if body is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body).encode('utf-8')
        request = Request(url, data=data, headers=headers, method=method)
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            status = response.status
            content_type = response.headers.get('Content-Type', '')
            text = response.read().decode('utf-8')
        result = text if html else json.loads(text) if text else None
        matched = status == expected
        if html:
            matched &= 'text/html' in content_type
            matched &= 'Django REST framework' in text
            artifact = f'browsable-{name}.html'
            (EVIDENCE / artifact).write_text(text, encoding='utf-8')
            parser = ResponseHTMLParser()
            parser.feed(text)
            result = parser.response_json()
            recorded_result = {
                'html_file': artifact, 'displayed_json': result,
            }
        else:
            recorded_result = result
        if matched and check is not None:
            matched = bool(check(result))
        self.records.append({
            'case': name,
            'endpoint': url,
            'method': method,
            'request_json': body,
            'accept': headers['Accept'],
            'expected_status': expected,
            'actual_status': status,
            'content_type': content_type,
            'response_json': recorded_result,
            'expected_result': expectation or f'HTTP {expected}',
            'actual_result': 'PASS' if matched else 'FAIL',
        })
        print(f'{"PASS" if matched else "FAIL"} {method} {url}: {status}')
        if not matched:
            raise AssertionError(f'{name}: unexpected response: {result}')
        return result

    def run(self):
        # The browsable renderer is checked before the external JSON workflow.
        for resource in ['', 'exams/', 'questions/', 'options/']:
            self.request(
                resource.strip('/') or 'root', 'GET', f'/api/{resource}',
                200, html=True,
                expectation='HTML navegable DRF, HTTP 200.',
            )
        self.exercise_browsable()

        exam = self.request(
            'create-exam', 'POST', '/api/exams/', 201,
            {'title': 'HTTP verification',
             'description': 'Temporary test data'},
            check=lambda data: data['title'] == 'HTTP verification',
        )
        exam_id = exam['id']
        exam_path = f'/api/exams/{exam_id}/'
        try:
            self.exercise(exam_id, exam_path)
        finally:
            self.request('delete-exam', 'DELETE', exam_path, 204)
        self.request('exam-deleted', 'GET', exam_path, 404)

    def exercise_browsable(self):
        exam = self.request(
            'html-create-exam', 'POST', '/api/exams/', 201,
            {'title': 'Browsable verification'}, html=True,
            check=lambda data: data['title'] == 'Browsable verification',
        )
        exam_path = f"/api/exams/{exam['id']}/"
        try:
            question = self.request(
                'html-create-question', 'POST', '/api/questions/', 201,
                payload(exam['id']), html=True,
            )
            question_path = f"/api/questions/{question['id']}/"
            option = self.request(
                'html-create-option', 'POST', '/api/options/', 201,
                {'question': question['id'], 'text': 'HTML option'},
                html=True,
            )
            option_path = f"/api/options/{option['id']}/"
            for resource, path, body in [
                ('exam', exam_path, {'title': 'HTML updated'}),
                ('question', question_path, {'text': 'HTML updated'}),
                ('option', option_path, {'text': 'HTML updated'}),
            ]:
                self.request(
                    f'html-detail-{resource}', 'GET', path, 200, html=True,
                )
                self.request(
                    f'html-patch-{resource}', 'PATCH', path, 200, body,
                    html=True,
                )
            self.request(
                'html-required-error', 'POST', '/api/exams/', 400, {},
                html=True, check=lambda data: 'title' in data,
            )
            self.request(
                'html-delete-option', 'DELETE', option_path, 200, html=True,
                expectation='DRF devuelve HTML 200 al representar DELETE 204.',
            )
            self.request(
                'html-delete-question', 'DELETE', question_path, 200,
                html=True,
                expectation='DRF devuelve HTML 200 al representar DELETE 204.',
            )
        finally:
            self.request(
                'html-delete-exam', 'DELETE', exam_path, 200, html=True,
                expectation='DRF devuelve HTML 200 al representar DELETE 204.',
            )

    def exercise(self, exam_id, exam_path):
        for resource in ['exams', 'questions', 'options']:
            self.request(
                f'list-{resource}', 'GET', f'/api/{resource}/', 200,
                check=lambda data: all(key in data for key in [
                    'count', 'next', 'previous', 'results',
                ]),
            )
        self.request('detail-exam', 'GET', exam_path, 200)
        self.request(
            'patch-exam', 'PATCH', exam_path, 200, {'title': 'HTTP updated'},
            check=lambda data: data['title'] == 'HTTP updated',
        )
        self.request(
            'put-exam', 'PUT', exam_path, 200, {'title': 'HTTP replaced'},
            check=lambda data: data['title'] == 'HTTP replaced',
        )
        question = self.request(
            'create-question', 'POST', '/api/questions/', 201,
            payload(exam_id),
            check=lambda data: sum(
                option['is_correct'] for option in data['options']
            ) == 1,
        )
        question_id = question['id']
        question_path = f'/api/questions/{question_id}/'
        correct_id = question['options'][0]['id']
        wrong_id = question['options'][1]['id']
        self.request('detail-question', 'GET', question_path, 200)
        self.request(
            'patch-question', 'PATCH', question_path, 200,
            {'text': 'HTTP - Updated question'},
            check=lambda data: data['text'] == 'HTTP - Updated question',
        )
        option = self.request(
            'create-option', 'POST', '/api/options/', 201,
            {'question': question_id, 'text': 'Other', 'is_correct': False},
            check=lambda data: data['is_correct'] is False,
        )
        option_path = f"/api/options/{option['id']}/"
        self.request('detail-option', 'GET', option_path, 200)
        self.request(
            'patch-option', 'PATCH', option_path, 200,
            {'text': 'Other updated'},
            check=lambda data: data['text'] == 'Other updated',
        )
        self.request(
            'put-option', 'PUT', option_path, 200,
            {'question': question_id, 'text': 'Other replaced',
             'is_correct': False},
        )
        self.request('delete-option', 'DELETE', option_path, 204)
        self.request('option-deleted', 'GET', option_path, 404)

        self.request(
            'missing-required-field', 'POST', '/api/exams/', 400,
            {'description': 'Missing title'},
            check=lambda data: 'title' in data,
            expectation='400 con error en title; no se crea examen.',
        )
        self.request(
            'wrong-data-type', 'POST', '/api/questions/', 400,
            payload('not-an-integer'), check=lambda data: 'exam' in data,
            expectation='400 por id de examen de tipo incorrecto.',
        )
        self.request(
            'wrong-boolean-type', 'PATCH', f'/api/options/{correct_id}/', 400,
            {'is_correct': {'invalid': True}},
            check=lambda data: 'is_correct' in data,
            expectation='400 por valor booleano incompatible.',
        )
        for label, flags in [('zero-correct', [False, False]),
                             ('two-correct', [True, True])]:
            invalid = payload(exam_id)
            for item, flag in zip(invalid['options'], flags):
                item['is_correct'] = flag
            self.request(
                f'create-{label}', 'POST', '/api/questions/', 400, invalid,
                check=lambda data: 'options' in data,
                expectation='400; se exige exactamente una opción correcta.',
            )
            self.request(
                f'patch-{label}', 'PATCH', question_path, 400,
                {'options': invalid['options']},
                check=lambda data: 'options' in data,
                expectation='400; la pregunta conserva sus opciones.',
            )
        self.request(
            'direct-create-second-correct', 'POST', '/api/options/', 400,
            {'question': question_id, 'text': 'Duplicate', 'is_correct': True},
            check=lambda data: 'is_correct' in data,
        )
        for label, option_id, value in [
            ('unset-correct', correct_id, False),
            ('set-second-correct', wrong_id, True),
        ]:
            self.request(
                label, 'PATCH', f'/api/options/{option_id}/', 400,
                {'is_correct': value}, check=lambda data: 'is_correct' in data,
            )
        self.request(
            'delete-only-correct', 'DELETE', f'/api/options/{correct_id}/',
            400, check=lambda data: 'is_correct' in data,
        )
        after_errors = self.request(
            'invariant-after-errors', 'GET', question_path, 200,
            check=lambda data: sum(
                item['is_correct'] for item in data['options']
            ) == 1 and len(data['options']) == 2,
        )
        assert after_errors['options'] == question['options']
        self.request(
            'switch-correct-atomically', 'PATCH', question_path, 200,
            {'options': [
                {'text': 'Old answer', 'is_correct': False},
                {'text': 'New answer', 'is_correct': True},
            ]},
            check=lambda data: sum(
                item['is_correct'] for item in data['options']
            ) == 1 and data['options'][1]['is_correct'] is True,
        )
        replaced = self.request(
            'put-question', 'PUT', question_path, 200, payload(exam_id),
        )
        current_correct_id = replaced['options'][0]['id']
        for index in range(6):
            self.request(
                f'pagination-data-{index + 1}', 'POST', '/api/questions/', 201,
                payload(exam_id, f'HTTP - Pagination example {index + 1}'),
            )
        filtered_path = f'/api/questions/?exam={exam_id}'
        first = self.request(
            'pagination-first', 'GET', filtered_path, 200,
            check=lambda data: data['count'] == 7
            and len(data['results']) == 5
            and data['previous'] is None and data['next'] is not None,
            expectation='Total 7, primera página 5, enlace next presente.',
        )
        second = self.request(
            'pagination-second', 'GET', first['next'], 200,
            check=lambda data: data['count'] == 7
            and len(data['results']) == 2
            and data['next'] is None and data['previous'] is not None,
            expectation='Total 7, segunda página 2, enlace previous presente.',
        )
        self.request(
            'pagination-back', 'GET', second['previous'], 200,
            check=lambda data: data['results'] == first['results'],
        )
        self.request(
            'search-and-filter', 'GET', filtered_path + '&search=Pagination',
            200, check=lambda data: data['count'] == 6 and all(
                'Pagination' in item['text'] and item['exam'] == exam_id
                for item in data['results']
            ),
            expectation='6 preguntas coincidentes del examen de prueba.',
        )
        self.request(
            'filter-invalid', 'GET', '/api/questions/?exam=abc', 400,
            check=lambda data: 'exam' in data,
        )
        self.request(
            'page-not-found', 'GET', filtered_path + '&page=999', 404,
        )
        self.request('delete-question', 'DELETE', question_path, 204)
        self.request('question-deleted', 'GET', question_path, 404)
        self.request(
            'options-cascade', 'GET',
            f'/api/options/{current_correct_id}/', 404,
        )

    def save(self):
        passed = sum(item['actual_result'] == 'PASS' for item in self.records)
        report = {
            'executed_at_utc': datetime.now(timezone.utc).isoformat(),
            'client': 'Python standard library urllib.request (real HTTP)',
            'base_url': self.base_url,
            'total': len(self.records),
            'passed': passed,
            'failed': len(self.records) - passed,
            'cases': self.records,
        }
        (EVIDENCE / 'http-results.json').write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8',
        )
        lines = [
            '# Evidencia HTTP real', '',
            f"Fecha UTC: {report['executed_at_utc']}", '',
            f'Cliente: {report["client"]}. No se utilizó Postman.', '',
            f'Total: {report["total"]}; PASS: {passed}; '
            f'FAIL: {report["failed"]}.', '',
            'Los HTML comprueban el renderizador; '
            'no son capturas de pantalla.',
            '',
        ]
        for item in self.records:
            lines.extend([
                f'## {item["case"]}', '',
                f'`{item["method"]} {item["endpoint"]}`', '',
                'JSON enviado:', '```json',
                json.dumps(
                    item['request_json'], ensure_ascii=False, indent=2
                ),
                '```', '',
                f'HTTP esperado: **{item["expected_status"]}**; '
                f'obtenido: **{item["actual_status"]}**.', '',
                f'Esperado: {item["expected_result"]}', '',
                'Respuesta JSON (o referencia al HTML):', '```json',
                json.dumps(
                    item['response_json'], ensure_ascii=False, indent=2
                ),
                '```', '', f'Resultado real: **{item["actual_result"]}**.', '',
            ])
        (EVIDENCE / 'HTTP_RESULTS.md').write_text(
            '\n'.join(lines), encoding='utf-8'
        )
        print(f'HTTP evidence: {passed}/{len(self.records)} PASS')


def start_server(base_url):
    target = urlparse(base_url)
    port = target.port or 80
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise RuntimeError('Port busy. Use an available port or no flag.')
    process = subprocess.Popen(
        [sys.executable, 'manage.py', 'runserver',
         f'127.0.0.1:{port}', '--noreload'],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('Server exited before accepting connections.')
        try:
            with urlopen(base_url + '/api/', timeout=1):
                return process
        except (URLError, OSError):
            time.sleep(0.1)
    process.terminate()
    process.wait(timeout=10)
    raise RuntimeError('Server startup timed out.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8000')
    parser.add_argument('--start-server', action='store_true')
    args = parser.parse_args()
    target = urlparse(args.base_url)
    if (target.scheme != 'http'
            or target.hostname not in {'127.0.0.1', 'localhost'}
            or target.path not in {'', '/'}
            or target.username or target.password or target.query
            or target.fragment):
        parser.error(
            'Only a local HTTP origin is allowed, without credentials.'
        )
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    process = start_server(args.base_url) if args.start_server else None
    verifier = HTTPVerifier(args.base_url)
    try:
        verifier.run()
    finally:
        verifier.save()
        if process:
            process.terminate()
            process.wait(timeout=10)


if __name__ == '__main__':
    main()
