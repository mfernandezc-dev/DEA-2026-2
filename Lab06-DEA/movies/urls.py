from django.urls import path
from . import views

app_name = 'movies'

urlpatterns = [
    path('recommended/', views.recommended_movies, name='recommended'),
    path('recommended/<int:genre_id>/', views.recommended_movies, name='recommended_by_genre'),
]
