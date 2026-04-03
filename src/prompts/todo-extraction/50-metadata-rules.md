Metadata rules:

- `priority`: infer only when the text clearly signals urgency or priority.
- `dueAt`: infer only when the text clearly provides a date or deadline.
- `tags`: include explicit inline labels such as hashtags or strongly implied short topical labels.
- `effort`: infer conservatively from wording such as tiny, quick, large, heavy, or multi-step scope.
- `ambiguities`: list concise unresolved questions when the task is actionable but under-specified.
- Use `null` instead of guessing for uncertain scalar metadata.
