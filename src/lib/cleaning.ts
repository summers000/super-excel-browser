import type { CellValue, DataRow } from '../types';

export type CleaningOperation =
  | 'trim'
  | 'collapseSpaces'
  | 'fullWidthToHalfWidth'
  | 'removeControls'
  | 'uppercase'
  | 'lowercase'
  | 'nullTokens'
  | 'numberNormalize';

function fullWidthToHalfWidth(text: string): string {
  return text.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replaceAll('　', ' ');
}

export function cleanValue(value: CellValue, operation: CleaningOperation): CellValue {
  if (value === null || value instanceof Date || typeof value === 'boolean') return value;
  const text = String(value);
  switch (operation) {
    case 'trim':
      return text.trim();
    case 'collapseSpaces':
      return text.replace(/[\s\u00A0\u3000]+/g, ' ').trim();
    case 'fullWidthToHalfWidth':
      return fullWidthToHalfWidth(text);
    case 'removeControls':
      return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'nullTokens': {
      const normalized = text.trim().toUpperCase();
      return ['', 'NULL', 'N/A', 'NA', '-', '(BLANK)'].includes(normalized) ? null : value;
    }
    case 'numberNormalize': {
      const normalized = text.trim();
      const negative = /^\(.*\)$/.test(normalized);
      const stripped = normalized
        .replace(/^\((.*)\)$/, '$1')
        .replace(/(?:NT\$|TWD|USD|US\$|[$€£¥])/gi, '')
        .replaceAll(',', '')
        .replace(/%$/, '')
        .trim();
      const numeric = Number(stripped);
      if (!Number.isFinite(numeric)) return value;
      const percent = normalized.endsWith('%') ? numeric / 100 : numeric;
      return negative ? -percent : percent;
    }
  }
}

export function cleanColumn(rows: DataRow[], column: string, operation: CleaningOperation): DataRow[] {
  return rows.map((row) => ({ ...row, [column]: cleanValue(row[column] ?? null, operation) }));
}
