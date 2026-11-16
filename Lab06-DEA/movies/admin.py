from django.contrib import admin
from django.utils.html import format_html
from .models import Genre, Person, Movie, Rating


class RatingInline(admin.TabularInline):
    model = Rating
    extra = 0
    fields = ('score', 'comment', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description')
    search_fields = ('name',)
    list_per_page = 25


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'birth_date')
    search_fields = ('name',)
    list_per_page = 25


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'release_year', 'genre_list')
    list_filter = ('genres', 'release_year')
    search_fields = ('title',)
    filter_horizontal = ('genres',)
    inlines = [RatingInline]
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 25

    def genre_list(self, obj):
        return ", ".join([g.name for g in obj.genres.all()[:5]])
    genre_list.short_description = "Genres"


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'movie_link', 'score', 'comment_short', 'created_at')
    search_fields = ('movie__title', 'comment')
    readonly_fields = ('created_at', 'updated_at')
    list_filter = ('score',)
    list_per_page = 25

    def movie_link(self, obj):
        from django.urls import reverse
        url = reverse('admin:movies_movie_change', args=[obj.movie.id])
        return format_html('<a href="{}">{}</a>', url, obj.movie.title)
    movie_link.short_description = "Movie"

    def comment_short(self, obj):
        return obj.comment[:60] + "..." if len(obj.comment) > 60 else obj.comment
    comment_short.short_description = "Comment"
