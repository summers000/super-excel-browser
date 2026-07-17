import { useMemo, useState } from 'react';
import { diagnoseJoin } from '../lib/analysis';
import type { DataTableModel } from '../types';

interface JoinPanelProps {
  tables: DataTableModel[];
  activeTable: DataTableModel;
  onApply: (rightTableId: string, leftKey: string, rightKey: string, mode: 'left' | 'inner', rightColumns: string[]) => void;
}

export function JoinPanel({ tables, activeTable, onApply }: JoinPanelProps) {
  const otherTables = tables.filter((table) => table.id !== activeTable.id);
  const [rightTableId, setRightTableId] = useState(otherTables[0]?.id ?? '');
  const rightTable = otherTables.find((table) => table.id === rightTableId);
  const [leftKey, setLeftKey] = useState(activeTable.columns[0] ?? '');
  const [rightKey, setRightKey] = useState(rightTable?.columns[0] ?? '');
  const [mode, setMode] = useState<'left' | 'inner'>('left');
  const [rightColumns, setRightColumns] = useState<string[]>([]);
  const diagnostics = useMemo(
    () => rightTable && leftKey && rightKey ? diagnoseJoin(activeTable.rows, rightTable.rows, leftKey, rightKey) : null,
    [activeTable.rows, rightTable, leftKey, rightKey],
  );

  function chooseTable(id: string) {
    setRightTableId(id);
    const selected = otherTables.find((table) => table.id === id);
    setRightKey(selected?.columns[0] ?? '');
    setRightColumns([]);
  }

  if (!otherTables.length) {
    return <div className="panel-content"><h2>Join 資料表</h2><div className="info-box warning">請先匯入第二份資料表。</div></div>;
  }

  return (
    <div className="panel-content">
      <h2>Join 資料表</h2>
      <p className="panel-description">目前版本支援單欄 Left Join 與 Inner Join，並在執行前檢查重複鍵風險。</p>
      <label>對照資料表<select value={rightTableId} onChange={(event) => chooseTable(event.target.value)}>{otherTables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label>
      <label>主要表比對欄位<select value={leftKey} onChange={(event) => setLeftKey(event.target.value)}>{activeTable.columns.map((column) => <option key={column}>{column}</option>)}</select></label>
      <label>對照表比對欄位<select value={rightKey} onChange={(event) => setRightKey(event.target.value)}>{rightTable?.columns.map((column) => <option key={column}>{column}</option>)}</select></label>
      <label>Join 類型<select value={mode} onChange={(event) => setMode(event.target.value as 'left' | 'inner')}><option value="left">保留主要表全部資料</option><option value="inner">只保留兩邊都有的資料</option></select></label>
      <fieldset>
        <legend>要帶入的欄位</legend>
        <div className="checkbox-list">
          {rightTable?.columns.filter((column) => column !== rightKey).map((column) => (
            <label className="checkbox" key={column}>
              <input type="checkbox" checked={rightColumns.includes(column)} onChange={(event) => setRightColumns((current) => event.target.checked ? [...current, column] : current.filter((item) => item !== column))} />
              {column}
            </label>
          ))}
        </div>
      </fieldset>
      {diagnostics && (
        <div className={`info-box ${diagnostics.manyToManyRisk ? 'warning' : ''}`}>
          主要表重複鍵：{diagnostics.leftDuplicateKeys.toLocaleString()}；對照表重複鍵：{diagnostics.rightDuplicateKeys.toLocaleString()}。
          {diagnostics.manyToManyRisk && <><br /><strong>兩邊都有重複鍵，結果可能形成多對多並大幅增加筆數。</strong></>}
        </div>
      )}
      <button className="primary full-width" disabled={!rightTable || !leftKey || !rightKey || !rightColumns.length} onClick={() => onApply(rightTableId, leftKey, rightKey, mode, rightColumns)}>執行 Join</button>
    </div>
  );
}
