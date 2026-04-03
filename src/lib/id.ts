const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createId(seed: string, nonce: number): string {
  let hash = 2166136261;

  for (const character of `${seed}:${nonce}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  let value = Math.abs(hash);
  let output = '';

  while (output.length < 10) {
    const index = value % alphabet.length;
    output += alphabet[index];
    value = Math.floor(value / alphabet.length) ^ 97;
  }

  return output;
}

export function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  return cleaned.length > 0 ? cleaned : 'item';
}
