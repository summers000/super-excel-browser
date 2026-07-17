import { describe, expect, it } from 'vitest';
import { diagnoseJoin, joinRows, pivotRows } from '../lib/analysis';
import { cleanValue } from '../lib/cleaning';
import { profileTable } from '../lib/profile';

const sales = [
  { vendor: 'V001', category: 'A', amount: 100 },
  { vendor: 'V002', category: 'A', amount: 200 },
  { vendor: 'V001', category: 'B', amount: 300 },
];

const vendors = [
  { code: 'V001', name: '甲公司' },
  { code: 'V002', name: '乙公司' },
];

describe('analysis', () => {
  it('performs a left join', () => {
    const rows = joinRows(sales, vendors, 'vendor', 'code', 'left', ['name']);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.name).toBe('甲公司');
  });

  it('warns about many-to-many risk', () => {
    const right = [...vendors, { code: 'V001', name: '甲公司分店' }];
    const diagnostic = diagnoseJoin(sales, right, 'vendor', 'code');
    expect(diagnostic.manyToManyRisk).toBe(true);
  });

  it('creates a pivot result', () => {
    const result = pivotRows(sales, 'category', null, 'amount', 'sum');
    expect(result.rows.find((row) => row.category === 'A')?.['值']).toBe(300);
  });
});

describe('cleaning and profile', () => {
  it('normalizes full-width identifiers', () => {
    expect(cleanValue(' Ｖ００１ ', 'fullWidthToHalfWidth')).toBe(' V001 ');
  });

  it('converts accounting negative values', () => {
    expect(cleanValue('(125,000)', 'numberNormalize')).toBe(-125000);
  });

  it('preserves leading-zero identifier columns as text', () => {
    const profile = profileTable([{ 供應商編號: '00123' }], ['供應商編號'])[0];
    expect(profile?.inferredType).toBe('string');
  });
});
