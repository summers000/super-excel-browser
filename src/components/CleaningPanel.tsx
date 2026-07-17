import { useState } from 'react';
import type { CleaningOperation } from '../lib/cleaning';
import type { DataTableModel } from '../types';

interface CleaningPanelProps {
  table: DataTableModel;
  onApply: (column: string, operation: CleaningOperation) => void;
}

const OPERATIONS: Array<{ value: CleaningOperation; label: string; description: string }> = [
  { value: 'trim', label: '移除前後空白', description: '移除半形與一般前後空白。' },
  { value: 'collapseSpaces', label: '合併空白', description: '將連續空白、全形空白、Tab 與換行合併。' },
  { value: 'fullWidthToHalfWidth', label: '全形轉半形', description: '適合編號、英文與數字比對前標準化。' },
  { value: 'removeControls', label: '移除控制字元', description: '清除不可見控制字元，但保留可見文字。' },
  { value: 'uppercase', label: '英文轉大寫', description: '統一英文大小寫。' },
  { value: 'lowercase', label: '英文轉小寫', description: '統一英文大小寫。' },
  { value: 'nullTokens', label: '空值代碼轉 NULL', description: '將 NULL、N/A、NA、-、(blank) 等轉為空值。' },
  { value: 'numberNormalize', label: '數值標準化', description: '處理千分位、貨幣符號、括號負數與百分比。' },
];

export function CleaningPanel({ table, onApply }: CleaningPanelProps) {
  const [column, setColumn] = useState(table.columns[0] ?? '');
  const [operation, setOperation] = useState<CleaningOperation>('trim');
  const selected = OPERATIONS.find((item) => item.value === operation);

  return (
    <div className="panel-content">
      <h2>資料清洗</h2>
      <p className="panel-description">清洗後會建立新的衍生資料表，不會覆蓋原始資料。</p>
      <label>
        目標欄位
        <select value={column} onChange={(event) => setColumn(event.target.value)}>
          {table.columns.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        清洗方式
        <select value={operation} onChange={(event) => setOperation(event.target.value as CleaningOperation)}>
          {OPERATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <div className="info-box">{selected?.description}</div>
      <button className="primary full-width" disabled={!column} onClick={() => onApply(column, operation)}>建立清洗結果</button>
    </div>
  );
}
