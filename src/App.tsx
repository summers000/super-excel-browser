import { useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { DataGrid } from './components/DataGrid';
import { ImportWizard } from './components/ImportWizard';
import { ProfilePanel } from './components/ProfilePanel';
import { CleaningPanel } from './components/CleaningPanel';
import { FilterSortPanel } from './components/FilterSortPanel';
import { FormulaPanel } from './components/FormulaPanel';
import { JoinPanel } from './components/JoinPanel';
import { PivotPanel } from './components/PivotPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { RelationshipCanvas } from './components/model/RelationshipCanvas';
import { RelationshipPanel } from './components/model/RelationshipPanel';
import { cleanColumn, type CleaningOperation } from './lib/cleaning';
import {
  addIfColumn,
  filterRows,
  joinRows,
  pivotRows,
  sortRows,
  type Aggregate,
  type FilterOperator,
} from './lib/analysis';
import {
  DEFAULT_KEY_NORMALIZATION,
  executeRelationshipJoin,
  validateRelationship,
} from './lib/relationships';
import { exportCsv, exportXlsx } from './lib/export';
import { profileTable } from './lib/profile';
import { createId } from './lib/utils';
import type {
  DataRow,
  DataTableModel,
  OperationLog,
  PanelMode,
  ParsedTabularData,
  RelationshipValidation,
  TableRelationship,
  WorkspaceView,
} from './types';

function newOperation(name: string, detail: string, inputRows: number, outputRows: number): OperationLog {
  return {
    id: createId('operation'),
    name,
    detail,
    inputRows,
    outputRows,
    timestamp: new Date().toLocaleString('zh-TW', { hour12: false }),
  };
}

function buildTable(args: {
  name: string;
  sourceFile: string;
  sourceSheet?: string;
  encoding?: string;
  rows: DataRow[];
  columns: string[];
  operations?: OperationLog[];
}): DataTableModel {
  return {
    id: createId('table'),
    name: args.name,
    sourceFile: args.sourceFile,
    sourceSheet: args.sourceSheet,
    encoding: args.encoding,
    rows: args.rows,
    columns: args.columns,
    profiles: profileTable(args.rows, args.columns),
    operations: args.operations ?? [],
    keyDefinitions: [],
  };
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [tables, setTables] = useState<DataTableModel[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>('quality');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('data');
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const activeTable = useMemo(
    () => tables.find((table) => table.id === activeTableId) ?? null,
    [tables, activeTableId],
  );

  const validations = useMemo(() => {
    const result: Record<string, RelationshipValidation | undefined> = {};
    relationships.forEach((relationship) => {
      const primary = tables.find((table) => table.id === relationship.primaryTableId);
      const secondary = tables.find((table) => table.id === relationship.secondaryTableId);
      if (primary && secondary && relationship.keyMappings.length) {
        result[relationship.id] = validateRelationship(relationship, primary, secondary);
      }
    });
    return result;
  }, [relationships, tables]);

  const selectedRelationship = useMemo(
    () => relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null,
    [relationships, selectedRelationshipId],
  );

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }

  function addTable(table: DataTableModel) {
    setTables((current) => [...current, table]);
    setActiveTableId(table.id);
    setWorkspaceView('data');
    setMode('quality');
  }

  function addDerivedTable(
    sourceTable: DataTableModel,
    name: string,
    rows: DataRow[],
    columns: string[],
    operation: OperationLog,
  ) {
    const table = buildTable({
      name,
      sourceFile: sourceTable.sourceFile,
      rows,
      columns,
      operations: [...sourceTable.operations, operation],
    });
    addTable(table);
    showNotice(`已建立「${name}」，共 ${rows.length.toLocaleString()} 筆。`);
  }

  function handleImport(data: ParsedTabularData, metadata: { name: string; sheet?: string; encoding?: string }) {
    const table = buildTable({
      name: metadata.sheet ? `${metadata.name}－${metadata.sheet}` : metadata.name,
      sourceFile: pendingFile?.name ?? metadata.name,
      sourceSheet: metadata.sheet,
      encoding: metadata.encoding,
      rows: data.rows,
      columns: data.columns,
      operations: [
        newOperation(
          '匯入資料',
          `${metadata.encoding ?? metadata.sheet ?? 'Excel'}；${data.warnings.length} 項解析警示`,
          data.rawRowCount,
          data.rows.length,
        ),
      ],
    });
    addTable(table);
    setPendingFile(null);
    showNotice(`成功匯入 ${data.rows.length.toLocaleString()} 筆資料。`);
  }

  function removeTable(id: string) {
    const remaining = tables.filter((table) => table.id !== id);
    setTables(remaining);
    setRelationships((current) => current.filter(
      (relationship) => relationship.primaryTableId !== id && relationship.secondaryTableId !== id,
    ));
    if (activeTableId === id) setActiveTableId(remaining[0]?.id ?? null);
    if (remaining.length < 2) setWorkspaceView('data');
  }

  function clearSession() {
    if (!window.confirm('確定要清除目前工作階段的所有資料及分析結果嗎？此動作無法復原。')) return;
    setTables([]);
    setRelationships([]);
    setSelectedRelationshipId(null);
    setActiveTableId(null);
    setPendingFile(null);
    setWorkspaceView('data');
    showNotice('已清除工作階段。');
  }

  function applyCleaning(column: string, operation: CleaningOperation) {
    if (!activeTable) return;
    const rows = cleanColumn(activeTable.rows, column, operation);
    addDerivedTable(
      activeTable,
      `${activeTable.name}－清洗 ${column}`,
      rows,
      activeTable.columns,
      newOperation('資料清洗', `${column}：${operation}`, activeTable.rows.length, rows.length),
    );
  }

  function applyFilter(column: string, operator: FilterOperator, value: string) {
    if (!activeTable) return;
    const rows = filterRows(activeTable.rows, column, operator, value);
    addDerivedTable(
      activeTable,
      `${activeTable.name}－篩選結果`,
      rows,
      activeTable.columns,
      newOperation('篩選', `${column} ${operator} ${value}`, activeTable.rows.length, rows.length),
    );
  }

  function applySort(column: string, direction: 'asc' | 'desc') {
    if (!activeTable) return;
    const rows = sortRows(activeTable.rows, column, direction);
    addDerivedTable(
      activeTable,
      `${activeTable.name}－排序 ${column}`,
      rows,
      activeTable.columns,
      newOperation('排序', `${column} ${direction}`, activeTable.rows.length, rows.length),
    );
  }

  function applyFormula(
    sourceColumn: string,
    operator: FilterOperator,
    comparisonValue: string,
    newColumn: string,
    trueValue: string,
    falseValue: string,
  ) {
    if (!activeTable) return;
    const rows = addIfColumn(
      activeTable.rows,
      sourceColumn,
      operator,
      comparisonValue,
      newColumn,
      trueValue,
      falseValue,
    );
    const columns = activeTable.columns.includes(newColumn)
      ? activeTable.columns
      : [...activeTable.columns, newColumn];
    addDerivedTable(
      activeTable,
      `${activeTable.name}－新增 ${newColumn}`,
      rows,
      columns,
      newOperation(
        'IF 判斷欄位',
        `${newColumn}: ${sourceColumn} ${operator} ${comparisonValue}`,
        activeTable.rows.length,
        rows.length,
      ),
    );
  }

  function applyJoin(
    rightTableId: string,
    leftKey: string,
    rightKey: string,
    joinMode: 'left' | 'inner',
    rightColumns: string[],
  ) {
    if (!activeTable) return;
    const rightTable = tables.find((table) => table.id === rightTableId);
    if (!rightTable) return;
    const rows = joinRows(activeTable.rows, rightTable.rows, leftKey, rightKey, joinMode, rightColumns);
    const outputColumns = [...activeTable.columns];
    rightColumns.forEach((column) => outputColumns.push(
      outputColumns.includes(column) ? `${column}_對照表` : column,
    ));
    addDerivedTable(
      activeTable,
      `${activeTable.name}－Join ${rightTable.name}`,
      rows,
      outputColumns,
      newOperation(
        '快速 Join',
        `${joinMode}: ${leftKey} = ${rightKey}；帶入 ${rightColumns.join('、')}`,
        activeTable.rows.length + rightTable.rows.length,
        rows.length,
      ),
    );
  }

  function applyPivot(rowField: string, columnField: string | null, valueField: string, aggregate: Aggregate) {
    if (!activeTable) return;
    const result = pivotRows(activeTable.rows, rowField, columnField, valueField, aggregate);
    addDerivedTable(
      activeTable,
      `${activeTable.name}－樞紐分析`,
      result.rows,
      result.columns,
      newOperation(
        '樞紐分析',
        `列=${rowField}；欄=${columnField ?? '無'}；值=${valueField}；${aggregate}`,
        activeTable.rows.length,
        result.rows.length,
      ),
    );
  }

  function connectFields(
    primaryTableId: string,
    primaryColumn: string,
    secondaryTableId: string,
    secondaryColumn: string,
  ) {
    const primary = tables.find((table) => table.id === primaryTableId);
    const secondary = tables.find((table) => table.id === secondaryTableId);
    if (!primary || !secondary) return;

    const existing = relationships.find(
      (relationship) =>
        relationship.primaryTableId === primaryTableId &&
        relationship.secondaryTableId === secondaryTableId,
    );

    if (existing) {
      const duplicated = existing.keyMappings.some(
        (mapping) =>
          mapping.primaryColumn === primaryColumn && mapping.secondaryColumn === secondaryColumn,
      );
      if (!duplicated) {
        const updated: TableRelationship = {
          ...existing,
          keyMappings: [
            ...existing.keyMappings,
            {
              id: createId('mapping'),
              primaryColumn,
              secondaryColumn,
              normalization: { ...DEFAULT_KEY_NORMALIZATION },
            },
          ],
        };
        setRelationships((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
      setSelectedRelationshipId(existing.id);
      return;
    }

    const relationship: TableRelationship = {
      id: createId('relationship'),
      name: `${primary.name} → ${secondary.name}`,
      primaryTableId,
      secondaryTableId,
      keyMappings: [
        {
          id: createId('mapping'),
          primaryColumn,
          secondaryColumn,
          normalization: { ...DEFAULT_KEY_NORMALIZATION },
        },
      ],
      joinType: 'left',
      selectedSecondaryColumns: secondary.columns.filter((column) => column !== secondaryColumn).slice(0, 5),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setRelationships((current) => [...current, relationship]);
    setSelectedRelationshipId(relationship.id);
    showNotice('已建立資料關聯，請在右側確認鍵值與輸出欄位。');
  }

  function updateRelationship(updated: TableRelationship) {
    setRelationships((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  function deleteRelationship(id: string) {
    if (!window.confirm('確定要刪除此資料關聯嗎？')) return;
    setRelationships((current) => current.filter((item) => item.id !== id));
    setSelectedRelationshipId(null);
  }

  function swapRelationship(relationship: TableRelationship) {
    const swapped: TableRelationship = {
      ...relationship,
      primaryTableId: relationship.secondaryTableId,
      secondaryTableId: relationship.primaryTableId,
      keyMappings: relationship.keyMappings.map((mapping) => ({
        ...mapping,
        primaryColumn: mapping.secondaryColumn,
        secondaryColumn: mapping.primaryColumn,
      })),
      selectedSecondaryColumns: [],
      name: `${tables.find((table) => table.id === relationship.secondaryTableId)?.name ?? '主表'} → ${tables.find((table) => table.id === relationship.primaryTableId)?.name ?? '對照表'}`,
    };
    updateRelationship(swapped);
  }

  function executeRelationship(relationship: TableRelationship) {
    const primary = tables.find((table) => table.id === relationship.primaryTableId);
    const secondary = tables.find((table) => table.id === relationship.secondaryTableId);
    if (!primary || !secondary) return;
    const validation = validateRelationship(relationship, primary, secondary);
    if (validation.rowExpansionRisk) {
      const proceed = window.confirm(
        `此關聯可能造成資料膨脹，預估輸出 ${validation.estimatedOutputRows.toLocaleString()} 筆。仍要執行嗎？`,
      );
      if (!proceed) return;
    }
    if (!relationship.selectedSecondaryColumns.length && !['leftAnti', 'semi'].includes(relationship.joinType)) {
      const proceed = window.confirm('目前沒有選擇要帶入的對照表欄位。仍要只依 Join 條件產出結果嗎？');
      if (!proceed) return;
    }

    const result = executeRelationshipJoin(relationship, primary, secondary);
    const keyDescription = relationship.keyMappings
      .map((mapping) => `${mapping.primaryColumn}=${mapping.secondaryColumn}`)
      .join('＋');
    addDerivedTable(
      primary,
      `${primary.name}－關聯 ${secondary.name}`,
      result.rows,
      result.columns,
      newOperation(
        '資料模型 Join',
        `${relationship.joinType}；${keyDescription}；帶入 ${relationship.selectedSecondaryColumns.join('、') || '無'}`,
        primary.rows.length + secondary.rows.length,
        result.rows.length,
      ),
    );
  }

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.txt,.tsv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPendingFile(file);
          event.target.value = '';
        }}
      />
      <Toolbar
        onOpenFile={() => fileInputRef.current?.click()}
        onModeChange={setMode}
        onWorkspaceChange={setWorkspaceView}
        workspaceView={workspaceView}
        onExportCsv={() => activeTable && exportCsv(activeTable.rows, activeTable.columns, `${activeTable.name}.csv`)}
        onExportXlsx={() => activeTable && exportXlsx(activeTable.rows, activeTable.columns, `${activeTable.name}.xlsx`)}
        onClear={clearSession}
        hasActiveTable={Boolean(activeTable)}
        tableCount={tables.length}
      />

      {workspaceView === 'model' ? (
        <div className="workspace model-workspace-layout">
          <Sidebar
            tables={tables}
            activeTableId={activeTableId}
            onSelect={setActiveTableId}
            onRemove={removeTable}
          />
          <section className="model-workspace">
            <div className="model-workspace-header">
              <div>
                <h1>資料模型與關聯設計</h1>
                <p>以 Primary Table／Secondary Table、單欄或複合鍵建立視覺化資料關聯。</p>
              </div>
              <button className="primary" onClick={() => fileInputRef.current?.click()}>＋新增資料表</button>
            </div>
            <div className="model-workspace-body">
              <RelationshipCanvas
                tables={tables}
                relationships={relationships}
                validations={validations}
                selectedRelationshipId={selectedRelationshipId}
                onSelectRelationship={setSelectedRelationshipId}
                onSelectTable={setActiveTableId}
                onConnectFields={connectFields}
              />
              <RelationshipPanel
                tables={tables}
                relationships={relationships}
                relationship={selectedRelationship}
                validation={selectedRelationship ? validations[selectedRelationship.id] ?? null : null}
                onSelect={setSelectedRelationshipId}
                onChange={updateRelationship}
                onDelete={deleteRelationship}
                onExecute={executeRelationship}
                onSwap={swapRelationship}
              />
            </div>
          </section>
        </div>
      ) : (
        <div className="workspace">
          <Sidebar
            tables={tables}
            activeTableId={activeTableId}
            onSelect={setActiveTableId}
            onRemove={removeTable}
          />
          <main className="main-area">
            {activeTable ? (
              <>
                <div className="table-header">
                  <div>
                    <h1>{activeTable.name}</h1>
                    <p>{activeTable.sourceFile}｜{activeTable.rows.length.toLocaleString()} 筆｜{activeTable.columns.length} 欄</p>
                  </div>
                  <button onClick={() => setMode('history')}>查看操作歷程</button>
                </div>
                <DataGrid rows={activeTable.rows} columns={activeTable.columns} />
                <div className="grid-footer">只渲染目前可見列；完整資料仍保留在本次瀏覽器記憶體中。</div>
              </>
            ) : (
              <div className="welcome">
                <div className="welcome-icon">▦</div>
                <h1>瀏覽器版資料分析工作台</h1>
                <p>匯入 Excel、CSV 或文字檔，在本機完成編碼確認、資料品質檢查、清洗、IF、資料模型與樞紐分析。</p>
                <button className="primary large-button" onClick={() => fileInputRef.current?.click()}>開啟第一份檔案</button>
                <div className="privacy-banner">所有檔案皆於瀏覽器本機讀取與運算，不會上傳至本系統伺服器。重新整理或關閉頁面後，尚未匯出的資料將被清除。</div>
              </div>
            )}
          </main>
          <aside className="right-panel">
            {activeTable ? (
              <div key={`${activeTable.id}-${mode}`}>
                {mode === 'quality' && <ProfilePanel table={activeTable} />}
                {mode === 'clean' && <CleaningPanel table={activeTable} onApply={applyCleaning} />}
                {mode === 'filter' && <FilterSortPanel table={activeTable} onFilter={applyFilter} onSort={applySort} />}
                {mode === 'formula' && <FormulaPanel table={activeTable} onApply={applyFormula} />}
                {mode === 'join' && <JoinPanel tables={tables} activeTable={activeTable} onApply={applyJoin} />}
                {mode === 'pivot' && <PivotPanel table={activeTable} onApply={applyPivot} />}
                {mode === 'history' && <HistoryPanel table={activeTable} />}
              </div>
            ) : (
              <div className="panel-placeholder">匯入資料後，可在此設定資料品質、清洗與分析功能。</div>
            )}
          </aside>
        </div>
      )}

      {pendingFile && (
        <ImportWizard
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onImport={handleImport}
        />
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
