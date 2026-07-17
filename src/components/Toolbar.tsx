import type { PanelMode, WorkspaceView } from '../types';

interface ToolbarProps {
  onOpenFile: () => void;
  onModeChange: (mode: PanelMode) => void;
  onWorkspaceChange: (view: WorkspaceView) => void;
  workspaceView: WorkspaceView;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onClear: () => void;
  hasActiveTable: boolean;
  tableCount: number;
}

export function Toolbar({
  onOpenFile,
  onModeChange,
  onWorkspaceChange,
  workspaceView,
  onExportCsv,
  onExportXlsx,
  onClear,
  hasActiveTable,
  tableCount,
}: ToolbarProps) {
  function openDataPanel(mode: PanelMode) {
    onWorkspaceChange('data');
    onModeChange(mode);
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <div className="brand-mark">SE</div>
        <div>
          <strong>Super Excel Browser</strong>
          <span>本機資料分析工作台</span>
        </div>
      </div>
      <div className="toolbar-actions">
        <button className="primary" onClick={onOpenFile}>開啟檔案</button>
        <button
          className={workspaceView === 'data' ? 'toolbar-active' : ''}
          disabled={!hasActiveTable}
          onClick={() => onWorkspaceChange('data')}
        >
          資料表
        </button>
        <button
          className={workspaceView === 'model' ? 'toolbar-active' : ''}
          disabled={tableCount < 2}
          onClick={() => onWorkspaceChange('model')}
        >
          資料模型
        </button>
        <button disabled={!hasActiveTable} onClick={() => openDataPanel('quality')}>資料品質</button>
        <button disabled={!hasActiveTable} onClick={() => openDataPanel('clean')}>資料清洗</button>
        <button disabled={!hasActiveTable} onClick={() => openDataPanel('filter')}>篩選／排序</button>
        <button disabled={!hasActiveTable} onClick={() => openDataPanel('formula')}>IF 欄位</button>
        <button disabled={!hasActiveTable || tableCount < 2} onClick={() => openDataPanel('join')}>快速 Join</button>
        <button disabled={!hasActiveTable} onClick={() => openDataPanel('pivot')}>樞紐分析</button>
        <div className="toolbar-divider" />
        <button disabled={!hasActiveTable} onClick={onExportCsv}>匯出 CSV</button>
        <button disabled={!hasActiveTable} onClick={onExportXlsx}>匯出 Excel</button>
        <button className="danger-text" disabled={!hasActiveTable} onClick={onClear}>清除工作階段</button>
      </div>
    </header>
  );
}
