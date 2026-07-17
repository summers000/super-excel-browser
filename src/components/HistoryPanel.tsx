import type { DataTableModel } from '../types';

export function HistoryPanel({ table }: { table: DataTableModel }) {
  return (
    <div className="panel-content">
      <h2>操作歷程</h2>
      <p className="panel-description">操作歷程僅存在於目前頁面工作階段。</p>
      <ol className="history-list">
        {table.operations.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <span>{item.detail}</span>
            <small>{item.timestamp}｜{item.inputRows.toLocaleString()} → {item.outputRows.toLocaleString()} 筆</small>
          </li>
        ))}
      </ol>
    </div>
  );
}
