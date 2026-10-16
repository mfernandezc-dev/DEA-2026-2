"""AI-assisted answers, implemented with OpenCode for the S07 lab.

The original functions were all empty (NotImplementedError). These are not
unaided student attempts. Each function returns a lazy ORM QuerySet.
Check the answers with:

    python manage.py duel                 # all of them
    python manage.py duel --question q4   # just one

Question 5 asks for two numbers per post: annotate them as `n_comments` and
`n_tags`.
"""
from datetime import date

from django.db.models import Count

from blog.models import Author, Comment, Post


def q1():
    """Los artículos que ya están publicados."""
    return Post.objects.filter(published=True)


def q2():
    """Los artículos que no tienen categoría asignada."""
    return Post.objects.filter(category__isnull=True)


def q3():
    """Los artículos publicados entre 1/3 y 31/5 de 2026, inclusive."""
    return Post.objects.filter(
        published_at__range=(date(2026, 3, 1), date(2026, 5, 31))
    )


def q4():
    """Los artículos con más de dos comentarios."""
    return Post.objects.annotate(n_comments=Count("comments")).filter(
        n_comments__gt=2
    )


def q5():
    """Top tres publicados, con `n_comments` y `n_tags`."""
    return (
        Post.objects.filter(published=True)
        .annotate(
            n_comments=Count("comments", distinct=True),
            n_tags=Count("tags", distinct=True),
        )
        .order_by("-n_comments", "pk")[:3]
    )


def q6():
    """Los artículos escritos por autores de Perú (publicados o no)."""
    return Post.objects.filter(author__profile__country="Perú")


def q7():
    """Los comentarios de los artículos de la categoría «Tecnología»."""
    return Comment.objects.filter(post__category__name="Tecnología")


def q8():
    """Los autores que nunca han publicado un artículo."""
    return Author.objects.exclude(posts__published=True)
