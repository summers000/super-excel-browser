import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CellValue, DataRow } from '../types';

function safeCell(value: CellValue): CellValue {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return `'${value}`;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function safeRows(rows: DataRow[], columns: string[]): Record<string, CellValue>[] {
  return rows.map((row) => Object.fromEntries(columns.map((column) => [column, safeCell(row[column] ?? null)])));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(rows: DataRow[], columns: string[], filename: string): void {
  const csv = Papa.unparse(safeRows(rows, columns), { columns, newline: '\r\n' });
  downloadBlob(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportXlsx(rows: DataRow[], columns: string[], filename: string): void {
  const sheet = XLSX.utils.json_to_sheet(safeRows(rows, columns), { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '分析結果');
  XLSX.writeFile(workbook, filename, { compression: true });
}
