"""Run repeatable local checks and keep their actual console output."""

from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'docs' / 'evidence' / 'local-checks.txt'


def main():
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    environment['PYTHONIOENCODING'] = 'utf-8'
    commands = [
        [sys.executable, '--version'],
        [sys.executable, '-m', 'pip', '--version'],
        [sys.executable, '-m', 'pip', 'check'],
        [sys.executable, '-m', 'pip', 'freeze'],
        [sys.executable, 'manage.py', 'check'],
        [sys.executable, 'manage.py', 'makemigrations',
         '--check', '--dry-run'],
        [sys.executable, 'manage.py', 'showmigrations'],
        [sys.executable, 'manage.py', 'test', '--verbosity', '2'],
        [sys.executable, 'manage.py', 'shell', '-c', (
            'from django.db.models import Count, Q; '
            'from quiz.models import Exam, Question, Option; '
            'invalid = Question.objects.annotate(correct=Count('
            '"options", filter=Q(options__is_correct=True)'
            ')).exclude(correct=1).count(); '
            'print({"exams": Exam.objects.count(), '
            '"questions": Question.objects.count(), '
            '"options": Option.objects.count(), '
            '"invalid_questions": invalid}); '
            'assert invalid == 0'
        )],
    ]
    failed = False
    with REPORT.open('w', encoding='utf-8') as report:
        report.write(f'UTC: {datetime.now(timezone.utc).isoformat()}\n')
        for command in commands:
            result = subprocess.run(
                command, cwd=ROOT, env=environment,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding='utf-8', errors='replace', check=False,
            )
            display = 'python ' + ' '.join(command[1:])
            report.write(f'\n$ {display}\n{result.stdout}')
            report.write(f'Exit code: {result.returncode}\n')
            print(f'{display}: exit {result.returncode}')
            failed |= result.returncode != 0
        style_issues = []
        for path in ROOT.rglob('*.py'):
            if '.venv' in path.parts:
                continue
            for number, line in enumerate(
                path.read_text(encoding='utf-8').splitlines(), 1
            ):
                if len(line) > 79 or line.rstrip() != line:
                    style_issues.append(
                        f'{path.relative_to(ROOT)}:{number}'
                    )
        report.write('\nBasic Python line-length/whitespace review:\n')
        report.write('\n'.join(style_issues) if style_issues else 'PASS\n')
        failed |= bool(style_issues)
    print(f'Evidence: {REPORT.relative_to(ROOT)}')
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
