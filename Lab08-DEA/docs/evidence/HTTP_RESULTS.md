# Evidencia HTTP real

Fecha UTC: 2026-10-27T16:26:46.852095+00:00

Cliente: Python standard library urllib.request (real HTTP). No se utilizó Postman.

Total: 64; PASS: 64; FAIL: 0.

Los HTML comprueban el renderizador; no son capturas de pantalla.

## root

`GET http://127.0.0.1:8000/api/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTML navegable DRF, HTTP 200.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-root.html",
  "displayed_json": {
    "exams": "http://127.0.0.1:8000/api/exams/",
    "questions": "http://127.0.0.1:8000/api/questions/",
    "options": "http://127.0.0.1:8000/api/options/"
  }
}
```

Resultado real: **PASS**.

## exams

`GET http://127.0.0.1:8000/api/exams/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTML navegable DRF, HTTP 200.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-exams.html",
  "displayed_json": {
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": 1,
        "title": "Demo - Django",
        "description": "Datos locales del Laboratorio 08.",
        "created_at": "2026-10-27T16:15:03.630678Z"
      },
      {
        "id": 2,
        "title": "Demo - REST",
        "description": "Datos locales del Laboratorio 08.",
        "created_at": "2026-10-27T16:15:03.647048Z"
      }
    ]
  }
}
```

Resultado real: **PASS**.

## questions

`GET http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTML navegable DRF, HTTP 200.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-questions.html",
  "displayed_json": {
    "count": 12,
    "next": "http://127.0.0.1:8000/api/questions/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "exam": 1,
        "text": "Demo - Django: pregunta de práctica 1",
        "options": [
          {
            "id": 1,
            "text": "Respuesta correcta",
            "is_correct": true
          },
          {
            "id": 2,
            "text": "Respuesta incorrecta",
            "is_correct": false
          }
        ]
      },
      {
        "id": 2,
        "exam": 1,
        "text": "Demo - Django: pregunta de práctica 2",
        "options": [
          {
            "id": 3,
            "text": "Respuesta correcta",
            "is_correct": true
          },
          {
            "id": 4,
            "text": "Respuesta incorrecta",
            "is_correct": false
          }
        ]
      },
      {
        "id": 3,
        "exam": 1,
        "text": "Demo - Django: pregunta de práctica 3",
        "options": [
          {
            "id": 5,
            "text": "Respuesta correcta",
            "is_correct": true
          },
          {
            "id": 6,
            "text": "Respuesta incorrecta",
            "is_correct": false
          }
        ]
      },
      {
        "id": 4,
        "exam": 1,
        "text": "Demo - Django: pregunta de práctica 4",
        "options": [
          {
            "id": 7,
            "text": "Respuesta correcta",
            "is_correct": true
          },
          {
            "id": 8,
            "text": "Respuesta incorrecta",
            "is_correct": false
          }
        ]
      },
      {
        "id": 5,
        "exam": 1,
        "text": "Demo - Django: pregunta de práctica 5",
        "options": [
          {
            "id": 9,
            "text": "Respuesta correcta",
            "is_correct": true
          },
          {
            "id": 10,
            "text": "Respuesta incorrecta",
            "is_correct": false
          }
        ]
      }
    ]
  }
}
```

Resultado real: **PASS**.

## options

`GET http://127.0.0.1:8000/api/options/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTML navegable DRF, HTTP 200.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-options.html",
  "displayed_json": {
    "count": 24,
    "next": "http://127.0.0.1:8000/api/options/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "question": 1,
        "text": "Respuesta correcta",
        "is_correct": true
      },
      {
        "id": 2,
        "question": 1,
        "text": "Respuesta incorrecta",
        "is_correct": false
      },
      {
        "id": 3,
        "question": 2,
        "text": "Respuesta correcta",
        "is_correct": true
      },
      {
        "id": 4,
        "question": 2,
        "text": "Respuesta incorrecta",
        "is_correct": false
      },
      {
        "id": 5,
        "question": 3,
        "text": "Respuesta correcta",
        "is_correct": true
      }
    ]
  }
}
```

Resultado real: **PASS**.

## html-create-exam

`POST http://127.0.0.1:8000/api/exams/`

JSON enviado:
```json
{
  "title": "Browsable verification"
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-create-exam.html",
  "displayed_json": {
    "id": 6,
    "title": "Browsable verification",
    "description": "",
    "created_at": "2026-10-27T16:26:45.497119Z"
  }
}
```

Resultado real: **PASS**.

