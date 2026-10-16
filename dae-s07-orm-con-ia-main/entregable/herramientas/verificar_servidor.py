"""Check the existing local server and its actual rendered article data."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import urllib.request

from diagnostico import front_page
from blog.queries import posts_for_front_page


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "entregable" / "evidencias"
BASE = "http://127.0.0.1:8000"


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.articles = []
        self.current = None
        self.in_heading = False
        self.in_tag = False

    def handle_starttag(self, tag, attrs):
        if tag == "article":
            self.current = {"title": "", "text": "", "tags": []}
        if self.current is not None:
            self.in_heading = tag == "h2" or self.in_heading
            self.in_tag = tag == "span" or self.in_tag

    def handle_endtag(self, tag):
        if tag == "h2":
            self.in_heading = False
        elif tag == "span":
            self.in_tag = False
        elif tag == "article":
            self.articles.append(self.current)
            self.current = None

    def handle_data(self, data):
        if self.current is not None:
            self.current["text"] += data
            if self.in_heading:
                self.current["title"] += data
            if self.in_tag:
                self.current["tags"].append(data)


def main():
    powershell = """
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $listeners = Get-NetTCPConnection -LocalPort 8000 -State Listen
    foreach ($listener in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter (
            'ProcessId = ' + $listener.OwningProcess
        )
        [pscustomobject]@{
            address = $listener.LocalAddress
            port = $listener.LocalPort
            pid = $listener.OwningProcess
            command_line = $process.CommandLine
        } | ConvertTo-Json -Compress
    }
    """
    process = subprocess.run(
        ["powershell", "-NoProfile", "-Command", powershell],
        capture_output=True, text=True, encoding="utf-8", check=True,
    )
    listeners = [json.loads(line) for line in process.stdout.splitlines()]
    assert listeners
    assert all("runserver" in row["command_line"] for row in listeners)
    responses = []
    html = ""
    for path in ("/", "/admin/", "/static/admin/css/base.css"):
        with urllib.request.urlopen(BASE + path, timeout=10) as response:
            body = response.read()
            responses.append({
                "requested_url": BASE + path,
                "final_url": response.geturl(),
                "status": response.status,
                "content_type": response.headers.get("Content-Type"),
                "bytes": len(body),
                "sha256": hashlib.sha256(body).hexdigest(),
            })
            assert response.status == 200
            if path == "/":
                html = body.decode("utf-8")
    parser = ArticleParser()
    parser.feed(html)
    posts = list(posts_for_front_page())
    assert len(parser.articles) == len(posts) == 11
    for actual, post in zip(parser.articles, posts, strict=True):
        assert actual["title"] == post.title
        assert post.author.name in actual["text"]
        assert post.published_at.strftime("%d/%m/%Y") in actual["text"]
        assert sorted(actual["tags"]) == sorted(
            f"#{tag.name}" for tag in post.tags.all()
        )
    assert "Borrador:" not in html
    page = front_page()
    assert page["query_count"] == 2
    result = {
        "existing_server_reused": True,
        "new_server_process_started": False,
        "listeners": listeners,
        "http_responses": responses,
        "articles_verified": len(posts),
        "all_titles_authors_dates_tags_match_database": True,
        "drafts_excluded": True,
        "front_page_query_count": page["query_count"],
    }
    (EVIDENCE / "servidor_cierre.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (EVIDENCE / "portada_respuesta.html").write_text(
        html, encoding="utf-8"
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
