const COMMENT_PREFIX_PATTERN = /^\s*\/\//;

/**
 * 구분선/장식 문자만으로 이루어진 블록 — LLM에 보낼 의미 있는 내용 없음
 */
const TRIVIAL_BLOCK_PATTERN = /^[\s.,:;\-_=\/\\|~*#@!?+<>\[\](){}'"`^&$%]+$/;

export function isCommentLine(line: string): boolean {
  return COMMENT_PREFIX_PATTERN.test(line);
}

export function isCommentOnlyBlock(text: string): boolean {
  const lines = text.split('\n');
  return lines.every((line) => line.trim() === '' || isCommentLine(line));
}

export function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !isCommentLine(line))
    .join('\n');
}

export function isTrivialBlock(text: string): boolean {
  return TRIVIAL_BLOCK_PATTERN.test(text);
}

export function shouldSkipParsing(text: string): boolean {
  return isCommentOnlyBlock(text) || isTrivialBlock(text);
}
