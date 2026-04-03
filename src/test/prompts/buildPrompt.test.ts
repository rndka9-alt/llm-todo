import { describe, expect, it } from 'vitest';
import {
  buildTodoExtractionPrompt,
  todoExtractionPromptSections,
} from '../../prompts/todo-extraction/buildPrompt';
import { todoExtractionPromptManifest } from '../../prompts/todo-extraction/manifest';

const runtimeInput = {
  currentTimeIso: '2026-04-03T12:34:56.000Z',
  targetBlockJson: '{"id":"block-1"}',
  contextBlocksBeforeJson: '[]',
  contextBlocksAfterJson: '[]',
  optionalHintsJson: '{"noteTitle":"Test"}',
};

describe('buildTodoExtractionPrompt', () => {
  it('builds sections in manifest order', () => {
    const prompt = buildTodoExtractionPrompt(runtimeInput);

    const indexes = todoExtractionPromptManifest.map((filename) => {
      const section = todoExtractionPromptSections[filename].trim().split('\n')[0] ?? '';

      return prompt.indexOf(section);
    });

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
  });

  it('fails when a manifest section is missing', () => {
    const { ['40-extraction-rules.md']: omittedSection, ...incompleteSections } =
      todoExtractionPromptSections;

    expect(omittedSection.length).toBeGreaterThan(0);

    expect(() =>
      buildTodoExtractionPrompt(runtimeInput, incompleteSections),
    ).toThrowError('Missing prompt section: 40-extraction-rules.md');
  });

  it('replaces runtime placeholders exactly once at build time', () => {
    const prompt = buildTodoExtractionPrompt(runtimeInput);

    expect(prompt).toContain(runtimeInput.currentTimeIso);
    expect(prompt).toContain(runtimeInput.targetBlockJson);
    expect(prompt).toContain(runtimeInput.optionalHintsJson);
    expect(prompt).not.toContain('{{TARGET_BLOCK_JSON}}');
  });

  it('includes the Korean TODO title instruction', () => {
    const prompt = buildTodoExtractionPrompt(runtimeInput);

    expect(prompt).toContain('Every `title` must be written in natural Korean.');
    expect(prompt).toContain(
      'Always write normalized TODO `title` values in natural Korean, even when the source block is written in English or mixed language.',
    );
  });
});
