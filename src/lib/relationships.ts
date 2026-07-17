import type {
  Cardinality,
  CellValue,
  DataRow,
  DataTableModel,
  JoinType,
  KeyNormalization,
  KeySideProfile,
  RelationshipKeyMapping,
  RelationshipValidation,
  TableRelationship,
} from '../types';

const NULL_KEY = '__SUPER_EXCEL_NULL_KEY__';
const KEY_SEPARATOR = '\u001F';

export const DEFAULT_KEY_NORMALIZATION: KeyNormalization = {
  trim: true,
  fullWidthToHalfWidth: true,
  caseMode: 'upper',
  nullsMatch: false,
};

function fullWidthToHalfWidth(text: string): string {
  return text
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replaceAll('　', ' ');
}

export function normalizeRelationshipValue(
  value: CellValue,
  normalization: KeyNormalization,
): string | null {
  if (value === null) return normalization.nullsMatch ? NULL_KEY : null;
  if (value instanceof Date) return value.toISOString();

  let text = String(value);
  if (normalization.fullWidthToHalfWidth) text = fullWidthToHalfWidth(text);
  if (normalization.trim) text = text.trim();
  if (normalization.caseMode === 'upper') text = text.toUpperCase();
  if (normalization.caseMode === 'lower') text = text.toLowerCase();

  if (text === '') return normalization.nullsMatch ? NULL_KEY : null;
  return text;
}

export function buildCompositeKey(
  row: DataRow,
  mappings: RelationshipKeyMapping[],
  side: 'primary' | 'secondary',
): string | null {
  if (!mappings.length) return null;
  const values: string[] = [];

  for (const mapping of mappings) {
    const column = side === 'primary' ? mapping.primaryColumn : mapping.secondaryColumn;
    const normalized = normalizeRelationshipValue(row[column] ?? null, mapping.normalization);
    if (normalized === null) return null;
    values.push(normalized.replaceAll(KEY_SEPARATOR, `${KEY_SEPARATOR}${KEY_SEPARATOR}`));
  }

  return values.join(KEY_SEPARATOR);
}

