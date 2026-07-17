export type CellValue = string | number | boolean | Date | null;
export type DataRow = Record<string, CellValue>;

export type InferredType =
  | 'empty'
  | 'string'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'boolean'
  | 'mixed';

export interface ColumnProfile {
  name: string;
  inferredType: InferredType;
  totalCount: number;
  nonNullCount: number;
  nullCount: number;
  emptyStringCount: number;
  whitespaceOnlyCount: number;
  uniqueCount: number;
  uniqueCountIsLowerBound?: boolean;
  duplicateCount: number;
  invalidCount: number;
  suspiciousTextCount: number;
  min?: number | string;
  max?: number | string;
  average?: number;
  commonValues: Array<{ value: string; count: number }>;
}

export interface OperationLog {
  id: string;
  name: string;
  detail: string;
  timestamp: string;
  inputRows: number;
  outputRows: number;
}

export interface TableKeyDefinition {
  id: string;
  name: string;
  columns: string[];
  kind: 'primary' | 'candidate' | 'foreign';
}

export interface DataTableModel {
  id: string;
  name: string;
  sourceFile: string;
  sourceSheet?: string;
  encoding?: string;
  rows: DataRow[];
  columns: string[];
  profiles: ColumnProfile[];
  operations: OperationLog[];
  keyDefinitions: TableKeyDefinition[];
}

export interface EncodingCandidate {
  encoding: string;
  label: string;
  score: number;
  replacementCount: number;
  controlCount: number;
  preview: string;
}

export interface ParsedTabularData {
  rows: DataRow[];
  columns: string[];
  rawRowCount: number;
  warnings: string[];
}

export type PanelMode =
  | 'quality'
  | 'clean'
  | 'filter'
  | 'formula'
  | 'join'
  | 'pivot'
  | 'history';

export type WorkspaceView = 'data' | 'model';

export type JoinType =
  | 'left'
  | 'inner'
  | 'full'
  | 'leftAnti'
  | 'rightAnti'
  | 'semi';

export type Cardinality =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many';

export interface KeyNormalization {
  trim: boolean;
  fullWidthToHalfWidth: boolean;
  caseMode: 'none' | 'upper' | 'lower';
  nullsMatch: boolean;
}

export interface RelationshipKeyMapping {
  id: string;
  primaryColumn: string;
  secondaryColumn: string;
  normalization: KeyNormalization;
}

export interface TableRelationship {
  id: string;
  name: string;
  primaryTableId: string;
  secondaryTableId: string;
  keyMappings: RelationshipKeyMapping[];
  joinType: JoinType;
  selectedSecondaryColumns: string[];
  isActive: boolean;
  createdAt: string;
}

export interface KeySideProfile {
  totalRows: number;
  nonNullRows: number;
  nullRows: number;
  uniqueKeyCount: number;
  duplicateKeyGroups: number;
  duplicateRows: number;
  maxDuplicateCount: number;
  isUnique: boolean;
}

export interface RelationshipValidation {
  cardinality: Cardinality;
  primary: KeySideProfile;
  secondary: KeySideProfile;
  matchedPrimaryRows: number;
  unmatchedPrimaryRows: number;
  matchedSecondaryRows: number;
  unmatchedSecondaryRows: number;
  estimatedOutputRows: number;
  primaryMatchRate: number;
  secondaryMatchRate: number;
  rowExpansionRisk: boolean;
  hasTypeMismatch: boolean;
  warnings: string[];
}
