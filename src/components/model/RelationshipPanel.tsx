import type {
  DataTableModel,
  JoinType,
  RelationshipKeyMapping,
  RelationshipValidation,
  TableRelationship,
} from '../../types';
import {
  cardinalityLabel,
  DEFAULT_KEY_NORMALIZATION,
  joinTypeLabel,
} from '../../lib/relationships';
import { createId } from '../../lib/utils';

interface RelationshipPanelProps {
  tables: DataTableModel[];
  relationships: TableRelationship[];
  relationship: TableRelationship | null;
  validation: RelationshipValidation | null;
  onSelect: (id: string) => void;
  onChange: (relationship: TableRelationship) => void;
  onDelete: (id: string) => void;
  onExecute: (relationship: TableRelationship) => void;
  onSwap: (relationship: TableRelationship) => void;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function RelationshipPanel({
  tables,
  relationships,
  relationship,
  validation,
  onSelect,
  onChange,
  onDelete,
  onExecute,
  onSwap,
}: RelationshipPanelProps) {
  const primaryTable = relationship
    ? tables.find((table) => table.id === relationship.primaryTableId) ?? null
    : null;
  const secondaryTable = relationship
    ? tables.find((table) => table.id === relationship.secondaryTableId) ?? null
    : null;

  function updateMapping(mappingId: string, changes: Partial<RelationshipKeyMapping>) {
    if (!relationship) return;
    onChange({
      ...relationship,
      keyMappings: relationship.keyMappings.map((mapping) =>
        mapping.id === mappingId ? { ...mapping, ...changes } : mapping,
      ),
    });
  }

  function addMapping() {
    if (!relationship || !primaryTable || !secondaryTable) return;
    const usedPrimary = new Set(relationship.keyMappings.map((mapping) => mapping.primaryColumn));
    const usedSecondary = new Set(relationship.keyMappings.map((mapping) => mapping.secondaryColumn));
    const primaryColumn = primaryTable.columns.find((column) => !usedPrimary.has(column)) ?? primaryTable.columns[0];
    const secondaryColumn = secondaryTable.columns.find((column) => !usedSecondary.has(column)) ?? secondaryTable.columns[0];
    if (!primaryColumn || !secondaryColumn) return;
    onChange({
      ...relationship,
      keyMappings: [
        ...relationship.keyMappings,
        {
          id: createId('mapping'),
          primaryColumn,
          secondaryColumn,
          normalization: { ...DEFAULT_KEY_NORMALIZATION },
        },
      ],
    });
  }

  function removeMapping(mappingId: string) {
    if (!relationship || relationship.keyMappings.length <= 1) return;
    onChange({
      ...relationship,
      keyMappings: relationship.keyMappings.filter((mapping) => mapping.id !== mappingId),
    });
  }

  function toggleOutputColumn(column: string, checked: boolean) {
    if (!relationship) return;
    const next = checked
      ? [...relationship.selectedSecondaryColumns, column]
      : relationship.selectedSecondaryColumns.filter((item) => item !== column);
    onChange({ ...relationship, selectedSecondaryColumns: [...new Set(next)] });
  }

  return (
    <aside className="relationship-panel">
      <div className="relationship-list-section">
        <div className="relationship-panel-heading">
          <div>
            <h2>資料關聯</h2>
            <p>{relationships.length} 組關聯</p>
          </div>
        </div>
        <div className="relationship-list">
          {relationships.map((item) => {
            const primary = tables.find((table) => table.id === item.primaryTableId);
            const secondary = tables.find((table) => table.id === item.secondaryTableId);
            return (
              <button
                type="button"
                key={item.id}
                className={`relationship-list-item ${relationship?.id === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <strong>{primary?.name ?? '主表'} → {secondary?.name ?? '對照表'}</strong>
                <span>{item.keyMappings.length} 個鍵值｜{joinTypeLabel(item.joinType).split('（')[0]}</span>
              </button>
            );
          })}
          {!relationships.length && (
            <div className="model-empty-message">
              尚未建立關聯。請從主資料表欄位右側的圓點拖線到對照資料表欄位左側。
            </div>
          )}
        </div>
      </div>

      {relationship && primaryTable && secondaryTable ? (
        <div className="relationship-settings">
          <div className="relationship-title-row">
            <div>
              <h3>{relationship.name}</h3>
              <p>{primaryTable.name} → {secondaryTable.name}</p>
            </div>
            <button type="button" onClick={() => onSwap(relationship)}>交換主表</button>
          </div>

          <label>
            關聯名稱
            <input
              value={relationship.name}
              onChange={(event) => onChange({ ...relationship, name: event.target.value })}
            />
          </label>

          <label>
            Join 類型
            <select
              value={relationship.joinType}
              onChange={(event) => onChange({ ...relationship, joinType: event.target.value as JoinType })}
            >
              <option value="left">保留主表全部（Left Join）</option>
              <option value="inner">僅保留匹配資料（Inner Join）</option>
              <option value="full">保留兩表全部（Full Join）</option>
              <option value="leftAnti">只找主表未匹配資料</option>
              <option value="rightAnti">只找對照表未匹配資料</option>
              <option value="semi">只保留主表有匹配資料</option>
            </select>
          </label>

          <section className="relationship-section">
            <div className="relationship-section-heading">
              <div>
                <strong>主表與對照表比對鍵</strong>
                <span>可建立單欄鍵或多欄複合鍵</span>
              </div>
              <button type="button" onClick={addMapping}>＋新增鍵值</button>
            </div>

            {relationship.keyMappings.map((mapping, index) => (
              <div className="mapping-card" key={mapping.id}>
                <div className="mapping-title">
                  <strong>鍵值 {index + 1}</strong>
                  <button
                    type="button"
                    disabled={relationship.keyMappings.length <= 1}
                    onClick={() => removeMapping(mapping.id)}
                  >
                    移除
                  </button>
                </div>
                <div className="mapping-selects">
                  <label>
                    主表欄位
                    <select
                      value={mapping.primaryColumn}
                      onChange={(event) => updateMapping(mapping.id, { primaryColumn: event.target.value })}
                    >
                      {primaryTable.columns.map((column) => <option key={column}>{column}</option>)}
                    </select>
                  </label>
                  <span className="mapping-arrow">→</span>
                  <label>
                    對照表欄位
                    <select
                      value={mapping.secondaryColumn}
                      onChange={(event) => updateMapping(mapping.id, { secondaryColumn: event.target.value })}
                    >
                      {secondaryTable.columns.map((column) => <option key={column}>{column}</option>)}
                    </select>
                  </label>
                </div>

                <details className="normalization-settings">
                  <summary>比對前標準化</summary>
                  <label className="checkbox horizontal-checkbox">
                    <input
                      type="checkbox"
                      checked={mapping.normalization.trim}
                      onChange={(event) => updateMapping(mapping.id, {
                        normalization: { ...mapping.normalization, trim: event.target.checked },
                      })}
                    />
                    移除前後空白
                  </label>
                  <label className="checkbox horizontal-checkbox">
                    <input
                      type="checkbox"
                      checked={mapping.normalization.fullWidthToHalfWidth}
                      onChange={(event) => updateMapping(mapping.id, {
                        normalization: { ...mapping.normalization, fullWidthToHalfWidth: event.target.checked },
                      })}
                    />
                    全形轉半形
                  </label>
                  <label>
                    英文字母大小寫
                    <select
                      value={mapping.normalization.caseMode}
                      onChange={(event) => updateMapping(mapping.id, {
                        normalization: {
                          ...mapping.normalization,
                          caseMode: event.target.value as 'none' | 'upper' | 'lower',
                        },
                      })}
                    >
                      <option value="none">不轉換</option>
                      <option value="upper">統一大寫</option>
                      <option value="lower">統一小寫</option>
                    </select>
                  </label>
                  <label className="checkbox horizontal-checkbox">
                    <input
                      type="checkbox"
                      checked={mapping.normalization.nullsMatch}
                      onChange={(event) => updateMapping(mapping.id, {
                        normalization: { ...mapping.normalization, nullsMatch: event.target.checked },
                      })}
                    />
                    允許空值與空值匹配
                  </label>
                </details>
              </div>
            ))}
          </section>

          <section className="relationship-section">
            <div className="relationship-section-heading">
              <div>
                <strong>帶入對照表欄位</strong>
                <span>選擇要加入結果資料表的欄位</span>
              </div>
            </div>
            <div className="output-column-list">
              {secondaryTable.columns.map((column) => (
                <label className="checkbox horizontal-checkbox" key={column}>
                  <input
                    type="checkbox"
                    checked={relationship.selectedSecondaryColumns.includes(column)}
                    onChange={(event) => toggleOutputColumn(column, event.target.checked)}
                  />
                  <span>{column}</span>
                </label>
              ))}
            </div>
          </section>

          {validation && (
            <section className="relationship-validation">
              <div className={`validation-status ${validation.rowExpansionRisk ? 'warning' : 'ok'}`}>
                <strong>{cardinalityLabel(validation.cardinality)}</strong>
                <span>{validation.rowExpansionRisk ? '需要確認資料膨脹風險' : '關聯已完成驗證'}</span>
              </div>
              <div className="validation-metrics">
                <div><span>主表匹配率</span><strong>{percent(validation.primaryMatchRate)}</strong></div>
                <div><span>預估輸出</span><strong>{validation.estimatedOutputRows.toLocaleString()}</strong></div>
                <div><span>主表重複鍵</span><strong>{validation.primary.duplicateKeyGroups.toLocaleString()}</strong></div>
                <div><span>對照表重複鍵</span><strong>{validation.secondary.duplicateKeyGroups.toLocaleString()}</strong></div>
                <div><span>主表空白鍵</span><strong>{validation.primary.nullRows.toLocaleString()}</strong></div>
                <div><span>未匹配主表</span><strong>{validation.unmatchedPrimaryRows.toLocaleString()}</strong></div>
              </div>
              {validation.warnings.length > 0 && (
                <ul className="validation-warning-list">
                  {validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </section>
          )}

          <div className="relationship-actions">
            <button
              type="button"
              className="primary"
              disabled={!relationship.keyMappings.length}
              onClick={() => onExecute(relationship)}
            >
              驗證並產出 Join 結果
            </button>
            <button type="button" className="danger-text" onClick={() => onDelete(relationship.id)}>
              刪除此關聯
            </button>
          </div>
        </div>
      ) : (
        <div className="model-empty-message panel-empty">
          選取一條關聯線後，可在此設定 Primary Table、Secondary Table、複合鍵、Join 類型與輸出欄位。
        </div>
      )}
    </aside>
  );
}
