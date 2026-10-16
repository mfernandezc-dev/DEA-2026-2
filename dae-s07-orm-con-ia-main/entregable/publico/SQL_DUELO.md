> Copia pública: rutas locales omitidas por privacidad. Los resultados corresponden a las ejecuciones históricas indicadas; no se repitieron para esta exportación. [Política y procedencia](../PUBLICACION.md).

# Anexo E — SQL realmente ejecutado

Capturado con `CaptureQueriesContext` al normalizar las respuestas. No es SQL propuesto ni ejecutado libremente por el agente. El texto hostil en los resultados es solo dato.

## team / q1 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" WHERE "blog_post"."published" = 1
```

## team / q2 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" WHERE "blog_post"."category_id" IS NULL
```

## team / q3 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" WHERE "blog_post"."published_at" BETWEEN '2026-03-01' AND '2026-05-31'
```

## team / q4 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at", COUNT("blog_comment"."id") AS "n_comments" FROM "blog_post" LEFT OUTER JOIN "blog_comment" ON ("blog_post"."id" = "blog_comment"."post_id") GROUP BY "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" HAVING COUNT("blog_comment"."id") > 2
```

## team / q5 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at", COUNT(DISTINCT "blog_comment"."id") AS "n_comments", COUNT(DISTINCT "blog_post_tags"."tag_id") AS "n_tags" FROM "blog_post" LEFT OUTER JOIN "blog_comment" ON ("blog_post"."id" = "blog_comment"."post_id") LEFT OUTER JOIN "blog_post_tags" ON ("blog_post"."id" = "blog_post_tags"."post_id") WHERE "blog_post"."published" = 1 GROUP BY "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" ORDER BY 8 DESC, "blog_post"."id" ASC LIMIT 3
```

## team / q6 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" INNER JOIN "blog_author" ON ("blog_post"."author_id" = "blog_author"."id") INNER JOIN "blog_profile" ON ("blog_author"."id" = "blog_profile"."author_id") WHERE "blog_profile"."country" = 'Perú'
```

## team / q7 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_comment"."id", "blog_comment"."post_id", "blog_comment"."author_name", "blog_comment"."text", "blog_comment"."created_at" FROM "blog_comment" INNER JOIN "blog_post" ON ("blog_comment"."post_id" = "blog_post"."id") INNER JOIN "blog_category" ON ("blog_post"."category_id" = "blog_category"."id") WHERE "blog_category"."name" = 'Tecnología'
```

## team / q8 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_author"."id", "blog_author"."name" FROM "blog_author" WHERE NOT (EXISTS(SELECT 1 AS "a" FROM "blog_post" "U1" WHERE ("U1"."published" = 1 AND "U1"."author_id" = ("blog_author"."id")) LIMIT 1))
```

## ai / q1 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" WHERE "blog_post"."published" = 1
```

## ai / q2 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" WHERE "blog_post"."category_id" IS NULL
```

## ai / q3 — wrong (1 consultas)

**Diferencia real:** faltan 2 (p. ej. 'Introducción al ORM de Django')

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post" WHERE ("blog_post"."published_at" > '2026-03-01' AND "blog_post"."published_at" < '2026-05-31')
```

## ai / q4 — costly (16 consultas)

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" FROM "blog_post"
```

Consulta 2:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 1
```

Consulta 3:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 2
```

Consulta 4:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 3
```

Consulta 5:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 4
```

Consulta 6:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 5
```

Consulta 7:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 6
```

Consulta 8:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 7
```

Consulta 9:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 8
```

Consulta 10:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 9
```

Consulta 11:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 10
```

Consulta 12:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 11
```

Consulta 13:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 12
```

Consulta 14:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 13
```

Consulta 15:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 14
```

Consulta 16:

```sql
SELECT COUNT(*) AS "__count" FROM "blog_comment" WHERE "blog_comment"."post_id" = 15
```

## ai / q5 — wrong (1 consultas)

**Diferencia real:** devolvió [('Introducción al ORM de Django', 18, 18), ('QuerySets perezosos', 12, 12), ('Managers propios paso a paso', 8, 8)]; se esperaba [('Introducción al ORM de Django', 6, 3), ('Managers propios paso a paso', 4, 2), ('QuerySets perezosos', 3, 4)]

Consulta 1:

```sql
SELECT "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at", COUNT("blog_comment"."id") AS "n_comments", COUNT("blog_post_tags"."tag_id") AS "n_tags" FROM "blog_post" LEFT OUTER JOIN "blog_comment" ON ("blog_post"."id" = "blog_comment"."post_id") LEFT OUTER JOIN "blog_post_tags" ON ("blog_post"."id" = "blog_post_tags"."post_id") WHERE "blog_post"."published" = 1 GROUP BY "blog_post"."id", "blog_post"."title", "blog_post"."body", "blog_post"."author_id", "blog_post"."category_id", "blog_post"."published", "blog_post"."published_at" ORDER BY 8 DESC LIMIT 3
```

## ai / q6 — error (0 consultas)

**Error real:** FieldError: Unsupported lookup 'country' for ForeignKey or join on the field not permitted.. No se emitió SQL.

## ai / q7 — ok (1 consultas)

Consulta 1:

```sql
SELECT "blog_comment"."id", "blog_comment"."post_id", "blog_comment"."author_name", "blog_comment"."text", "blog_comment"."created_at" FROM "blog_comment" INNER JOIN "blog_post" ON ("blog_comment"."post_id" = "blog_post"."id") INNER JOIN "blog_category" ON ("blog_post"."category_id" = "blog_category"."id") WHERE "blog_category"."name" = 'Tecnología'
```

## ai / q8 — wrong (1 consultas)

**Diferencia real:** faltan 1 (p. ej. 'Diego Pinto'); sobran 1 (p. ej. 'Ana Quispe')

Consulta 1:

```sql
SELECT "blog_author"."id", "blog_author"."name" FROM "blog_author" INNER JOIN "blog_post" ON ("blog_author"."id" = "blog_post"."author_id") WHERE "blog_post"."published" = 0
```