## html-create-question

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 6,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-create-question.html",
  "displayed_json": {
    "id": 28,
    "exam": 6,
    "text": "HTTP - What is Django?",
    "options": [
      {
        "id": 66,
        "text": "A Python framework",
        "is_correct": true
      },
      {
        "id": 67,
        "text": "A database",
        "is_correct": false
      }
    ]
  }
}
```

Resultado real: **PASS**.

## html-create-option

`POST http://127.0.0.1:8000/api/options/`

JSON enviado:
```json
{
  "question": 28,
  "text": "HTML option"
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-create-option.html",
  "displayed_json": {
    "id": 68,
    "question": 28,
    "text": "HTML option",
    "is_correct": false
  }
}
```

Resultado real: **PASS**.

## html-detail-exam

`GET http://127.0.0.1:8000/api/exams/6/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-detail-exam.html",
  "displayed_json": {
    "id": 6,
    "title": "Browsable verification",
    "description": "",
    "created_at": "2026-10-27T16:26:45.497119Z"
  }
}
```

Resultado real: **PASS**.

## html-patch-exam

`PATCH http://127.0.0.1:8000/api/exams/6/`

JSON enviado:
```json
{
  "title": "HTML updated"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-patch-exam.html",
  "displayed_json": {
    "id": 6,
    "title": "HTML updated",
    "description": "",
    "created_at": "2026-10-27T16:26:45.497119Z"
  }
}
```

Resultado real: **PASS**.

## html-detail-question

`GET http://127.0.0.1:8000/api/questions/28/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-detail-question.html",
  "displayed_json": {
    "id": 28,
    "exam": 6,
    "text": "HTTP - What is Django?",
    "options": [
      {
        "id": 66,
        "text": "A Python framework",
        "is_correct": true
      },
      {
        "id": 67,
        "text": "A database",
        "is_correct": false
      },
      {
        "id": 68,
        "text": "HTML option",
        "is_correct": false
      }
    ]
  }
}
```

Resultado real: **PASS**.

## html-patch-question

`PATCH http://127.0.0.1:8000/api/questions/28/`

JSON enviado:
```json
{
  "text": "HTML updated"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-patch-question.html",
  "displayed_json": {
    "id": 28,
    "exam": 6,
    "text": "HTML updated",
    "options": [
      {
        "id": 66,
        "text": "A Python framework",
        "is_correct": true
      },
      {
        "id": 67,
        "text": "A database",
        "is_correct": false
      },
      {
        "id": 68,
        "text": "HTML option",
        "is_correct": false
      }
    ]
  }
}
```

Resultado real: **PASS**.

## html-detail-option

`GET http://127.0.0.1:8000/api/options/68/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-detail-option.html",
  "displayed_json": {
    "id": 68,
    "question": 28,
    "text": "HTML option",
    "is_correct": false
  }
}
```

Resultado real: **PASS**.

## html-patch-option

`PATCH http://127.0.0.1:8000/api/options/68/`

JSON enviado:
```json
{
  "text": "HTML updated"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-patch-option.html",
  "displayed_json": {
    "id": 68,
    "question": 28,
    "text": "HTML updated",
    "is_correct": false
  }
}
```

Resultado real: **PASS**.

## html-required-error

`POST http://127.0.0.1:8000/api/exams/`

JSON enviado:
```json
{}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: HTTP 400

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-required-error.html",
  "displayed_json": {
    "title": [
      "This field is required."
    ]
  }
}
```

Resultado real: **PASS**.

## html-delete-option

`DELETE http://127.0.0.1:8000/api/options/68/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: DRF devuelve HTML 200 al representar DELETE 204.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-delete-option.html",
  "displayed_json": null
}
```

Resultado real: **PASS**.

## html-delete-question

`DELETE http://127.0.0.1:8000/api/questions/28/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: DRF devuelve HTML 200 al representar DELETE 204.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-delete-question.html",
  "displayed_json": null
}
```

Resultado real: **PASS**.

## html-delete-exam

`DELETE http://127.0.0.1:8000/api/exams/6/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: DRF devuelve HTML 200 al representar DELETE 204.

Respuesta JSON (o referencia al HTML):
```json
{
  "html_file": "browsable-html-delete-exam.html",
  "displayed_json": null
}
```

Resultado real: **PASS**.

## create-exam

`POST http://127.0.0.1:8000/api/exams/`

JSON enviado:
```json
{
  "title": "HTTP verification",
  "description": "Temporary test data"
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 7,
  "title": "HTTP verification",
  "description": "Temporary test data",
  "created_at": "2026-10-27T16:26:45.886135Z"
}
```

