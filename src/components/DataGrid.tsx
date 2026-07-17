import { useMemo, useRef, useState } from 'react';
import type { DataRow } from '../types';
import { toDisplayValue } from '../lib/utils';

interface DataGridProps {
  rows: DataRow[];
  columns: string[];
}

const ROW_HEIGHT = 34;
const VIEWPORT_HEIGHT = 520;
const OVERSCAN = 8;

export function DataGrid({ rows, columns }: DataGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const visibleRows = useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex]);
  const topPadding = startIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (rows.length - endIndex) * ROW_HEIGHT);

  return (
    <div
      className="data-grid-wrap"
      ref={scrollRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      style={{ height: VIEWPORT_HEIGHT }}
    >
      <table className="data-grid">
        <thead>
          <tr>
            <th className="row-number">#</th>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {topPadding > 0 && (
            <tr aria-hidden="true"><td colSpan={columns.length + 1} style={{ height: topPadding, padding: 0, border: 0 }} /></tr>
          )}
          {visibleRows.map((row, index) => {
            const actualIndex = startIndex + index;
            return (
              <tr key={actualIndex} style={{ height: ROW_HEIGHT }}>
                <td className="row-number">{actualIndex + 1}</td>
                {columns.map((column) => {
                  const value = toDisplayValue(row[column] ?? null);
                  const suspicious = /�|(?:Ã.|Â.|â€|ï¿½)/.test(value);
                  return (
                    <td key={column} className={suspicious ? 'suspicious-cell' : ''} title={value}>
                      {value || <span className="null-value">NULL</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {bottomPadding > 0 && (
            <tr aria-hidden="true"><td colSpan={columns.length + 1} style={{ height: bottomPadding, padding: 0, border: 0 }} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
