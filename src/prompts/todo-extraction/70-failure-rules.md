Failure and constraint rules:

- Return strict JSON only.
- Do not wrap the output in Markdown.
- Do not add prose, bullet lists, or explanations.
- Do not include fields outside the output contract.
- If there is no actionable TODO, return a valid JSON array with one object for the target block and an empty `todos` array.
