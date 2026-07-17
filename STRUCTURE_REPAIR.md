# v0.2.2 資料模型資料夾修復

## 必須刪除的錯誤檔案

請在 GitHub Repository 刪除以下檔案（若存在）：

- `src/components/RelationshipEdge.tsx`
- `src/components/TableNode.tsx`
- `src/components/RelationshipCanvas.tsx`
- `src/components/RelationshipPanel.tsx`
- `src/components/handleIds.ts`

這些檔案不應放在 `src/components` 根目錄。

## 正確資料夾

以下五個檔案必須全部位於：

`src/components/model/`

- `RelationshipCanvas.tsx`
- `RelationshipPanel.tsx`
- `RelationshipEdge.tsx`
- `TableNode.tsx`
- `handleIds.ts`

## 正確結構

```text
src/components/
├─ CleaningPanel.tsx
├─ DataGrid.tsx
├─ FilterSortPanel.tsx
├─ FormulaPanel.tsx
├─ HistoryPanel.tsx
├─ ImportWizard.tsx
├─ JoinPanel.tsx
├─ PivotPanel.tsx
├─ ProfilePanel.tsx
├─ Sidebar.tsx
├─ Toolbar.tsx
└─ model/
   ├─ RelationshipCanvas.tsx
   ├─ RelationshipEdge.tsx
   ├─ RelationshipPanel.tsx
   ├─ TableNode.tsx
   └─ handleIds.ts
```

`App.tsx` 的 import 應維持：

```ts
import { RelationshipCanvas } from './components/model/RelationshipCanvas';
import { RelationshipPanel } from './components/model/RelationshipPanel';
```
