"""Read-only SQL, dataset and query-count evidence for the lab."""
import hashlib
import importlib
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from blog import seed_data
from blog.duel.questions import QUESTIONS
from blog.duel.runner import _difference
from blog.models import Author, Category, Comment, Post, Profile, Tag


def dataset():
    counts = {
        model.__name__: model.objects.count()
        for model in (Author, Profile, Post, Comment, Category, Tag)
    }
    assert counts == {
        "Author": 4, "Profile": 4, "Post": 15,
        "Comment": 23, "Category": 4, "Tag": 5,
    }, counts
    assert sorted(Author.objects.values_list("name", "profile__country")) == sorted(seed_data.AUTHORS)
    assert sorted(Category.objects.values_list("name", flat=True)) == sorted(seed_data.CATEGORIES)
    assert sorted(Tag.objects.values_list("name", flat=True)) == sorted(seed_data.TAGS)
    posts = []
    for item in seed_data.POSTS:
        post = Post.objects.get(title=item["title"])
        assert post.author.name == item["author"]
        assert (post.category.name if post.category else None) == item["category"]
        assert sorted(post.tags.values_list("name", flat=True)) == sorted(item["tags"])
        assert post.published == item["published"]
        assert post.published_at == item["date"]
        assert post.body == f"Cuerpo de «{item['title']}»."
        assert sorted(post.comments.values_list("author_name", "text")) == sorted(seed_data.comments_of(item))
        posts.append({"id": post.pk, "title": post.title, "comments": post.comments.count()})
    return {"counts": counts, "matches_seed": True, "posts": posts}


def duel():
    results = []
    for source in ("team", "ai"):
        module = importlib.import_module(f"blog.duel.{source if source == 'team' else 'ai_answers'}")
        for question in QUESTIONS:
            row = {
                "source": source, "question": question.key,
                "text": question.text, "contract": question.contract,
                "expected": question.expected, "budget": question.budget,
            }
            with CaptureQueriesContext(connection) as captured:
                try:
                    row["actual"] = question.normalize(getattr(module, question.key)())
                    row["status"] = (
                        "wrong" if row["actual"] != question.expected else
                        "costly" if len(captured) > question.budget else "ok"
                    )
                    if row["status"] == "wrong":
                        row["difference"] = _difference(row["actual"], question.expected)
                except Exception as exc:
                    row.update(status="error", error=f"{type(exc).__name__}: {exc}")
            row["query_count"] = len(captured)
            row["sql"] = [query["sql"] for query in captured]
            results.append(row)
    return results


def front_page():
    with CaptureQueriesContext(connection) as captured:
        response = Client().get("/")
    sql = [query["sql"] for query in captured]
    return {
        "http_status": response.status_code,
        "published_posts": Post.objects.filter(published=True).count(),
        "query_count": len(sql),
        "post_queries": sum('FROM "blog_post"' in query for query in sql),
        "author_queries": sum('FROM "blog_author"' in query for query in sql),
        "tag_queries": sum('FROM "blog_tag"' in query for query in sql),
        "sql": sql,
    }


def source_hashes():
    return {
        str(path.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest()
        for folder in ("blog", "config")
        for path in sorted((ROOT / folder).rglob("*.py"))
    }


if __name__ == "__main__":
    mode = sys.argv[1]
    operation = {"datos": dataset, "duelo": duel, "portada": front_page, "fuentes": source_hashes}[mode]
    result = operation()
    if len(sys.argv) > 2:
        output = ROOT / "entregable" / "evidencias" / sys.argv[2]
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