Resultado real: **PASS**.

## list-exams

`GET http://127.0.0.1:8000/api/exams/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Demo - Django",
      "description": "Datos locales del Laboratorio 08.",
      "created_at": "2026-10-27T16:15:03.630678Z"
    },
    {
      "id": 2,
      "title": "Demo - REST",
      "description": "Datos locales del Laboratorio 08.",
      "created_at": "2026-10-27T16:15:03.647048Z"
    },
    {
      "id": 7,
      "title": "HTTP verification",
      "description": "Temporary test data",
      "created_at": "2026-10-27T16:26:45.886135Z"
    }
  ]
}
```

Resultado real: **PASS**.

## list-questions

`GET http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 12,
  "next": "http://127.0.0.1:8000/api/questions/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "exam": 1,
      "text": "Demo - Django: pregunta de práctica 1",
      "options": [
        {
          "id": 1,
          "text": "Respuesta correcta",
          "is_correct": true
        },
        {
          "id": 2,
          "text": "Respuesta incorrecta",
          "is_correct": false
        }
      ]
    },
    {
      "id": 2,
      "exam": 1,
      "text": "Demo - Django: pregunta de práctica 2",
      "options": [
        {
          "id": 3,
          "text": "Respuesta correcta",
          "is_correct": true
        },
        {
          "id": 4,
          "text": "Respuesta incorrecta",
          "is_correct": false
        }
      ]
    },
    {
      "id": 3,
      "exam": 1,
      "text": "Demo - Django: pregunta de práctica 3",
      "options": [
        {
          "id": 5,
          "text": "Respuesta correcta",
          "is_correct": true
        },
        {
          "id": 6,
          "text": "Respuesta incorrecta",
          "is_correct": false
        }
      ]
    },
    {
      "id": 4,
      "exam": 1,
      "text": "Demo - Django: pregunta de práctica 4",
      "options": [
        {
          "id": 7,
          "text": "Respuesta correcta",
          "is_correct": true
        },
        {
          "id": 8,
          "text": "Respuesta incorrecta",
          "is_correct": false
        }
      ]
    },
    {
      "id": 5,
      "exam": 1,
      "text": "Demo - Django: pregunta de práctica 5",
      "options": [
        {
          "id": 9,
          "text": "Respuesta correcta",
          "is_correct": true
        },
        {
          "id": 10,
          "text": "Respuesta incorrecta",
          "is_correct": false
        }
      ]
    }
  ]
}
```

Resultado real: **PASS**.

## list-options

`GET http://127.0.0.1:8000/api/options/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 24,
  "next": "http://127.0.0.1:8000/api/options/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "question": 1,
      "text": "Respuesta correcta",
      "is_correct": true
    },
    {
      "id": 2,
      "question": 1,
      "text": "Respuesta incorrecta",
      "is_correct": false
    },
    {
      "id": 3,
      "question": 2,
      "text": "Respuesta correcta",
      "is_correct": true
    },
    {
      "id": 4,
      "question": 2,
      "text": "Respuesta incorrecta",
      "is_correct": false
    },
    {
      "id": 5,
      "question": 3,
      "text": "Respuesta correcta",
      "is_correct": true
    }
  ]
}
```

Resultado real: **PASS**.

## detail-exam

`GET http://127.0.0.1:8000/api/exams/7/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 7,
  "title": "HTTP verification",
  "description": "Temporary test data",
  "created_at": "2026-10-27T16:26:45.886135Z"
}
```

Resultado real: **PASS**.

## patch-exam

`PATCH http://127.0.0.1:8000/api/exams/7/`

JSON enviado:
```json
{
  "title": "HTTP updated"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 7,
  "title": "HTTP updated",
  "description": "Temporary test data",
  "created_at": "2026-10-27T16:26:45.886135Z"
}
```

Resultado real: **PASS**.

## put-exam

`PUT http://127.0.0.1:8000/api/exams/7/`

JSON enviado:
```json
{
  "title": "HTTP replaced"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 7,
  "title": "HTTP replaced",
  "description": "Temporary test data",
  "created_at": "2026-10-27T16:26:45.886135Z"
}
```

Resultado real: **PASS**.

## create-question

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 29,
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "id": 69,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 70,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## detail-question

