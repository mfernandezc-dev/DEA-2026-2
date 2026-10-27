# Contrato local — Laboratorio 08

Contrato definido antes de implementar. Base: `http://127.0.0.1:8000/api/`.
No se publica ni sincroniza con servicios externos.

## Recursos

- `exams`: `id` (solo lectura), `title` (texto obligatorio, máximo 200),
  `description` (texto opcional), `created_at` (fecha/hora de solo lectura).
- `questions`: `id` (solo lectura), `exam` (id de examen existente),
  `text` (enunciado obligatorio), `options` (lista anidada obligatoria al crear).
- `options`: `id` (solo lectura), `question` (id de pregunta existente),
  `text` (texto obligatorio, máximo 255), `is_correct` (booleano, defecto `false`).
  Dentro de una pregunta, cada opción expone `id`, `text`, `is_correct`.

## Operaciones y respuestas

Para cada recurso: `GET /` → 200 con `count`, `next`, `previous`, `results`;
`POST /` → 201 con objeto; `GET /{id}/` → 200 con objeto;
`PATCH /{id}/` y `PUT /{id}/` → 200 con objeto;
`DELETE /{id}/` → 204 sin cuerpo. Validación → 400 con errores por campo;
id inexistente → 404. Las rutas terminan en `/`. Estos códigos corresponden
a JSON. Con `Accept: text/html`, DRF representa DELETE permitido como 200
con HTML en lugar de 204, para mostrar la página navegable.

## Invariante de respuesta correcta

Cada pregunta creada por la API tiene exactamente una opción correcta.
Crear una pregunta exige opciones completas y exactamente un `is_correct: true`.
En PATCH se puede omitir `options` para conservarlas; si se incluye, reemplaza
la lista completa, exige texto en cada elemento y exactamente una correcta.
Los identificadores anidados son de solo lectura y se generan de nuevo al
reemplazar opciones. PUT exige también las opciones.

Las escrituras anidadas son atómicas. Una restricción única condicional impide
dos correctas por pregunta en la base de datos. Las opciones directas se pueden
crear, modificar o eliminar solo si permanece exactamente una correcta.
No se permite mover una opción existente a otra pregunta. Para cambiar la
respuesta correcta se usa PATCH de la pregunta con todas sus opciones.
Eliminar pregunta o examen elimina sus descendientes en cascada.
La garantía de al menos una correcta corresponde a las escrituras de esta API;
no se promete para SQL directo o escrituras arbitrarias mediante el ORM.

## Consulta y acceso

`GET questions/?exam=1`, `GET questions/?search=texto` y combinación de ambos.
`exam` debe ser un entero positivo; filtro inválido → 400, examen sin preguntas
o inexistente → lista vacía. Búsqueda no sensible a mayúsculas.
Páginas de 5 elementos, orden ascendente por id, `?page=2`;
página inexistente → 404. Solo lectura de `id` y `created_at`.

Permisos `AllowAny`, únicamente para práctica local, no producción.
Renderizadores JSON y API navegable HTML. Sin integraciones externas.
