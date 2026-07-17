import { describe, expect, it } from 'vitest';
import { decodeBytes, detectEncodingCandidates } from '../lib/encoding';

const BIG5_SAMPLE = new Uint8Array([
  168,209,192,179,176,211,189,115,184,185,44,168,209,192,179,176,211,166,87,186,217,10,
  86,48,48,49,44,167,187,176,242,170,209,165,247,166,179,173,173,164,189,165,113,10,
]);

describe('encoding', () => {
  it('decodes Big5 text in browsers with Encoding API support', () => {
    expect(decodeBytes(BIG5_SAMPLE, 'big5')).toContain('供應商編號');
  });

  it('ranks Big5 as a strong candidate for Big5 Chinese bytes', () => {
    const candidates = detectEncodingCandidates(BIG5_SAMPLE.buffer);
    expect(candidates.slice(0, 2).some((candidate) => candidate.encoding === 'big5')).toBe(true);
  });
});
