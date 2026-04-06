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
  if (isCommentOnlyBlock(text) || isTrivialBlock(text)) {
    return true;
  }

  // 주석 라인을 제거한 뒤 남은 내용이 trivial이면 파싱 불필요
  const nonCommentText = stripCommentLines(text);
  return nonCommentText.length === 0 || isTrivialBlock(nonCommentText);
}

export interface CommentLineRange {
  start: number;
  end: number;
}

export function getCommentLineRanges(text: string): CommentLineRange[] {
  const ranges: CommentLineRange[] = [];
  let pos = 0;

  for (const line of text.split('\n')) {
    if (isCommentLine(line)) {
      ranges.push({ start: pos, end: pos + line.length });
    }

    pos += line.length + 1;
  }

  return ranges;
}
