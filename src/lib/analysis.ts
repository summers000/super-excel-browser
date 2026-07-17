import type { CellValue, DataRow } from '../types';
import { compareCellValues, toDisplayValue } from './utils';

export type FilterOperator = 'contains' | 'equals' | 'notEquals' | 'gt' | 'gte' | 'lt' | 'lte' | 'isBlank' | 'notBlank';
export type Aggregate = 'sum' | 'average' | 'count' | 'countDistinct' | 'min' | 'max';

function numericValue(value: CellValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replaceAll(',', '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function filterRows(rows: DataRow[], column: string, operator: FilterOperator, input: string): DataRow[] {
  const target = input.trim();
  return rows.filter((row) => {
    const value = row[column] ?? null;
    const text = toDisplayValue(value);
    if (operator === 'isBlank') return value === null || text.trim() === '';
    if (operator === 'notBlank') return value !== null && text.trim() !== '';
    if (operator === 'contains') return text.toLocaleLowerCase('zh-Hant').includes(target.toLocaleLowerCase('zh-Hant'));
    if (operator === 'equals') return text === target;
    if (operator === 'notEquals') return text !== target;
    const left = numericValue(value) ?? Date.parse(text);
    const numericTarget = Number(target);
    const right = Number.isFinite(numericTarget) ? numericTarget : Date.parse(target);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    if (operator === 'lt') return left < right;
    return left <= right;
  });
}

export function sortRows(rows: DataRow[], column: string, direction: 'asc' | 'desc'): DataRow[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => compareCellValues(a[column] ?? null, b[column] ?? null) * factor);
}

export function addIfColumn(
  rows: DataRow[],
  sourceColumn: string,
  operator: FilterOperator,
  comparisonValue: string,
  newColumn: string,
  trueValue: string,
  falseValue: string,
): DataRow[] {
  return rows.map((row) => {
    const matched = filterRows([row], sourceColumn, operator, comparisonValue).length === 1;
    return { ...row, [newColumn]: matched ? trueValue : falseValue };
  });
}

function keyOf(value: CellValue): string {
  if (value === null) return '__NULL__';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export interface JoinDiagnostics {
  leftDuplicateKeys: number;
  rightDuplicateKeys: number;
  manyToManyRisk: boolean;
}

function duplicateKeyCount(rows: DataRow[], column: string): number {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row[column] ?? null);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

export function diagnoseJoin(left: DataRow[], right: DataRow[], leftKey: string, rightKey: string): JoinDiagnostics {
  const leftDuplicateKeys = duplicateKeyCount(left, leftKey);
  const rightDuplicateKeys = duplicateKeyCount(right, rightKey);
  return {
    leftDuplicateKeys,
    rightDuplicateKeys,
    manyToManyRisk: leftDuplicateKeys > 0 && rightDuplicateKeys > 0,
  };
}

export function joinRows(
  left: DataRow[],
  right: DataRow[],
  leftKey: string,
  rightKey: string,
  mode: 'left' | 'inner',
  rightColumns: string[],
): DataRow[] {
  const index = new Map<string, DataRow[]>();
  for (const row of right) {
    const key = keyOf(row[rightKey] ?? null);
    const bucket = index.get(key) ?? [];
    bucket.push(row);
    index.set(key, bucket);
  }
  const output: DataRow[] = [];
  for (const leftRow of left) {
    const matches = index.get(keyOf(leftRow[leftKey] ?? null)) ?? [];
    if (!matches.length && mode === 'left') {
      const joined: DataRow = { ...leftRow };
      rightColumns.forEach((column) => {
        const targetName = column in joined ? `${column}_對照表` : column;
        joined[targetName] = null;
      });
      output.push(joined);
      continue;
    }
    for (const rightRow of matches) {
      const joined: DataRow = { ...leftRow };
      rightColumns.forEach((column) => {
        const targetName = column in joined ? `${column}_對照表` : column;
        joined[targetName] = rightRow[column] ?? null;
      });
      output.push(joined);
    }
  }
  return output;
}

function aggregate(values: CellValue[], type: Aggregate): CellValue {
  if (type === 'count') return values.length;
  if (type === 'countDistinct') return new Set(values.map(keyOf)).size;
  const numeric = values.map(numericValue).filter((value): value is number => value !== null);
  const firstValue = numeric[0];
  if (firstValue === undefined) return null;
  if (type === 'sum') return numeric.reduce((sum, value) => sum + value, 0);
  if (type === 'average') return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
  if (type === 'min') {
    return numeric.reduce(
      (minimum, value) => (value < minimum ? value : minimum),
      firstValue,
    );
  }
  return numeric.reduce(
    (maximum, value) => (value > maximum ? value : maximum),
    firstValue,
  );
}

export function pivotRows(
  rows: DataRow[],
  rowField: string,
  columnField: string | null,
  valueField: string,
  aggregateType: Aggregate,
): { rows: DataRow[]; columns: string[] } {
  const grouped = new Map<string, Map<string, CellValue[]>>();
  const columnKeys = new Set<string>();
  for (const row of rows) {
    const rowKey = keyOf(row[rowField] ?? null);
    const columnKey = columnField ? keyOf(row[columnField] ?? null) : '值';
    columnKeys.add(columnKey);
    const rowMap = grouped.get(rowKey) ?? new Map<string, CellValue[]>();
    const values = rowMap.get(columnKey) ?? [];
    values.push(row[valueField] ?? null);
    rowMap.set(columnKey, values);
    grouped.set(rowKey, rowMap);
  }
  const orderedColumns = [...columnKeys].sort((a, b) => a.localeCompare(b, 'zh-Hant', { numeric: true }));
  const output = [...grouped.entries()].map(([rowKey, map]) => {
    const result: DataRow = { [rowField]: rowKey === '__NULL__' ? null : rowKey };
    orderedColumns.forEach((columnKey) => {
      result[columnKey] = aggregate(map.get(columnKey) ?? [], aggregateType);
    });
    return result;
  });
  return { rows: output, columns: [rowField, ...orderedColumns] };
}
