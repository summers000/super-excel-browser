import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { DataTableModel } from '../../types';
import { sourceHandleId, targetHandleId } from './handleIds';

export interface TableNodeData extends Record<string, unknown> {
  table: DataTableModel;
  primaryKeyColumns: string[];
  secondaryKeyColumns: string[];
}

export type TableFlowNode = Node<TableNodeData, 'tableNode'>;

export const MAX_VISIBLE_MODEL_COLUMNS = 18;

function typeSymbol(type: string): string {
  if (type === 'integer' || type === 'decimal') return '123';
  if (type === 'date') return '日';
  if (type === 'boolean') return '✓';
  return 'ABC';
}

export function TableNode({ data, selected }: NodeProps<TableFlowNode>) {
  const { table, primaryKeyColumns, secondaryKeyColumns } = data;
  const visibleColumns = table.columns.slice(0, MAX_VISIBLE_MODEL_COLUMNS);
  const warningCount = table.profiles.reduce(
    (sum, profile) => sum + profile.invalidCount + profile.suspiciousTextCount,
    0,
  );

  return (
    <article className={`model-table-node ${selected ? 'selected' : ''}`}>
      <header className="model-table-node-header">
        <div>
          <strong title={table.name}>{table.name}</strong>
          <span>{table.rows.length.toLocaleString()} 筆・{table.columns.length} 欄</span>
        </div>
        <span className={warningCount ? 'node-warning-badge' : 'node-ok-badge'}>
          {warningCount ? `! ${warningCount}` : '✓'}
        </span>
      </header>

      <div className="model-column-list">
        {visibleColumns.map((column) => {
          const profile = table.profiles.find((item) => item.name === column);
          const isPrimaryKey = primaryKeyColumns.includes(column);
          const isSecondaryKey = secondaryKeyColumns.includes(column);
          const isUnique = Boolean(profile && profile.duplicateCount === 0 && profile.nullCount === 0);
          const hasWarning = Boolean(profile && (profile.invalidCount || profile.suspiciousTextCount || profile.nullCount));

          return (
            <div className="model-column-row" key={column} title={`${column}｜${profile?.inferredType ?? 'string'}`}>
              <Handle
                type="target"
                position={Position.Left}
                id={targetHandleId(column)}
                className="model-field-handle target-handle"
              />
              <span className="column-key-mark">
                {isPrimaryKey ? '🔑' : isSecondaryKey ? '↗' : isUnique ? 'U' : ''}
              </span>
              <span className="column-name">{column}</span>
              <span className="column-type">{typeSymbol(profile?.inferredType ?? 'string')}</span>
              {hasWarning && <span className="column-warning-dot" title="此欄位有空值或資料品質警示">!</span>}
              <Handle
                type="source"
                position={Position.Right}
                id={sourceHandleId(column)}
                className="model-field-handle source-handle"
              />
            </div>
          );
        })}
      </div>

      {table.columns.length > MAX_VISIBLE_MODEL_COLUMNS && (
        <footer className="model-table-node-footer">
          <Handle
            type="target"
            position={Position.Left}
            id={targetHandleId('__MORE__')}
            className="model-field-handle target-handle"
          />
          其餘 {(table.columns.length - MAX_VISIBLE_MODEL_COLUMNS).toLocaleString()} 欄可在右側關聯設定中選取
          <Handle
            type="source"
            position={Position.Right}
            id={sourceHandleId('__MORE__')}
            className="model-field-handle source-handle"
          />
        </footer>
      )}
    </article>
  );
}
