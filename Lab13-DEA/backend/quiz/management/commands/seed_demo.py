"""Create repeatable demonstration data without deleting existing records."""

from django.core.management.base import BaseCommand
from django.db import transaction

from quiz.models import Exam, Question
from quiz.serializers import QuestionSerializer


class Command(BaseCommand):
    help = (
        'Create two demo exams with twelve valid questions, without deletion.'
    )

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        for title, count in [('Demo - Django', 8), ('Demo - REST', 4)]:
            exam, _ = Exam.objects.get_or_create(
                title=title,
                defaults={'description': 'Datos locales del Laboratorio 08.'},
            )
            for index in range(1, count + 1):
                text = f'{title}: pregunta de práctica {index}'
                if Question.objects.filter(exam=exam, text=text).exists():
                    continue
                serializer = QuestionSerializer(data={
                    'exam': exam.pk,
                    'text': text,
                    'options': [
                        {'text': 'Respuesta correcta', 'is_correct': True},
                        {'text': 'Respuesta incorrecta', 'is_correct': False},
                    ],
                })
                serializer.is_valid(raise_exception=True)
                serializer.save()
                created_count += 1
        self.stdout.write(self.style.SUCCESS(
            f'Created {created_count} demo questions. Existing data preserved.'
        ))
