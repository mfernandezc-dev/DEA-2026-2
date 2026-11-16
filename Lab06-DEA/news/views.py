from django.shortcuts import render, get_object_or_404
from .models import Article, Category


def index(request):
    articles = Article.objects.select_related('author').prefetch_related('categories').all()
    categories = Category.objects.all()
    return render(request, 'news/index.html', {
        'articles': articles,
        'categories': categories,
    })


def article_detail(request, pk):
    article = get_object_or_404(
        Article.objects.select_related('author').prefetch_related('categories'),
        pk=pk,
    )
    categories = Category.objects.all()
    return render(request, 'news/article_detail.html', {
        'article': article,
        'categories': categories,
    })


def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)
    articles = category.articles.select_related('author').prefetch_related('categories').all()
    categories = Category.objects.all()
    return render(request, 'news/category_detail.html', {
        'category': category,
        'articles': articles,
        'categories': categories,
    })
