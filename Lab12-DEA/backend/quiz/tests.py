from unittest.mock import patch

from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import Exam, Option, Question
from .serializers import (
    ExamSerializer,
    OptionSerializer,
    QuestionSerializer,
)


def question_payload(exam_id, text='What is Django?'):
    return {
        'exam': exam_id,
        'text': text,
        'options': [
            {'text': 'A Python framework', 'is_correct': True},
            {'text': 'A database', 'is_correct': False},
        ],
    }


def create_question(exam, text='What is Django?'):
    serializer = QuestionSerializer(data=question_payload(exam.pk, text))
    serializer.is_valid(raise_exception=True)
    return serializer.save()


class ModelTests(TestCase):
    def setUp(self):
        self.exam = Exam.objects.create(title='Backend')
        self.question = create_question(self.exam)

    def test_model_fields_and_strings(self):
        self.assertIsNotNone(self.exam.created_at)
        self.assertEqual(str(self.exam), 'Backend')
        self.assertEqual(str(self.question), 'What is Django?')
        self.assertEqual(
            str(self.question.options.first()), 'A Python framework'
        )

    def test_related_names(self):
        self.assertEqual(self.exam.questions.get(), self.question)
        self.assertEqual(self.question.options.count(), 2)
        self.assertEqual(self.question.options.first().question, self.question)

    def test_option_defaults_to_incorrect(self):
        option = Option.objects.create(question=self.question, text='Other')
        self.assertFalse(option.is_correct)

    def test_database_rejects_multiple_correct_options(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Option.objects.create(
                question=self.question, text='Duplicate', is_correct=True
            )

    def test_question_cascade(self):
        self.question.delete()
        self.assertFalse(Option.objects.exists())
        self.assertTrue(Exam.objects.exists())

    def test_exam_cascade(self):
        self.exam.delete()
        self.assertFalse(Question.objects.exists())
        self.assertFalse(Option.objects.exists())


class SerializerTests(TestCase):
    def setUp(self):
        self.exam = Exam.objects.create(title='Backend')

    def test_exam_read_only_fields(self):
        serializer = ExamSerializer(data={
            'id': 9000, 'title': 'New', 'created_at': '2000-01-01T00:00:00Z',
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        exam = serializer.save()
        self.assertNotEqual(exam.pk, 9000)
        self.assertNotEqual(exam.created_at.year, 2000)

    def test_nested_creation_and_representation(self):
        question = create_question(self.exam)
        data = QuestionSerializer(question).data
        self.assertEqual(data['exam'], self.exam.pk)
        self.assertEqual(len(data['options']), 2)
        self.assertEqual(
            set(data['options'][0]), {'id', 'text', 'is_correct'}
        )

    def test_nested_creation_requires_options(self):
        serializer = QuestionSerializer(data={
            'exam': self.exam.pk, 'text': 'Missing options',
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('options', serializer.errors)

    def test_nested_creation_rejects_invalid_correct_counts(self):
        for flags in [[], [False], [False, False], [True, True]]:
            with self.subTest(flags=flags):
                payload = question_payload(self.exam.pk)
                payload['options'] = [
                    {'text': f'Option {index}', 'is_correct': flag}
                    for index, flag in enumerate(flags)
                ]
                serializer = QuestionSerializer(data=payload)
                self.assertFalse(serializer.is_valid())
                self.assertIn('options', serializer.errors)
        self.assertFalse(Question.objects.exists())

    def test_partial_update_without_options_preserves_them(self):
        question = create_question(self.exam)
        ids = list(question.options.values_list('pk', flat=True))
        serializer = QuestionSerializer(
            question, data={'text': 'Updated'}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.assertEqual(
            list(question.options.values_list('pk', flat=True)), ids
        )

    def test_nested_update_replaces_options(self):
        question = create_question(self.exam)
        old_ids = set(question.options.values_list('pk', flat=True))
        serializer = QuestionSerializer(question, data={
            'options': [
                {'text': 'New wrong', 'is_correct': False},
                {'text': 'New correct', 'is_correct': True},
            ],
        }, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.assertEqual(question.options.filter(is_correct=True).count(), 1)
        self.assertFalse(
            old_ids & set(question.options.values_list('pk', flat=True))
        )

    def test_nested_patch_requires_text_in_replacement(self):
        question = create_question(self.exam)
        serializer = QuestionSerializer(
            question, data={'options': [{'is_correct': True}]}, partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('options', serializer.errors)

    def test_nested_creation_rolls_back_on_failure(self):
        serializer = QuestionSerializer(data=question_payload(self.exam.pk))
        serializer.is_valid(raise_exception=True)
        with patch(
            'quiz.serializers.Option.objects.bulk_create',
            side_effect=RuntimeError('Simulated database failure'),
        ):
            with self.assertRaises(RuntimeError):
                serializer.save()
        self.assertFalse(Question.objects.exists())

    def test_nested_update_rolls_back_on_failure(self):
        question = create_question(self.exam)
        old_ids = list(question.options.values_list('pk', flat=True))
        serializer = QuestionSerializer(
            question, data=question_payload(self.exam.pk, 'Changed'),
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        with patch(
            'quiz.serializers.Option.objects.bulk_create',
            side_effect=RuntimeError('Simulated database failure'),
        ):
            with self.assertRaises(RuntimeError):
                serializer.save()
        question.refresh_from_db()
        self.assertEqual(question.text, 'What is Django?')
        self.assertEqual(
            list(question.options.values_list('pk', flat=True)), old_ids
        )

    def test_direct_option_serializer_rejects_second_correct(self):
        question = create_question(self.exam)
        serializer = OptionSerializer(data={
            'question': question.pk, 'text': 'Other', 'is_correct': True,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_correct', serializer.errors)


class APIResourceTests(APITestCase):
    def setUp(self):
        self.exam = Exam.objects.create(title='Backend', description='Python')
        self.question = create_question(self.exam)
        self.correct = self.question.options.get(is_correct=True)
        self.incorrect = self.question.options.get(is_correct=False)

    def assert_invariant(self):
        for question in Question.objects.all():
            self.assertEqual(
                question.options.filter(is_correct=True).count(), 1
            )

    def test_router_root(self):
        response = self.client.get('/api/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.data), {'exams', 'questions', 'options'}
        )

    def test_browsable_api_for_all_resources(self):
        paths = ['/api/', '/api/exams/', '/api/questions/', '/api/options/']
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path, HTTP_ACCEPT='text/html')
                self.assertEqual(response.status_code, 200)
                self.assertIn('text/html', response['Content-Type'])
                self.assertContains(response, 'Django REST framework')

    def test_lists_for_all_resources(self):
        for resource in ['exams', 'questions', 'options']:
            with self.subTest(resource=resource):
                response = self.client.get(f'/api/{resource}/')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    set(response.data),
                    {'count', 'next', 'previous', 'results'},
                )

    def test_details_for_all_resources(self):
        for resource, instance in [
            ('exams', self.exam), ('questions', self.question),
            ('options', self.correct),
        ]:
            with self.subTest(resource=resource):
                response = self.client.get(f'/api/{resource}/{instance.pk}/')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data['id'], instance.pk)

    def test_create_exam(self):
        response = self.client.post('/api/exams/', {'title': 'New'}, 'json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['description'], '')

    def test_create_question(self):
        response = self.client.post(
            '/api/questions/', question_payload(self.exam.pk), 'json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data['options']), 2)
        self.assert_invariant()

    def test_create_incorrect_option(self):
        response = self.client.post('/api/options/', {
            'question': self.question.pk, 'text': 'Other',
        }, 'json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data['is_correct'])
        self.assert_invariant()

    def test_patch_all_resources(self):
        for resource, instance, payload in [
            ('exams', self.exam, {'title': 'Updated exam'}),
            ('questions', self.question, {'text': 'Updated question'}),
            ('options', self.incorrect, {'text': 'Updated option'}),
        ]:
            with self.subTest(resource=resource):
                response = self.client.patch(
                    f'/api/{resource}/{instance.pk}/', payload, 'json'
                )
                self.assertEqual(response.status_code, 200)
                for key, value in payload.items():
                    self.assertEqual(response.data[key], value)
        self.assert_invariant()

    def test_put_all_resources(self):
        for resource, instance, payload in [
            ('exams', self.exam, {'title': 'Replaced exam'}),
            ('questions', self.question, question_payload(self.exam.pk)),
            ('options', self.incorrect, {
                'question': self.question.pk, 'text': 'Replaced option',
                'is_correct': False,
            }),
        ]:
            if resource == 'options':
                instance = self.question.options.get(is_correct=False)
            with self.subTest(resource=resource):
                response = self.client.put(
                    f'/api/{resource}/{instance.pk}/', payload, 'json'
                )
                self.assertEqual(response.status_code, 200)
        self.assert_invariant()

    def test_delete_incorrect_option(self):
        response = self.client.delete(f'/api/options/{self.incorrect.pk}/')
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b'')
        self.assert_invariant()

    def test_delete_question(self):
        response = self.client.delete(f'/api/questions/{self.question.pk}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Option.objects.exists())

    def test_delete_exam(self):
        response = self.client.delete(f'/api/exams/{self.exam.pk}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Question.objects.exists())
        self.assertFalse(Option.objects.exists())

    def test_missing_required_fields(self):
        for resource, field in [
            ('exams', 'title'), ('questions', 'exam'), ('options', 'question')
        ]:
            with self.subTest(resource=resource):
                response = self.client.post(f'/api/{resource}/', {}, 'json')
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_wrong_foreign_key_type(self):
        payload = question_payload('not-an-integer')
        response = self.client.post('/api/questions/', payload, 'json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('exam', response.data)

    def test_wrong_boolean_type(self):
        response = self.client.patch(
            f'/api/options/{self.correct.pk}/',
            {'is_correct': {'invalid': True}}, 'json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('is_correct', response.data)

    def test_nonexistent_foreign_keys(self):
        response = self.client.post(
            '/api/questions/', question_payload(999999), 'json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('exam', response.data)

    def test_question_creation_rejects_zero_or_two_correct(self):
        for flags in [[False, False], [True, True]]:
            payload = question_payload(self.exam.pk)
            for option, flag in zip(payload['options'], flags):
                option['is_correct'] = flag
            response = self.client.post('/api/questions/', payload, 'json')
            self.assertEqual(response.status_code, 400)
            self.assertIn('options', response.data)
        self.assertEqual(Question.objects.count(), 1)
        self.assert_invariant()

    def test_question_patch_rejects_zero_two_or_empty_options(self):
        before = QuestionSerializer(self.question).data
        for flags in [[], [False, False], [True, True]]:
            response = self.client.patch(
                f'/api/questions/{self.question.pk}/', {'options': [
                    {'text': f'Option {index}', 'is_correct': flag}
                    for index, flag in enumerate(flags)
                ]}, 'json',
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(QuestionSerializer(self.question).data, before)
        self.assert_invariant()

    def test_atomic_correct_answer_switch(self):
        response = self.client.patch(
            f'/api/questions/{self.question.pk}/', {'options': [
                {'text': 'Old answer', 'is_correct': False},
                {'text': 'New answer', 'is_correct': True},
            ]}, 'json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.question.options.get(is_correct=True).text, 'New answer'
        )
        self.assert_invariant()

    def test_direct_creation_rejects_second_correct(self):
        response = self.client.post('/api/options/', {
            'question': self.question.pk, 'text': 'Duplicate',
            'is_correct': True,
        }, 'json')
        self.assertEqual(response.status_code, 400)
        self.assert_invariant()

    def test_cannot_unset_only_correct_option(self):
        response = self.client.patch(
            f'/api/options/{self.correct.pk}/', {'is_correct': False}, 'json'
        )
        self.assertEqual(response.status_code, 400)
        self.assert_invariant()

    def test_cannot_set_second_correct_option(self):
        response = self.client.patch(
            f'/api/options/{self.incorrect.pk}/', {'is_correct': True}, 'json'
        )
        self.assertEqual(response.status_code, 400)
        self.assert_invariant()

    def test_cannot_delete_only_correct_option(self):
        response = self.client.delete(f'/api/options/{self.correct.pk}/')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['is_correct'], [
            'A question must have exactly one correct option.'
        ])
        self.assertTrue(Option.objects.filter(pk=self.correct.pk).exists())
        self.assert_invariant()

    def test_cannot_move_an_option(self):
        other = create_question(self.exam, 'Other question')
        for option in [self.correct, self.incorrect]:
            response = self.client.patch(
                f'/api/options/{option.pk}/', {'question': other.pk}, 'json'
            )
            self.assertEqual(response.status_code, 400)
            self.assertIn('question', response.data)
        self.assert_invariant()

    def test_missing_resources_return_404(self):
        for resource in ['exams', 'questions', 'options']:
            for method in ['get', 'patch', 'delete']:
                with self.subTest(resource=resource, method=method):
                    response = getattr(self.client, method)(
                        f'/api/{resource}/999999/'
                    )
                    self.assertEqual(response.status_code, 404)


class APIQueryTests(APITestCase):
    def setUp(self):
        self.exam = Exam.objects.create(title='Backend')
        self.other_exam = Exam.objects.create(title='Databases')
        for index in range(7):
            create_question(self.exam, f'Django question {index}')
        create_question(self.other_exam, 'SQL joins')

    def test_filter_by_exam(self):
        response = self.client.get(f'/api/questions/?exam={self.exam.pk}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 7)
        self.assertTrue(all(
            item['exam'] == self.exam.pk for item in response.data['results']
        ))

    def test_filter_nonexistent_exam_is_empty(self):
        response = self.client.get('/api/questions/?exam=999999')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)

    def test_invalid_exam_filters(self):
        for value in ['invalid', '0', '-1', '1.5', '']:
            response = self.client.get(f'/api/questions/?exam={value}')
            self.assertEqual(response.status_code, 400)
            self.assertIn('exam', response.data)

    def test_search_by_partial_text(self):
        response = self.client.get('/api/questions/?search=JANG')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 7)

    def test_combined_filter_and_search(self):
        response = self.client.get(
            f'/api/questions/?exam={self.other_exam.pk}&search=Django'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)

    def test_pagination_and_navigation_links(self):
        first = self.client.get('/api/questions/')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data['count'], 8)
        self.assertEqual(len(first.data['results']), 5)
        self.assertIsNone(first.data['previous'])
        second = self.client.get(first.data['next'])
        self.assertEqual(second.status_code, 200)
        self.assertEqual(len(second.data['results']), 3)
        self.assertIsNone(second.data['next'])
        self.assertIsNotNone(second.data['previous'])
        self.assertEqual(
            self.client.get(second.data['previous']).data['results'],
            first.data['results'],
        )

    def test_nonexistent_page(self):
        response = self.client.get('/api/questions/?page=999')
        self.assertEqual(response.status_code, 404)
