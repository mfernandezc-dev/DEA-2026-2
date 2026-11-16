"""Model serializers and atomic writes for the quiz API."""

from django.db import transaction
from rest_framework import serializers

from .models import Exam, Option, Question


def require_one_correct(count, field):
    if count != 1:
        raise serializers.ValidationError({
            field: ['A question must have exactly one correct option.']
        })


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = ['id', 'title', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class NestedOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'is_correct']
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    options = NestedOptionSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'exam', 'text', 'options']
        read_only_fields = ['id']

    def validate_options(self, options):
        # PATCH skips nested required fields, but this is a full replacement.
        if any('text' not in option for option in options):
            raise serializers.ValidationError(
                'Every replacement option must include text.'
            )
        count = sum(option.get('is_correct', False) for option in options)
        if count != 1:
            raise serializers.ValidationError(
                'A question must have exactly one correct option.'
            )
        return options

    @transaction.atomic
    def create(self, validated_data):
        options = validated_data.pop('options')
        question = Question.objects.create(**validated_data)
        Option.objects.bulk_create([
            Option(question=question, **option) for option in options
        ])
        return question

    @transaction.atomic
    def update(self, instance, validated_data):
        question = Question.objects.select_for_update().get(pk=instance.pk)
        options = validated_data.pop('options', None)
        question = super().update(question, validated_data)
        if options is not None:
            question.options.all().delete()
            Option.objects.bulk_create([
                Option(question=question, **option) for option in options
            ])
        return question


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'question', 'text', 'is_correct']
        read_only_fields = ['id']

    def validate(self, attrs):
        instance = self.instance
        question = attrs.get(
            'question', instance.question if instance else None
        )
        if instance and question.pk != instance.question_id:
            raise serializers.ValidationError({
                'question': 'An existing option cannot change its question.'
            })
        correct_options = question.options.filter(is_correct=True)
        if instance:
            correct_options = correct_options.exclude(pk=instance.pk)
        is_correct = attrs.get(
            'is_correct', instance.is_correct if instance else False
        )
        require_one_correct(
            correct_options.count() + int(is_correct), 'is_correct'
        )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        Question.objects.select_for_update().get(
            pk=validated_data['question'].pk
        )
        self.validate(validated_data)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        Question.objects.select_for_update().get(pk=instance.question_id)
        instance.refresh_from_db()
        self.validate(validated_data)
        return super().update(instance, validated_data)
