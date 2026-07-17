import Papa from 'papaparse';
import type { ParsedTabularData } from '../types';
import { normalizeColumnNames, normalizeCell } from './utils';

const DELIMITERS = [',', '\t', ';', '|'];
const DELIMITER_SAMPLE_MAX_CHARS = 1_000_000;
const DELIMITER_SAMPLE_MAX_LINES = 25;

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      count += 1;
    }
  }
  return count;
}

function collectSampleLines(text: string): string[] {
  const lines: string[] = [];
  const limit = Math.min(text.length, DELIMITER_SAMPLE_MAX_CHARS);
  let lineStart = 0;

  for (let index = 0; index < limit && lines.length < DELIMITER_SAMPLE_MAX_LINES; index += 1) {
    const code = text.charCodeAt(index);
    if (code !== 10 && code !== 13) continue;

    const line = text.slice(lineStart, index).trim();
    if (line) lines.push(line);

    if (code === 13 && text.charCodeAt(index + 1) === 10) index += 1;
    lineStart = index + 1;
  }

  if (lines.length < DELIMITER_SAMPLE_MAX_LINES && lineStart < limit) {
    const lastLine = text.slice(lineStart, limit).trim();
    if (lastLine) lines.push(lastLine);
  }

  return lines;
}

export function detectDelimiter(text: string): string {
  // Never split the entire file. A 100 MB+ string can make RegExp.split
  // overflow the JavaScript engine's call stack or consume excessive memory.
  const lines = collectSampleLines(text);
  let best = ',';
  let bestScore = -Infinity;

  for (const delimiter of DELIMITERS) {
    const counts = lines.map((line) => countDelimiter(line, delimiter));
    const nonZero = counts.filter((count) => count > 0);
    if (!nonZero.length) continue;

    const average = nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length;
    const variance = nonZero.reduce((sum, value) => sum + (value - average) ** 2, 0) / nonZero.length;
    const score = nonZero.length * 5 + average * 2 - variance;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }

  return best;
}

export function parseDelimitedText(text: string, delimiter: string, headerRowIndex: number): ParsedTabularData {
  let rawRowCount = 0;
  let columns: string[] = [];
  const rows: ParsedTabularData['rows'] = [];
  const warnings: string[] = [];

  // The step callback avoids building a second full matrix in memory before
  // converting it to row objects. The final rows still remain in memory because
  // this MVP is a browser-only application.
  Papa.parse<string[]>(text, {
    delimiter,
    skipEmptyLines: false,
    dynamicTyping: false,
    step: (result) => {
      const rowIndex = rawRowCount;
      rawRowCount += 1;

      if (warnings.length < 20) {
        for (const error of result.errors) {
          if (warnings.length >= 20) break;
          const errorRow = typeof error.row === 'number' ? error.row + 1 : rowIndex + 1;
          warnings.push(`第 ${errorRow} 列：${error.message}`);
        }
      }

      const cells = result.data;
      if (rowIndex < headerRowIndex) return;
      if (rowIndex === headerRowIndex) {
        columns = normalizeColumnNames(cells);
        return;
      }
      if (!columns.length) return;
      if (cells.every((value) => value === null || value === undefined || String(value).trim() === '')) return;

      const row: ParsedTabularData['rows'][number] = {};
      columns.forEach((column, index) => {
        row[column] = normalizeCell(cells[index] ?? null);
      });
      rows.push(row);
    },
  });

  return { rows, columns, rawRowCount, warnings };
}
