export const todoExtractionPromptVersion = 'todo-extraction.v2';

export const todoExtractionPromptManifest = [
  '00-role.md',
  '10-goal.md',
  '20-input-contract.md',
  '30-output-contract.md',
  '40-extraction-rules.md',
  '50-metadata-rules.md',
  '60-context-rules.md',
  '70-failure-rules.md',
  '80-runtime-template.md',
] as const;

export type TodoExtractionPromptSectionFile = (typeof todoExtractionPromptManifest)[number];