`GET http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 29,
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "id": 69,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 70,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## patch-question

`PATCH http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
{
  "text": "HTTP - Updated question"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 29,
  "exam": 7,
  "text": "HTTP - Updated question",
  "options": [
    {
      "id": 69,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 70,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## create-option

`POST http://127.0.0.1:8000/api/options/`

JSON enviado:
```json
{
  "question": 29,
  "text": "Other",
  "is_correct": false
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 71,
  "question": 29,
  "text": "Other",
  "is_correct": false
}
```

Resultado real: **PASS**.

## detail-option

`GET http://127.0.0.1:8000/api/options/71/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 71,
  "question": 29,
  "text": "Other",
  "is_correct": false
}
```

Resultado real: **PASS**.

## patch-option

`PATCH http://127.0.0.1:8000/api/options/71/`

JSON enviado:
```json
{
  "text": "Other updated"
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 71,
  "question": 29,
  "text": "Other updated",
  "is_correct": false
}
```

Resultado real: **PASS**.

## put-option

`PUT http://127.0.0.1:8000/api/options/71/`

JSON enviado:
```json
{
  "question": 29,
  "text": "Other replaced",
  "is_correct": false
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 71,
  "question": 29,
  "text": "Other replaced",
  "is_correct": false
}
```

Resultado real: **PASS**.

## delete-option

`DELETE http://127.0.0.1:8000/api/options/71/`

JSON enviado:
```json
null
```

HTTP esperado: **204**; obtenido: **204**.

Esperado: HTTP 204

Respuesta JSON (o referencia al HTML):
```json
null
```

Resultado real: **PASS**.

## option-deleted

`GET http://127.0.0.1:8000/api/options/71/`

JSON enviado:
```json
null
```

HTTP esperado: **404**; obtenido: **404**.

Esperado: HTTP 404

Respuesta JSON (o referencia al HTML):
```json
{
  "detail": "No Option matches the given query."
}
```

Resultado real: **PASS**.

## missing-required-field

`POST http://127.0.0.1:8000/api/exams/`

JSON enviado:
```json
{
  "description": "Missing title"
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400 con error en title; no se crea examen.

Respuesta JSON (o referencia al HTML):
```json
{
  "title": [
    "This field is required."
  ]
}
```

Resultado real: **PASS**.

## wrong-data-type

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": "not-an-integer",
  "text": "HTTP - What is Django?",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400 por id de examen de tipo incorrecto.

Respuesta JSON (o referencia al HTML):
```json
{
  "exam": [
    "Incorrect type. Expected pk value, received str."
  ]
}
```

Resultado real: **PASS**.

## wrong-boolean-type

`PATCH http://127.0.0.1:8000/api/options/69/`

JSON enviado:
```json
{
  "is_correct": {
    "invalid": true
  }
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400 por valor booleano incompatible.

Respuesta JSON (o referencia al HTML):
```json
{
  "is_correct": [
    "Must be a valid boolean."
  ]
}
```

Resultado real: **PASS**.

## create-zero-correct

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": false
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400; se exige exactamente una opción correcta.

Respuesta JSON (o referencia al HTML):
```json
{
  "options": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## patch-zero-correct

`PATCH http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
{
  "options": [
    {
      "text": "A Python framework",
      "is_correct": false
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400; la pregunta conserva sus opciones.

Respuesta JSON (o referencia al HTML):
```json
{
  "options": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## create-two-correct

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": true
    }
  ]
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400; se exige exactamente una opción correcta.

Respuesta JSON (o referencia al HTML):
```json
{
  "options": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## patch-two-correct

`PATCH http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
{
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": true
    }
  ]
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: 400; la pregunta conserva sus opciones.

Respuesta JSON (o referencia al HTML):
```json
{
  "options": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## direct-create-second-correct

`POST http://127.0.0.1:8000/api/options/`

JSON enviado:
```json
{
  "question": 29,
  "text": "Duplicate",
  "is_correct": true
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: HTTP 400

Respuesta JSON (o referencia al HTML):
```json
{
  "is_correct": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## unset-correct

`PATCH http://127.0.0.1:8000/api/options/69/`

JSON enviado:
```json
{
  "is_correct": false
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: HTTP 400

Respuesta JSON (o referencia al HTML):
```json
{
  "is_correct": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## set-second-correct

`PATCH http://127.0.0.1:8000/api/options/70/`

JSON enviado:
```json
{
  "is_correct": true
}
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: HTTP 400

Respuesta JSON (o referencia al HTML):
```json
{
  "is_correct": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## delete-only-correct

`DELETE http://127.0.0.1:8000/api/options/69/`

JSON enviado:
```json
null
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: HTTP 400

Respuesta JSON (o referencia al HTML):
```json
{
  "is_correct": [
    "A question must have exactly one correct option."
  ]
}
```

Resultado real: **PASS**.

## invariant-after-errors

`GET http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 29,
  "exam": 7,
  "text": "HTTP - Updated question",
  "options": [
    {
      "id": 69,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 70,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## switch-correct-atomically

`PATCH http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
{
  "options": [
    {
      "text": "Old answer",
      "is_correct": false
    },
    {
      "text": "New answer",
      "is_correct": true
    }
  ]
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 29,
  "exam": 7,
  "text": "HTTP - Updated question",
  "options": [
    {
      "id": 72,
      "text": "Old answer",
      "is_correct": false
    },
    {
      "id": 73,
      "text": "New answer",
      "is_correct": true
    }
  ]
}
```

Resultado real: **PASS**.

## put-question

`PUT http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 29,
  "exam": 7,
  "text": "HTTP - What is Django?",
  "options": [
    {
      "id": 74,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 75,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-data-1

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - Pagination example 1",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 30,
  "exam": 7,
  "text": "HTTP - Pagination example 1",
  "options": [
    {
      "id": 76,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 77,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-data-2

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - Pagination example 2",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 31,
  "exam": 7,
  "text": "HTTP - Pagination example 2",
  "options": [
    {
      "id": 78,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 79,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-data-3

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - Pagination example 3",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 32,
  "exam": 7,
  "text": "HTTP - Pagination example 3",
  "options": [
    {
      "id": 80,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 81,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-data-4

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - Pagination example 4",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 33,
  "exam": 7,
  "text": "HTTP - Pagination example 4",
  "options": [
    {
      "id": 82,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 83,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-data-5

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - Pagination example 5",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 34,
  "exam": 7,
  "text": "HTTP - Pagination example 5",
  "options": [
    {
      "id": 84,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 85,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-data-6

`POST http://127.0.0.1:8000/api/questions/`

JSON enviado:
```json
{
  "exam": 7,
  "text": "HTTP - Pagination example 6",
  "options": [
    {
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

HTTP esperado: **201**; obtenido: **201**.

Esperado: HTTP 201

Respuesta JSON (o referencia al HTML):
```json
{
  "id": 35,
  "exam": 7,
  "text": "HTTP - Pagination example 6",
  "options": [
    {
      "id": 86,
      "text": "A Python framework",
      "is_correct": true
    },
    {
      "id": 87,
      "text": "A database",
      "is_correct": false
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-first

`GET http://127.0.0.1:8000/api/questions/?exam=7`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: Total 7, primera página 5, enlace next presente.

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 7,
  "next": "http://127.0.0.1:8000/api/questions/?exam=7&page=2",
  "previous": null,
  "results": [
    {
      "id": 29,
      "exam": 7,
      "text": "HTTP - What is Django?",
      "options": [
        {
          "id": 74,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 75,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 30,
      "exam": 7,
      "text": "HTTP - Pagination example 1",
      "options": [
        {
          "id": 76,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 77,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 31,
      "exam": 7,
      "text": "HTTP - Pagination example 2",
      "options": [
        {
          "id": 78,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 79,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 32,
      "exam": 7,
      "text": "HTTP - Pagination example 3",
      "options": [
        {
          "id": 80,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 81,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 33,
      "exam": 7,
      "text": "HTTP - Pagination example 4",
      "options": [
        {
          "id": 82,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 83,
          "text": "A database",
          "is_correct": false
        }
      ]
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-second

`GET http://127.0.0.1:8000/api/questions/?exam=7&page=2`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: Total 7, segunda página 2, enlace previous presente.

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 7,
  "next": null,
  "previous": "http://127.0.0.1:8000/api/questions/?exam=7",
  "results": [
    {
      "id": 34,
      "exam": 7,
      "text": "HTTP - Pagination example 5",
      "options": [
        {
          "id": 84,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 85,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 35,
      "exam": 7,
      "text": "HTTP - Pagination example 6",
      "options": [
        {
          "id": 86,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 87,
          "text": "A database",
          "is_correct": false
        }
      ]
    }
  ]
}
```

Resultado real: **PASS**.

## pagination-back

`GET http://127.0.0.1:8000/api/questions/?exam=7`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: HTTP 200

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 7,
  "next": "http://127.0.0.1:8000/api/questions/?exam=7&page=2",
  "previous": null,
  "results": [
    {
      "id": 29,
      "exam": 7,
      "text": "HTTP - What is Django?",
      "options": [
        {
          "id": 74,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 75,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 30,
      "exam": 7,
      "text": "HTTP - Pagination example 1",
      "options": [
        {
          "id": 76,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 77,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 31,
      "exam": 7,
      "text": "HTTP - Pagination example 2",
      "options": [
        {
          "id": 78,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 79,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 32,
      "exam": 7,
      "text": "HTTP - Pagination example 3",
      "options": [
        {
          "id": 80,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 81,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 33,
      "exam": 7,
      "text": "HTTP - Pagination example 4",
      "options": [
        {
          "id": 82,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 83,
          "text": "A database",
          "is_correct": false
        }
      ]
    }
  ]
}
```

Resultado real: **PASS**.

## search-and-filter

`GET http://127.0.0.1:8000/api/questions/?exam=7&search=Pagination`

JSON enviado:
```json
null
```

HTTP esperado: **200**; obtenido: **200**.

Esperado: 6 preguntas coincidentes del examen de prueba.

Respuesta JSON (o referencia al HTML):
```json
{
  "count": 6,
  "next": "http://127.0.0.1:8000/api/questions/?exam=7&page=2&search=Pagination",
  "previous": null,
  "results": [
    {
      "id": 30,
      "exam": 7,
      "text": "HTTP - Pagination example 1",
      "options": [
        {
          "id": 76,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 77,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 31,
      "exam": 7,
      "text": "HTTP - Pagination example 2",
      "options": [
        {
          "id": 78,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 79,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 32,
      "exam": 7,
      "text": "HTTP - Pagination example 3",
      "options": [
        {
          "id": 80,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 81,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 33,
      "exam": 7,
      "text": "HTTP - Pagination example 4",
      "options": [
        {
          "id": 82,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 83,
          "text": "A database",
          "is_correct": false
        }
      ]
    },
    {
      "id": 34,
      "exam": 7,
      "text": "HTTP - Pagination example 5",
      "options": [
        {
          "id": 84,
          "text": "A Python framework",
          "is_correct": true
        },
        {
          "id": 85,
          "text": "A database",
          "is_correct": false
        }
      ]
    }
  ]
}
```

Resultado real: **PASS**.

## filter-invalid

`GET http://127.0.0.1:8000/api/questions/?exam=abc`

JSON enviado:
```json
null
```

HTTP esperado: **400**; obtenido: **400**.

Esperado: HTTP 400

Respuesta JSON (o referencia al HTML):
```json
{
  "exam": [
    "A valid integer is required."
  ]
}
```

Resultado real: **PASS**.

## page-not-found

`GET http://127.0.0.1:8000/api/questions/?exam=7&page=999`

JSON enviado:
```json
null
```

HTTP esperado: **404**; obtenido: **404**.

Esperado: HTTP 404

Respuesta JSON (o referencia al HTML):
```json
{
  "detail": "Invalid page."
}
```

Resultado real: **PASS**.

## delete-question

`DELETE http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
null
```

HTTP esperado: **204**; obtenido: **204**.

Esperado: HTTP 204

Respuesta JSON (o referencia al HTML):
```json
null
```

Resultado real: **PASS**.

## question-deleted

`GET http://127.0.0.1:8000/api/questions/29/`

JSON enviado:
```json
null
```

HTTP esperado: **404**; obtenido: **404**.

Esperado: HTTP 404

Respuesta JSON (o referencia al HTML):
```json
{
  "detail": "No Question matches the given query."
}
```

Resultado real: **PASS**.

## options-cascade

`GET http://127.0.0.1:8000/api/options/74/`

JSON enviado:
```json
null
```

HTTP esperado: **404**; obtenido: **404**.

Esperado: HTTP 404

Respuesta JSON (o referencia al HTML):
```json
{
  "detail": "No Option matches the given query."
}
```

Resultado real: **PASS**.

## delete-exam

`DELETE http://127.0.0.1:8000/api/exams/7/`

JSON enviado:
```json
null
```

HTTP esperado: **204**; obtenido: **204**.

Esperado: HTTP 204

Respuesta JSON (o referencia al HTML):
```json
null
```

Resultado real: **PASS**.

## exam-deleted

`GET http://127.0.0.1:8000/api/exams/7/`

JSON enviado:
```json
null
```

HTTP esperado: **404**; obtenido: **404**.

Esperado: HTTP 404

Respuesta JSON (o referencia al HTML):
```json
{
  "detail": "No Exam matches the given query."
}
```

Resultado real: **PASS**.
