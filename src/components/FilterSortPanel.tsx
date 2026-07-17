import { useState } from 'react';
import type { FilterOperator } from '../lib/analysis';
import type { DataTableModel } from '../types';

interface FilterSortPanelProps {
  table: DataTableModel;
  onFilter: (column: string, operator: FilterOperator, value: string) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
}

const FILTERS: Array<{ value: FilterOperator; label: string }> = [
  { value: 'contains', label: '包含' },
  { value: 'equals', label: '等於' },
  { value: 'notEquals', label: '不等於' },
  { value: 'gt', label: '大於' },
  { value: 'gte', label: '大於等於' },
  { value: 'lt', label: '小於' },
  { value: 'lte', label: '小於等於' },
  { value: 'isBlank', label: '是空值' },
  { value: 'notBlank', label: '不是空值' },
];

export function FilterSortPanel({ table, onFilter, onSort }: FilterSortPanelProps) {
  const [column, setColumn] = useState(table.columns[0] ?? '');
  const [operator, setOperator] = useState<FilterOperator>('contains');
  const [value, setValue] = useState('');
  const needsValue = operator !== 'isBlank' && operator !== 'notBlank';

  return (
    <div className="panel-content">
      <h2>篩選與排序</h2>
      <label>
        欄位
        <select value={column} onChange={(event) => setColumn(event.target.value)}>
          {table.columns.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="button-row">
        <button onClick={() => onSort(column, 'asc')}>由小到大</button>
        <button onClick={() => onSort(column, 'desc')}>由大到小</button>
      </div>
      <hr />
      <label>
        條件
        <select value={operator} onChange={(event) => setOperator(event.target.value as FilterOperator)}>
          {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      {needsValue && (
        <label>
          比較值
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="輸入文字、數字或日期" />
        </label>
      )}
      <button className="primary full-width" disabled={!column || (needsValue && value === '')} onClick={() => onFilter(column, operator, value)}>建立篩選結果</button>
    </div>
  );
}
