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
- Every `title` must be written in natural Korean.
- Every required field must be present.
- `sourceQuotes` must quote only the action itself — the phrase that describes what to do.
  - Circumstantial context (when, where, why, how), commentary, emphasis, and supplementary remarks are not part of the action.
  - Example — "집 가는 길에 고양이 사료 사기. 이건 까먹으면 큰일남." → quote `"고양이 사료 사기"` only. "집 가는 길에"는 상황, "이건 까먹으면 큰일남"은 부연.
  - Example — "내일까지 보고서 제출해야 함. 진짜 급함." → quote `"보고서 제출해야 함"` only. "내일까지"는 기한, "진짜 급함"은 강조.
