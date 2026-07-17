import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection
} from '@xyflow/react';
import type { DataTableModel, RelationshipValidation, TableRelationship } from '../../types';
import { cardinalityLabel, joinTypeLabel } from '../../lib/relationships';
import { columnFromHandle, sourceHandleId, targetHandleId } from './handleIds';
import {
  MAX_VISIBLE_MODEL_COLUMNS,
  TableNode,
  type TableFlowNode,
  type TableNodeData,
} from './TableNode';
import {
  RelationshipEdge,
  type RelationshipEdgeData,
  type RelationshipFlowEdge,
} from './RelationshipEdge';

interface RelationshipCanvasProps {
  tables: DataTableModel[];
  relationships: TableRelationship[];
  validations: Record<string, RelationshipValidation | undefined>;
  selectedRelationshipId: string | null;
  onSelectRelationship: (id: string | null) => void;
  onSelectTable: (id: string) => void;
  onConnectFields: (primaryTableId: string, primaryColumn: string, secondaryTableId: string, secondaryColumn: string) => void;
}

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

function initialPosition(index: number): { x: number; y: number } {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return { x: 80 + column * 390, y: 70 + row * 520 };
}

export function RelationshipCanvas({
  tables,
  relationships,
  validations,
  selectedRelationshipId,
  onSelectRelationship,
  onSelectTable,
  onConnectFields,
}: RelationshipCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipFlowEdge>([]);

  const keyColumnsByTable = useMemo(() => {
    const map = new Map<string, { primary: Set<string>; secondary: Set<string> }>();
    tables.forEach((table) => map.set(table.id, { primary: new Set(), secondary: new Set() }));
    relationships.forEach((relationship) => {
      const primary = map.get(relationship.primaryTableId);
      const secondary = map.get(relationship.secondaryTableId);
      relationship.keyMappings.forEach((mapping) => {
        primary?.primary.add(mapping.primaryColumn);
        secondary?.secondary.add(mapping.secondaryColumn);
      });
    });
    return map;
  }, [relationships, tables]);

  useEffect(() => {
    setNodes((current) => {
      const positions = new Map(current.map((node) => [node.id, node.position]));
      return tables.map((table, index): TableFlowNode => {
        const keys = keyColumnsByTable.get(table.id);
        const data: TableNodeData = {
          table,
          primaryKeyColumns: [...(keys?.primary ?? [])],
          secondaryKeyColumns: [...(keys?.secondary ?? [])],
        };
        return {
          id: table.id,
          type: 'tableNode',
          position: positions.get(table.id) ?? initialPosition(index),
          data,
        };
      });
    });
  }, [keyColumnsByTable, setNodes, tables]);

  useEffect(() => {
    const flowEdges: RelationshipFlowEdge[] = [];
    relationships.forEach((relationship) => {
      const validation = validations[relationship.id];
      relationship.keyMappings.forEach((mapping, index) => {
        const labelParts = [
          validation ? cardinalityLabel(validation.cardinality) : '未驗證',
          joinTypeLabel(relationship.joinType).split('（')[0],
          relationship.keyMappings.length > 1 ? `${relationship.keyMappings.length} 欄複合鍵` : '',
          validation ? `${(validation.primaryMatchRate * 100).toFixed(1)}% 匹配` : '',
        ].filter(Boolean);
        const data: RelationshipEdgeData = {
          label: labelParts.join('｜'),
          warning: Boolean(validation?.rowExpansionRisk || validation?.hasTypeMismatch),
          showLabel: index === 0,
        };
        const primaryTable = tables.find((table) => table.id === relationship.primaryTableId);
        const secondaryTable = tables.find((table) => table.id === relationship.secondaryTableId);
        const primaryVisible = (primaryTable?.columns.indexOf(mapping.primaryColumn) ?? -1) < MAX_VISIBLE_MODEL_COLUMNS;
        const secondaryVisible = (secondaryTable?.columns.indexOf(mapping.secondaryColumn) ?? -1) < MAX_VISIBLE_MODEL_COLUMNS;
        flowEdges.push({
          id: `${relationship.id}:${mapping.id}`,
          type: 'relationshipEdge',
          source: relationship.primaryTableId,
          target: relationship.secondaryTableId,
          sourceHandle: sourceHandleId(primaryVisible ? mapping.primaryColumn : '__MORE__'),
          targetHandle: targetHandleId(secondaryVisible ? mapping.secondaryColumn : '__MORE__'),
          selected: selectedRelationshipId === relationship.id,
          markerEnd: { type: MarkerType.ArrowClosed },
          data,
        });
      });
    });
    setEdges(flowEdges);
  }, [relationships, selectedRelationshipId, setEdges, tables, validations]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      const primaryColumn = columnFromHandle(connection.sourceHandle);
      const secondaryColumn = columnFromHandle(connection.targetHandle);
      if (!primaryColumn || !secondaryColumn) return;
      onConnectFields(connection.source, primaryColumn, connection.target, secondaryColumn);
    },
    [onConnectFields],
  );

  const autoArrange = useCallback(() => {
    setNodes((current) => current.map((node, index) => ({ ...node, position: initialPosition(index) })));
  }, [setNodes]);

  return (
    <div className="relationship-canvas-shell">
      <ReactFlow<TableFlowNode, RelationshipFlowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectTable(node.id)}
        onEdgeClick={(_, edge) => onSelectRelationship(edge.id.split(':')[0] ?? null)}
        onPaneClick={() => onSelectRelationship(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.25}
        maxZoom={1.7}
        defaultEdgeOptions={{ type: 'relationshipEdge' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
        <Panel position="top-left" className="model-canvas-help">
          從主資料表欄位右側圓點拖曳到對照資料表欄位左側圓點，即可建立關聯。
        </Panel>
        <Panel position="top-right">
          <button type="button" onClick={autoArrange}>自動排列</button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
