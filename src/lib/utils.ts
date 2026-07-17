import type { CellValue, DataRow } from '../types';

export function createId(prefix = 'id'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function toDisplayValue(value: CellValue): string {
  if (value === null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function normalizeColumnNames(values: unknown[]): string[] {
  const used = new Map<string, number>();
  return values.map((value, index) => {
    const base = String(value ?? '').trim() || `欄位_${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

export function rowsFromMatrix(matrix: unknown[][], headerRowIndex: number): DataRow[] {
  const header = normalizeColumnNames(matrix[headerRowIndex] ?? []);
  const rows: DataRow[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
    const source = matrix[i] ?? [];
    if (source.every((value) => value === null || value === undefined || String(value).trim() === '')) {
      continue;
    }
    const row: DataRow = {};
    header.forEach((column, columnIndex) => {
      row[column] = normalizeCell(source[columnIndex]);
    });
    rows.push(row);
  }
  return rows;
}

export function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function compareCellValues(a: CellValue, b: CellValue): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const left = a instanceof Date ? a.getTime() : a;
  const right = b instanceof Date ? b.getTime() : b;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'zh-Hant', { numeric: true });
}
