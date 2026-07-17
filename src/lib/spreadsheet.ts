import * as XLSX from 'xlsx';
import type { ParsedTabularData } from '../types';
import { normalizeColumnNames, normalizeCell } from './utils';

export interface WorkbookPreview {
  sheetNames: string[];
  matrices: Record<string, unknown[][]>;
}

export function readWorkbook(buffer: ArrayBuffer): WorkbookPreview {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    dense: true,
  });
  const matrices: Record<string, unknown[][]> = {};
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    matrices[name] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    });
  }
  return { sheetNames: workbook.SheetNames, matrices };
}

export function parseWorksheet(matrix: unknown[][], headerRowIndex: number): ParsedTabularData {
  const rawHeader = matrix[headerRowIndex] ?? [];
  const columns = normalizeColumnNames(rawHeader);
  const rows = matrix.slice(headerRowIndex + 1).map((cells) => {
    const row: Record<string, ReturnType<typeof normalizeCell>> = {};
    columns.forEach((column, index) => {
      row[column] = normalizeCell(cells[index]);
    });
    return row;
  }).filter((row) => Object.values(row).some((value) => value !== null && String(value).trim() !== ''));
  return { rows, columns, rawRowCount: matrix.length, warnings: [] };
}
