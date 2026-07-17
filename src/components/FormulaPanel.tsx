import { useState } from 'react';
import type { FilterOperator } from '../lib/analysis';
import type { DataTableModel } from '../types';

interface FormulaPanelProps {
  table: DataTableModel;
  onApply: (
    sourceColumn: string,
    operator: FilterOperator,
    comparisonValue: string,
    newColumn: string,
    trueValue: string,
    falseValue: string,
  ) => void;
}

export function FormulaPanel({ table, onApply }: FormulaPanelProps) {
  const [sourceColumn, setSourceColumn] = useState(table.columns[0] ?? '');
  const [operator, setOperator] = useState<FilterOperator>('gt');
  const [comparisonValue, setComparisonValue] = useState('');
  const [newColumn, setNewColumn] = useState('判斷結果');
  const [trueValue, setTrueValue] = useState('是');
  const [falseValue, setFalseValue] = useState('否');

  return (
    <div className="panel-content">
      <h2>新增 IF 判斷欄位</h2>
      <p className="panel-description">以圖形設定方式建立簡易 IF 欄位。</p>
      <label>來源欄位<select value={sourceColumn} onChange={(event) => setSourceColumn(event.target.value)}>{table.columns.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>條件<select value={operator} onChange={(event) => setOperator(event.target.value as FilterOperator)}>
        <option value="equals">等於</option><option value="notEquals">不等於</option><option value="contains">包含</option>
        <option value="gt">大於</option><option value="gte">大於等於</option><option value="lt">小於</option><option value="lte">小於等於</option>
        <option value="isBlank">是空值</option><option value="notBlank">不是空值</option>
      </select></label>
      {!['isBlank', 'notBlank'].includes(operator) && <label>比較值<input value={comparisonValue} onChange={(event) => setComparisonValue(event.target.value)} /></label>}
      <label>新欄位名稱<input value={newColumn} onChange={(event) => setNewColumn(event.target.value)} /></label>
      <label>符合時顯示<input value={trueValue} onChange={(event) => setTrueValue(event.target.value)} /></label>
      <label>不符合時顯示<input value={falseValue} onChange={(event) => setFalseValue(event.target.value)} /></label>
      <button className="primary full-width" disabled={!sourceColumn || !newColumn.trim()} onClick={() => onApply(sourceColumn, operator, comparisonValue, newColumn.trim(), trueValue, falseValue)}>建立計算欄位</button>
    </div>
  );
}
