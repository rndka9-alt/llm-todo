# LLM TODO PoC Architecture

## Source Of Truth Model

- The note text in the right-hand editor is the only authoring surface.
- The left-hand TODO list is always a projection derived from note content.
- UI-only state such as checkbox toggles and focused TODO flash is stored separately from the note source state.

## Block Model

- Raw text is segmented deterministically in code using paragraph boundaries.
- Each block stores `id`, `text`, absolute source `range`, `createdAt`, `updatedAt`, `lastParsedAt`, and `parseStatus`.
- Block identity is reconciled from previous state using exact-text matches first and overlap-based similarity second, so IDs survive insertions and common edits without using array index identity.

## Parsing / Adapter Model

- Dirty text is computed in code with `diffText`.
- Dirty ranges map to affected blocks and a wider local context window in `analysisPlan.ts`.
- The adapter contract receives `focusBlocks` and `contextBlocks`, keeping analysis context separate from rendering details.
- `MockTodoExtractionAdapter` is deterministic and returns structured TODO drafts only. It never returns UI coordinates, DOM ranges, or layout behavior.

## Projection Model

- Parsed block results are merged into normalized TODO projection items.
- Projection items keep future-facing fields such as `priority`, `dueDate`, `tags`, `depth`, and `sourceAnchor`.
- Projection order follows source order by block position and local TODO position.

## Highlight Range vs Analysis Range

- Analysis ranges are temporary gray pulse overlays for blocks or inserted text currently being reinterpreted.
- Display highlight ranges are mapped later from TODO `sourceAnchor.quote` back into note text with deterministic range mapping.
- This separation ensures the LLM can interpret meaning while application code keeps ownership of display coordinates and highlight UX.

## Why Timestamps Exist

- `createdAt` and `updatedAt` make block lifecycle explicit even before persistence exists.
- `lastParsedAt` supports future stale detection, incremental syncing, and background reparse decisions.
- The PoC already treats parsing as time-based work rather than assuming everything is instantly fresh forever.

## Future Server / Database Migration

- Domain entities are plain serializable objects with stable IDs and timestamps.
- The adapter boundary isolates LLM provider logic from UI and domain state.
- Projection logic is pure and can move to a server or worker without changing the UI contract.
- UI state remains thin, so replacing local note state with API-backed persistence later should mainly affect the repository / state access layer rather than component structure.

## Current Persistence Layer

- The PoC now hydrates and saves workspace snapshots through an IndexedDB repository adapter.
- Persisted data includes source note content, reconciled blocks, parse interpretations, checkbox state, and timestamps.
- Transient UI state such as active flash focus, analysis pulse overlays, and in-flight parsing state is intentionally excluded from persistence.
