import roleSection from './00-role.md?raw';
import goalSection from './10-goal.md?raw';
import inputContractSection from './20-input-contract.md?raw';
import outputContractSection from './30-output-contract.md?raw';
import extractionRulesSection from './40-extraction-rules.md?raw';
import metadataRulesSection from './50-metadata-rules.md?raw';
import contextRulesSection from './60-context-rules.md?raw';
import failureRulesSection from './70-failure-rules.md?raw';
import runtimeTemplateSection from './80-runtime-template.md?raw';
import type { TodoExtractionPromptSectionFile } from './manifest';
import { todoExtractionPromptManifest } from './manifest';

export interface TodoPromptRuntimeInput {
  currentTimeIso: string;
  targetBlockJson: string;
  contextBlocksBeforeJson: string;
  contextBlocksAfterJson: string;
  optionalHintsJson: string;
}

export const todoExtractionPromptSections: Record<TodoExtractionPromptSectionFile, string> = {
  '00-role.md': roleSection,
  '10-goal.md': goalSection,
  '20-input-contract.md': inputContractSection,
  '30-output-contract.md': outputContractSection,
  '40-extraction-rules.md': extractionRulesSection,
  '50-metadata-rules.md': metadataRulesSection,
  '60-context-rules.md': contextRulesSection,
  '70-failure-rules.md': failureRulesSection,
  '80-runtime-template.md': runtimeTemplateSection,
};

function fillRuntimeTemplate(template: string, input: TodoPromptRuntimeInput): string {
  return template
    .split('{{CURRENT_TIME_ISO}}').join(input.currentTimeIso)
    .split('{{TARGET_BLOCK_JSON}}').join(input.targetBlockJson)
    .split('{{CONTEXT_BLOCKS_BEFORE_JSON}}').join(input.contextBlocksBeforeJson)
    .split('{{CONTEXT_BLOCKS_AFTER_JSON}}').join(input.contextBlocksAfterJson)
    .split('{{OPTIONAL_HINTS_JSON}}').join(input.optionalHintsJson);
}

export function buildTodoExtractionPrompt(
  input: TodoPromptRuntimeInput,
  sections: Partial<Record<TodoExtractionPromptSectionFile, string>> = todoExtractionPromptSections,
): string {
  const renderedSections = todoExtractionPromptManifest.map((filename) => {
    const section = sections[filename];

    if (typeof section !== 'string') {
      throw new Error(`Missing prompt section: ${filename}`);
    }

    if (filename === '80-runtime-template.md') {
      return fillRuntimeTemplate(section, input).trim();
    }

    return section.trim();
  });

  return renderedSections.join('\n\n').trim();
}
