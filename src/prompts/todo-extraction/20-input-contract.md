Input contract:

- `TARGET_BLOCK_JSON` is the primary source of truth.
- `CONTEXT_BLOCKS_BEFORE_JSON` contains nearby blocks that appear before the target block.
- `CONTEXT_BLOCKS_AFTER_JSON` contains nearby blocks that appear after the target block.
- `OPTIONAL_HINTS_JSON` may include note title or runtime hints.
- `CURRENT_TIME_ISO` is the current time for relative date interpretation.

Treat the target block as the only place where extracted TODOs may originate.
