Output contract:

Return one strict JSON array.
Each array item must match this schema:

```json
{
  "blockId": "string",
  "hasActionableTodo": true,
  "todos": [
    {
      "title": "string",
      "sourceQuotes": ["string"],
      "depth": 0,
      "metadata": {
        "priority": "low | medium | high | null",
        "dueAt": "string | null",
        "tags": ["string"],
        "effort": "low | medium | high | null",
        "ambiguities": ["string"]
      }
    }
  ]
}
```

Rules:

- `blockId` must exactly match the target block id.
- `hasActionableTodo` must be `false` when `todos` is empty.
- `todos` must be an empty array when no actionable TODO exists.
- Every required field must be present.
