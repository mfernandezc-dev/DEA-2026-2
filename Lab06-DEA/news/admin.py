from django.contrib import admin
from .models import Article, Category, Author


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    search_fields = ('name', 'slug')
    list_filter = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)
    list_filter = ('name',)


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'published_at')
    search_fields = ('title', 'content', 'author__name')
    list_filter = ('author', 'categories', 'published_at')
    filter_horizontal = ('categories',)
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('published_at',)
