import type { CellValue, ColumnProfile, DataRow, InferredType } from '../types';
import { toDisplayValue } from './utils';

const NULL_TOKENS = new Set(['NULL', 'N/A', 'NA', '(BLANK)']);
const ID_COLUMN_HINT = /(編號|代碼|帳號|id|no\.?|code|key)/i;
const LARGE_TABLE_THRESHOLD = 250_000;
const LARGE_TABLE_DISTINCT_LIMIT = 20_000;
const DEFAULT_DISTINCT_LIMIT = 100_000;

function classifyValue(value: CellValue, columnName: string): Exclude<InferredType, 'mixed' | 'empty'> | 'empty' {
  if (value === null) return 'empty';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return 'date';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';
  const text = String(value).trim();
  if (!text || NULL_TOKENS.has(text.toUpperCase())) return 'empty';
  if (ID_COLUMN_HINT.test(columnName)) return 'string';
  if (/^(true|false|是|否|yes|no)$/i.test(text)) return 'boolean';
  if (/^[+-]?\d+$/.test(text) && !/^0\d+/.test(text)) return 'integer';
  if (/^[+-]?(?:\d+\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text)) return 'decimal';
  if (/^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(text)) return 'date';
  return 'string';
}

export function inferColumnType(rows: DataRow[], columnName: string): InferredType {
  const counts = new Map<string, number>();
  for (const row of rows.slice(0, 2000)) {
    const type = classifyValue(row[columnName] ?? null, columnName);
    if (type !== 'empty') counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  if (!counts.size) return 'empty';
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = ordered.reduce((sum, [, count]) => sum + count, 0);
  const [dominantType, dominantCount] = ordered[0] ?? ['string', 0];
  if (ordered.length === 1 || dominantCount / total >= 0.9) return dominantType as InferredType;
  if (counts.has('integer') && counts.has('decimal') && counts.size === 2) return 'decimal';
  return 'mixed';
}

function isSuspiciousText(text: string): boolean {
  return /�|(?:Ã.|Â.|â€|ï¿½)|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text);
}

export function profileTable(rows: DataRow[], columns: string[]): ColumnProfile[] {
  const distinctLimit = rows.length >= LARGE_TABLE_THRESHOLD
    ? LARGE_TABLE_DISTINCT_LIMIT
    : DEFAULT_DISTINCT_LIMIT;

  return columns.map((name) => {
    const inferredType = inferColumnType(rows, name);
    const frequency = new Map<string, number>();
    let uniqueCountIsLowerBound = false;
    let nullCount = 0;
    let emptyStringCount = 0;
    let whitespaceOnlyCount = 0;
    let invalidCount = 0;
    let suspiciousTextCount = 0;
    let numericCount = 0;
    let numericSum = 0;
    let numericMin = Number.POSITIVE_INFINITY;
    let numericMax = Number.NEGATIVE_INFINITY;
    let dateMin = Number.POSITIVE_INFINITY;
    let dateMax = Number.NEGATIVE_INFINITY;

    for (const row of rows) {
      const value = row[name] ?? null;
      if (value === null) {
        nullCount += 1;
        continue;
      }

      const display = toDisplayValue(value);
      if (display === '') emptyStringCount += 1;
      if (display !== '' && display.trim() === '') whitespaceOnlyCount += 1;
      if (isSuspiciousText(display)) suspiciousTextCount += 1;

      const existingCount = frequency.get(display);
      if (existingCount !== undefined) {
        frequency.set(display, existingCount + 1);
      } else if (frequency.size < distinctLimit) {
        frequency.set(display, 1);
      } else {
        uniqueCountIsLowerBound = true;
      }

      if (inferredType === 'integer' || inferredType === 'decimal') {
        const numeric = typeof value === 'number' ? value : Number(display.replaceAll(',', ''));
        if (Number.isFinite(numeric)) {
          numericCount += 1;
          numericSum += numeric;
          if (numeric < numericMin) numericMin = numeric;
          if (numeric > numericMax) numericMax = numeric;
        } else if (display.trim()) {
          invalidCount += 1;
        }
      }

      if (inferredType === 'date') {
        const time = value instanceof Date ? value.getTime() : Date.parse(display);
        if (Number.isFinite(time)) {
          if (time < dateMin) dateMin = time;
          if (time > dateMax) dateMax = time;
        } else if (display.trim()) {
          invalidCount += 1;
        }
      }
    }

    const nonNullCount = rows.length - nullCount;
    const uniqueCount = frequency.size;
    const duplicateCount = [...frequency.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    const commonValues = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    let min: number | string | undefined;
    let max: number | string | undefined;
    let average: number | undefined;

    if (numericCount > 0) {
      min = numericMin;
      max = numericMax;
      average = numericSum / numericCount;
    } else if (Number.isFinite(dateMin) && Number.isFinite(dateMax)) {
      min = new Date(dateMin).toISOString();
      max = new Date(dateMax).toISOString();
    }

    return {
      name,
      inferredType,
      totalCount: rows.length,
      nonNullCount,
      nullCount,
      emptyStringCount,
      whitespaceOnlyCount,
      uniqueCount,
      uniqueCountIsLowerBound,
      duplicateCount,
      invalidCount,
      suspiciousTextCount,
      min,
      max,
      average,
      commonValues,
    };
  });
}
