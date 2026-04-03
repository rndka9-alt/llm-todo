import type { DirtyRegion } from '../models';

export function diffText(previousText: string, nextText: string): DirtyRegion {
  if (previousText === nextText) {
    const stableIndex = nextText.length;

    return {
      kind: 'none',
      previousRange: {
        start: stableIndex,
        end: stableIndex,
      },
      nextRange: {
        start: stableIndex,
        end: stableIndex,
      },
    };
  }

  let prefix = 0;

  while (
    prefix < previousText.length &&
    prefix < nextText.length &&
    previousText[prefix] === nextText[prefix]
  ) {
    prefix += 1;
  }

  let previousSuffix = previousText.length;
  let nextSuffix = nextText.length;

  while (
    previousSuffix > prefix &&
    nextSuffix > prefix &&
    previousText[previousSuffix - 1] === nextText[nextSuffix - 1]
  ) {
    previousSuffix -= 1;
    nextSuffix -= 1;
  }

  const previousLength = previousSuffix - prefix;
  const nextLength = nextSuffix - prefix;
  let kind: DirtyRegion['kind'] = 'replace';

  if (previousLength === 0 && nextLength > 0) {
    kind = 'insert';
  } else if (previousLength > 0 && nextLength === 0) {
    kind = 'delete';
  }

  return {
    kind,
    previousRange: {
      start: prefix,
      end: previousSuffix,
    },
    nextRange: {
      start: prefix,
      end: nextSuffix,
    },
  };
}
