from django.db import transaction
from rest_framework import serializers, viewsets

from .models import Exam, Option, Question
from .serializers import (
    ExamSerializer,
    OptionSerializer,
    QuestionSerializer,
    require_one_correct,
)


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related('exam').prefetch_related(
        'options'
    )
    serializer_class = QuestionSerializer
    search_fields = ['text']

    def get_queryset(self):
        queryset = super().get_queryset()
        exam = self.request.query_params.get('exam')
        if exam is not None:
            try:
                exam_id = serializers.IntegerField(min_value=1).run_validation(
                    exam
                )
            except serializers.ValidationError as error:
                raise serializers.ValidationError({'exam': error.detail})
            queryset = queryset.filter(exam_id=exam_id)
        return queryset


class OptionViewSet(viewsets.ModelViewSet):
    queryset = Option.objects.select_related('question')
    serializer_class = OptionSerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        question = Question.objects.select_for_update().get(
            pk=instance.question_id
        )
        remaining_correct = question.options.filter(
            is_correct=True
        ).exclude(pk=instance.pk).count()
        require_one_correct(remaining_correct, 'is_correct')
        instance.delete()
