import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';

export interface RelationshipEdgeData extends Record<string, unknown> {
  label: string;
  warning: boolean;
  showLabel: boolean;
}

export type RelationshipFlowEdge = Edge<RelationshipEdgeData, 'relationshipEdge'>;

export function RelationshipEdge(props: EdgeProps<RelationshipFlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={props.markerEnd}
        className={`relationship-edge-path ${props.selected ? 'selected' : ''} ${props.data?.warning ? 'warning' : ''}`}
      />
      {props.data?.showLabel && (
        <EdgeLabelRenderer>
          <div
            className={`relationship-edge-label ${props.data.warning ? 'warning' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {props.data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
