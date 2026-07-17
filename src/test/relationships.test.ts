import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEY_NORMALIZATION,
  executeRelationshipJoin,
  validateRelationship,
} from '../lib/relationships';
import type { DataTableModel, TableRelationship } from '../types';

function table(id: string, name: string, rows: Array<Record<string, string | number | null>>): DataTableModel {
  const columns = Object.keys(rows[0] ?? {});
  return {
    id,
    name,
    sourceFile: `${name}.csv`,
    rows,
    columns,
    profiles: columns.map((column) => ({
      name: column,
      inferredType: 'string',
      totalCount: rows.length,
      nonNullCount: rows.filter((row) => row[column] !== null).length,
      nullCount: rows.filter((row) => row[column] === null).length,
      emptyStringCount: 0,
      whitespaceOnlyCount: 0,
      uniqueCount: new Set(rows.map((row) => String(row[column]))).size,
      duplicateCount: 0,
      invalidCount: 0,
      suspiciousTextCount: 0,
      commonValues: [],
    })),
    operations: [],
    keyDefinitions: [],
  };
}

function relationship(overrides: Partial<TableRelationship> = {}): TableRelationship {
  return {
    id: 'r1',
    name: '交易 → 供應商',
    primaryTableId: 'transactions',
    secondaryTableId: 'vendors',
    keyMappings: [{
      id: 'm1',
      primaryColumn: 'vendorCode',
      secondaryColumn: 'code',
      normalization: { ...DEFAULT_KEY_NORMALIZATION },
    }],
    joinType: 'left',
    selectedSecondaryColumns: ['name'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('relationship model', () => {
  it('normalizes whitespace, width, and case before matching', () => {
    const primary = table('transactions', '交易', [
      { vendorCode: ' ｖ００１ ', amount: 100 },
    ]);
    const secondary = table('vendors', '供應商', [
      { code: 'V001', name: '甲公司' },
    ]);
    const result = executeRelationshipJoin(relationship(), primary, secondary);
    expect(result.rows[0]?.name).toBe('甲公司');
  });

  it('supports composite keys', () => {
    const primary = table('transactions', '交易', [
      { company: 'A', vendorCode: '001', amount: 100 },
      { company: 'B', vendorCode: '001', amount: 200 },
    ]);
    const secondary = table('vendors', '供應商', [
      { companyCode: 'A', code: '001', name: '甲公司' },
      { companyCode: 'B', code: '001', name: '乙公司' },
    ]);
    const relation = relationship({
      keyMappings: [
        {
          id: 'm0',
          primaryColumn: 'company',
          secondaryColumn: 'companyCode',
          normalization: { ...DEFAULT_KEY_NORMALIZATION },
        },
        {
          id: 'm1',
          primaryColumn: 'vendorCode',
          secondaryColumn: 'code',
          normalization: { ...DEFAULT_KEY_NORMALIZATION },
        },
      ],
    });
    const result = executeRelationshipJoin(relation, primary, secondary);
    expect(result.rows.map((row) => row.name)).toEqual(['甲公司', '乙公司']);
  });

  it('detects many-to-many relationships and output expansion', () => {
    const primary = table('transactions', '交易', [
      { vendorCode: 'V1', amount: 100 },
      { vendorCode: 'V1', amount: 200 },
    ]);
    const secondary = table('vendors', '供應商', [
      { code: 'V1', name: '甲公司' },
      { code: 'V1', name: '甲公司別名' },
    ]);
    const validation = validateRelationship(relationship(), primary, secondary);
    expect(validation.cardinality).toBe('many-to-many');
    expect(validation.estimatedOutputRows).toBe(4);
    expect(validation.rowExpansionRisk).toBe(true);
  });

  it('supports left anti join', () => {
    const primary = table('transactions', '交易', [
      { vendorCode: 'V1', amount: 100 },
      { vendorCode: 'V2', amount: 200 },
    ]);
    const secondary = table('vendors', '供應商', [
      { code: 'V1', name: '甲公司' },
    ]);
    const result = executeRelationshipJoin(
      relationship({ joinType: 'leftAnti', selectedSecondaryColumns: [] }),
      primary,
      secondary,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.vendorCode).toBe('V2');
  });

  it('supports full join with unmatched secondary rows', () => {
    const primary = table('transactions', '交易', [
      { vendorCode: 'V1', amount: 100 },
    ]);
    const secondary = table('vendors', '供應商', [
      { code: 'V1', name: '甲公司' },
      { code: 'V2', name: '乙公司' },
    ]);
    const result = executeRelationshipJoin(
      relationship({ joinType: 'full' }),
      primary,
      secondary,
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]?.vendorCode).toBeNull();
    expect(result.rows[1]?.name).toBe('乙公司');
  });
});
