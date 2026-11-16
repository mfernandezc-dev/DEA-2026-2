from django.shortcuts import render
from django.db.models import Avg
from .models import Movie


def recommended_movies(request, genre_id=None):
    queryset = Movie.objects.all()
    if genre_id:
        queryset = queryset.filter(genres__id=genre_id)
    movies = queryset.annotate(avg_score=Avg('ratings__score')).filter(ratings__isnull=False).order_by('-avg_score', 'title')[:10]
    return render(request, 'movies/recommended.html', {'movies': movies})
