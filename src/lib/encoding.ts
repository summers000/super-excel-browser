import type { EncodingCandidate } from '../types';

const ENCODINGS = [
  { encoding: 'utf-8', label: 'UTF-8' },
  { encoding: 'big5', label: 'Big5／CP950' },
  { encoding: 'utf-16le', label: 'UTF-16 LE' },
  { encoding: 'utf-16be', label: 'UTF-16 BE' },
  { encoding: 'gb18030', label: 'GB18030' },
  { encoding: 'windows-1252', label: 'Windows-1252' },
] as const;

function detectBom(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
  return null;
}

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0;
}

function scoreDecodedText(text: string, encoding: string, bomEncoding: string | null): Omit<EncodingCandidate, 'label'> {
  const replacementCount = countMatches(text, /�/g);
  const controlCount = countMatches(text, /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g);
  const visibleCount = Math.max(1, text.length - controlCount);
  const delimiterHits = countMatches(text.slice(0, 20000), /[,\t;|]/g);
  const lineCount = Math.max(1, countMatches(text.slice(0, 20000), /\r?\n/g));
  const chineseCount = countMatches(text, /[\u3400-\u9FFF]/g);
  const mojibakeCount = countMatches(text, /(?:Ã.|Â.|â€|ï¿½|¤|¦|¥|§)/g);

  let score = 100;
  score -= replacementCount * 18;
  score -= controlCount * 4;
  score -= mojibakeCount * 2;
  score += Math.min(15, delimiterHits / lineCount);
  score += Math.min(8, chineseCount / visibleCount * 30);
  if (bomEncoding === encoding) score += 60;
  if (encoding === 'utf-8' && replacementCount === 0) score += 8;

  return {
    encoding,
    score,
    replacementCount,
    controlCount,
    preview: text.slice(0, 1600),
  };
}

export function decodeBytes(bytes: Uint8Array, encoding: string): string {
  return new TextDecoder(encoding, { fatal: false }).decode(bytes);
}

export function detectEncodingCandidates(buffer: ArrayBuffer): EncodingCandidate[] {
  const bytes = new Uint8Array(buffer);
  const bomEncoding = detectBom(bytes);
  const sample = bytes.slice(0, Math.min(bytes.length, 256_000));

  return ENCODINGS.flatMap(({ encoding, label }) => {
    try {
      const text = decodeBytes(sample, encoding);
      return [{ ...scoreDecodedText(text, encoding, bomEncoding), label }];
    } catch {
      return [];
    }
  }).sort((a, b) => b.score - a.score);
}
