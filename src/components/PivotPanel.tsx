import { useState } from 'react';
import type { Aggregate } from '../lib/analysis';
import type { DataTableModel } from '../types';

interface PivotPanelProps {
  table: DataTableModel;
  onApply: (rowField: string, columnField: string | null, valueField: string, aggregate: Aggregate) => void;
}

export function PivotPanel({ table, onApply }: PivotPanelProps) {
  const [rowField, setRowField] = useState(table.columns[0] ?? '');
  const [columnField, setColumnField] = useState('');
  const [valueField, setValueField] = useState(table.columns[1] ?? table.columns[0] ?? '');
  const [aggregate, setAggregate] = useState<Aggregate>('sum');

  return (
    <div className="panel-content">
      <h2>樞紐分析</h2>
      <p className="panel-description">選擇列、欄、值與彙總方式，結果會建立成新的資料表。</p>
      <label>列欄位<select value={rowField} onChange={(event) => setRowField(event.target.value)}>{table.columns.map((column) => <option key={column}>{column}</option>)}</select></label>
      <label>欄欄位（可留空）<select value={columnField} onChange={(event) => setColumnField(event.target.value)}><option value="">不使用欄分類</option>{table.columns.filter((column) => column !== rowField).map((column) => <option key={column}>{column}</option>)}</select></label>
      <label>值欄位<select value={valueField} onChange={(event) => setValueField(event.target.value)}>{table.columns.map((column) => <option key={column}>{column}</option>)}</select></label>
      <label>彙總方式<select value={aggregate} onChange={(event) => setAggregate(event.target.value as Aggregate)}>
        <option value="sum">加總</option><option value="average">平均</option><option value="count">筆數</option><option value="countDistinct">不重複筆數</option><option value="min">最小值</option><option value="max">最大值</option>
      </select></label>
      <button className="primary full-width" disabled={!rowField || !valueField} onClick={() => onApply(rowField, columnField || null, valueField, aggregate)}>建立樞紐結果</button>
    </div>
  );
}
