import type { DataTableModel } from '../types';

interface SidebarProps {
  tables: DataTableModel[];
  activeTableId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function Sidebar({ tables, activeTableId, onSelect, onRemove }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="section-heading">
        <span>資料來源</span>
        <span className="badge">{tables.length}</span>
      </div>
      <div className="table-list">
        {tables.map((table) => {
          const warningCount = table.profiles.reduce(
            (sum, profile) => sum + profile.invalidCount + profile.suspiciousTextCount,
            0,
          );
          return (
            <button
              key={table.id}
              className={`table-card ${activeTableId === table.id ? 'active' : ''}`}
              onClick={() => onSelect(table.id)}
            >
              <div className="table-card-title">
                <span title={table.name}>{table.name}</span>
                <button
                  className="icon-button"
                  title="移除此資料表"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(table.id);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="table-card-meta">
                <span>{table.rows.length.toLocaleString()} 筆</span>
                <span>{table.columns.length} 欄</span>
              </div>
              <div className="table-card-meta">
                <span>{table.encoding ?? table.sourceSheet ?? 'Excel'}</span>
                <span className={warningCount ? 'warning-text' : 'success-text'}>
                  {warningCount ? `${warningCount} 項警示` : '未見明顯異常'}
                </span>
              </div>
            </button>
          );
        })}
        {!tables.length && (
          <div className="empty-sidebar">
            尚未匯入資料。
            <br />
            請從上方「開啟檔案」開始。
          </div>
        )}
      </div>
      <div className="privacy-note">
        檔案只在目前瀏覽器頁面中處理，不會上傳至伺服器。
      </div>
    </aside>
  );
}