function countKeys(
  rows: DataRow[],
  mappings: RelationshipKeyMapping[],
  side: 'primary' | 'secondary',
): { counts: Map<string, number>; nullRows: number } {
  const counts = new Map<string, number>();
  let nullRows = 0;

  for (const row of rows) {
    const key = buildCompositeKey(row, mappings, side);
    if (key === null) {
      nullRows += 1;
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return { counts, nullRows };
}

function profileSide(totalRows: number, counts: Map<string, number>, nullRows: number): KeySideProfile {
  let duplicateKeyGroups = 0;
  let duplicateRows = 0;
  let maxDuplicateCount = 0;

  counts.forEach((count) => {
    if (count > 1) {
      duplicateKeyGroups += 1;
      duplicateRows += count - 1;
    }
    if (count > maxDuplicateCount) maxDuplicateCount = count;
  });

  return {
    totalRows,
    nonNullRows: totalRows - nullRows,
    nullRows,
    uniqueKeyCount: counts.size,
    duplicateKeyGroups,
    duplicateRows,
    maxDuplicateCount,
    isUnique: duplicateKeyGroups === 0,
  };
}

function inferCardinality(primary: KeySideProfile, secondary: KeySideProfile): Cardinality {
  if (primary.isUnique && secondary.isUnique) return 'one-to-one';
  if (primary.isUnique && !secondary.isUnique) return 'one-to-many';
  if (!primary.isUnique && secondary.isUnique) return 'many-to-one';
  return 'many-to-many';
}

function estimateOutputRows(
  joinType: JoinType,
  primaryCounts: Map<string, number>,
  secondaryCounts: Map<string, number>,
  primaryNullRows: number,
  secondaryNullRows: number,
): number {
  let innerRows = 0;
  let matchedPrimaryRows = 0;
  let matchedSecondaryRows = 0;

  primaryCounts.forEach((primaryCount, key) => {
    const secondaryCount = secondaryCounts.get(key) ?? 0;
    if (secondaryCount > 0) {
      innerRows += primaryCount * secondaryCount;
      matchedPrimaryRows += primaryCount;
      matchedSecondaryRows += secondaryCount;
    }
  });

  const primaryRows = [...primaryCounts.values()].reduce((sum, count) => sum + count, 0) + primaryNullRows;
  const secondaryRows = [...secondaryCounts.values()].reduce((sum, count) => sum + count, 0) + secondaryNullRows;
  const unmatchedPrimaryRows = primaryRows - matchedPrimaryRows;
  const unmatchedSecondaryRows = secondaryRows - matchedSecondaryRows;

  switch (joinType) {
    case 'inner':
      return innerRows;
    case 'left':
      return innerRows + unmatchedPrimaryRows;
    case 'full':
      return innerRows + unmatchedPrimaryRows + unmatchedSecondaryRows;
    case 'leftAnti':
      return unmatchedPrimaryRows;
    case 'rightAnti':
      return unmatchedSecondaryRows;
    case 'semi':
      return matchedPrimaryRows;
  }
}

function profileTypeMismatch(
  primaryTable: DataTableModel,
  secondaryTable: DataTableModel,
  mappings: RelationshipKeyMapping[],
): boolean {
  return mappings.some((mapping) => {
    const primaryType = primaryTable.profiles.find((profile) => profile.name === mapping.primaryColumn)?.inferredType;
    const secondaryType = secondaryTable.profiles.find((profile) => profile.name === mapping.secondaryColumn)?.inferredType;
    if (!primaryType || !secondaryType || primaryType === 'empty' || secondaryType === 'empty') return false;
    const numericTypes = new Set(['integer', 'decimal']);
    if (numericTypes.has(primaryType) && numericTypes.has(secondaryType)) return false;
    return primaryType !== secondaryType;
  });
}

export function validateRelationship(
  relationship: TableRelationship,
  primaryTable: DataTableModel,
  secondaryTable: DataTableModel,
): RelationshipValidation {
  const primaryKeyStats = countKeys(primaryTable.rows, relationship.keyMappings, 'primary');
  const secondaryKeyStats = countKeys(secondaryTable.rows, relationship.keyMappings, 'secondary');
  const primary = profileSide(primaryTable.rows.length, primaryKeyStats.counts, primaryKeyStats.nullRows);
  const secondary = profileSide(secondaryTable.rows.length, secondaryKeyStats.counts, secondaryKeyStats.nullRows);
  const cardinality = inferCardinality(primary, secondary);

  let matchedPrimaryRows = 0;
  let matchedSecondaryRows = 0;
  primaryKeyStats.counts.forEach((count, key) => {
    if (secondaryKeyStats.counts.has(key)) matchedPrimaryRows += count;
  });
  secondaryKeyStats.counts.forEach((count, key) => {
    if (primaryKeyStats.counts.has(key)) matchedSecondaryRows += count;
  });

  const unmatchedPrimaryRows = primaryTable.rows.length - matchedPrimaryRows;
  const unmatchedSecondaryRows = secondaryTable.rows.length - matchedSecondaryRows;
  const estimatedOutputRows = estimateOutputRows(
    relationship.joinType,
    primaryKeyStats.counts,
    secondaryKeyStats.counts,
    primaryKeyStats.nullRows,
    secondaryKeyStats.nullRows,
  );
  const hasTypeMismatch = profileTypeMismatch(primaryTable, secondaryTable, relationship.keyMappings);
  const rowExpansionRisk =
    cardinality === 'many-to-many' ||
    estimatedOutputRows > Math.max(primaryTable.rows.length * 1.05, primaryTable.rows.length + 1000);

  const warnings: string[] = [];
  if (!relationship.keyMappings.length) warnings.push('尚未設定任何比對鍵。');
  if (primary.nullRows > 0) warnings.push(`主資料表有 ${primary.nullRows.toLocaleString()} 筆空白鍵值。`);
  if (secondary.nullRows > 0) warnings.push(`對照資料表有 ${secondary.nullRows.toLocaleString()} 筆空白鍵值。`);
  if (secondary.duplicateKeyGroups > 0) {
    warnings.push(`對照資料表有 ${secondary.duplicateKeyGroups.toLocaleString()} 組重複鍵，可能讓結果筆數增加。`);
  }
  if (cardinality === 'many-to-many') warnings.push('兩側比對鍵都有重複值，屬於多對多關聯。');
  if (hasTypeMismatch) warnings.push('部分對應欄位的推測資料型態不同，請確認標準化規則。');
  if (rowExpansionRisk) warnings.push(`預估輸出 ${estimatedOutputRows.toLocaleString()} 筆，存在資料膨脹風險。`);
  if (unmatchedPrimaryRows > 0) warnings.push(`主資料表約有 ${unmatchedPrimaryRows.toLocaleString()} 筆無法匹配。`);

  return {
    cardinality,
    primary,
    secondary,
    matchedPrimaryRows,
    unmatchedPrimaryRows,
    matchedSecondaryRows,
    unmatchedSecondaryRows,
    estimatedOutputRows,
    primaryMatchRate: primaryTable.rows.length ? matchedPrimaryRows / primaryTable.rows.length : 0,
    secondaryMatchRate: secondaryTable.rows.length ? matchedSecondaryRows / secondaryTable.rows.length : 0,
    rowExpansionRisk,
    hasTypeMismatch,
    warnings,
  };
}

function getOutputColumnName(
  existingColumns: Set<string>,
  column: string,
  secondaryTableName: string,
): string {
  if (!existingColumns.has(column)) {
    existingColumns.add(column);
    return column;
  }

  const base = `${column}_${secondaryTableName}`;
  let candidate = base;
  let suffix = 2;
  while (existingColumns.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  existingColumns.add(candidate);
  return candidate;
}

export interface RelationshipJoinResult {
  rows: DataRow[];
  columns: string[];
}

export function executeRelationshipJoin(
  relationship: TableRelationship,
  primaryTable: DataTableModel,
  secondaryTable: DataTableModel,
): RelationshipJoinResult {
  const secondaryIndex = new Map<string, DataRow[]>();
  const matchedSecondaryRows = new Set<DataRow>();

  for (const row of secondaryTable.rows) {
    const key = buildCompositeKey(row, relationship.keyMappings, 'secondary');
    if (key === null) continue;
    const bucket = secondaryIndex.get(key) ?? [];
    bucket.push(row);
    secondaryIndex.set(key, bucket);
  }

  const existingColumns = new Set(primaryTable.columns);
  const selectedSecondaryColumns = relationship.selectedSecondaryColumns.filter((column) =>
    secondaryTable.columns.includes(column),
  );
  const secondaryOutputNames = new Map<string, string>();
  selectedSecondaryColumns.forEach((column) => {
    secondaryOutputNames.set(column, getOutputColumnName(existingColumns, column, secondaryTable.name));
  });

  const columns = [...primaryTable.columns, ...secondaryOutputNames.values()];
  const rows: DataRow[] = [];

  const appendSecondaryFields = (target: DataRow, secondaryRow: DataRow | null) => {
    selectedSecondaryColumns.forEach((column) => {
      const outputName = secondaryOutputNames.get(column);
      if (outputName) target[outputName] = secondaryRow?.[column] ?? null;
    });
  };

  for (const primaryRow of primaryTable.rows) {
    const key = buildCompositeKey(primaryRow, relationship.keyMappings, 'primary');
    const matches = key === null ? [] : secondaryIndex.get(key) ?? [];

    if (relationship.joinType === 'leftAnti') {
      if (!matches.length) rows.push({ ...primaryRow });
      continue;
    }

    if (relationship.joinType === 'semi') {
      if (matches.length) rows.push({ ...primaryRow });
      matches.forEach((row) => matchedSecondaryRows.add(row));
      continue;
    }

    if (!matches.length) {
      if (relationship.joinType === 'left' || relationship.joinType === 'full') {
        const outputRow: DataRow = { ...primaryRow };
        appendSecondaryFields(outputRow, null);
        rows.push(outputRow);
      }
      continue;
    }

    for (const secondaryRow of matches) {
      matchedSecondaryRows.add(secondaryRow);
      const outputRow: DataRow = { ...primaryRow };
      appendSecondaryFields(outputRow, secondaryRow);
      rows.push(outputRow);
    }
  }

  if (relationship.joinType === 'full' || relationship.joinType === 'rightAnti') {
    for (const secondaryRow of secondaryTable.rows) {
      if (matchedSecondaryRows.has(secondaryRow)) continue;
      const outputRow: DataRow = {};
      primaryTable.columns.forEach((column) => {
        outputRow[column] = null;
      });
      appendSecondaryFields(outputRow, secondaryRow);
      rows.push(outputRow);
    }
  }

  if (relationship.joinType === 'rightAnti') {
    return { rows, columns };
  }

  return { rows, columns };
}

export function cardinalityLabel(cardinality: Cardinality): string {
  const labels: Record<Cardinality, string> = {
    'one-to-one': '1：1',
    'one-to-many': '1：N',
    'many-to-one': 'N：1',
    'many-to-many': 'N：N',
  };
  return labels[cardinality];
}

export function joinTypeLabel(joinType: JoinType): string {
  const labels: Record<JoinType, string> = {
    left: '保留主表全部（Left Join）',
    inner: '僅保留匹配資料（Inner Join）',
    full: '保留兩表全部（Full Join）',
    leftAnti: '只找主表未匹配資料',
    rightAnti: '只找對照表未匹配資料',
    semi: '只保留主表有匹配的資料',
  };
  return labels[joinType];
}
