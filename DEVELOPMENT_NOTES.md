# Development Notes — v0.2.0

## 本次完成

- 新增 `@xyflow/react` 視覺化資料模型畫布。
- 新增 `TableRelationship`、`RelationshipKeyMapping`、`RelationshipValidation` 等資料模型。
- 新增多欄複合鍵及欄位標準化。
- 新增關聯基數與資料膨脹診斷。
- 新增六種 Join 輸出。
- 新增主表與對照表交換。
- 新增關聯線資訊標籤、匹配率及警示狀態。
- 新增 5 項關聯核心測試。

## 驗證結果

使用 Node.js 環境完成：

- `npm test`：3 個測試檔、13 項測試全部通過。
- `npm run build`：TypeScript 型別檢查及 Vite production build 完成。

建置時出現 JavaScript bundle 大於 500 kB 的非阻斷警告。這是 React Flow、SheetJS 與目前單一入口打包造成，後續可利用動態載入進行 code splitting。

## 套件安裝說明

正式 `package.json` 使用 SheetJS Community Edition 官方 0.20.3 tarball。測試環境無法解析 `cdn.sheetjs.com`，因此本地驗證時暫時使用 npm registry 的 `xlsx` 版本建立 `node_modules`，驗證後已恢復正式 `package.json`。GitHub Actions 使用 `npm install`，且不啟用 npm cache，因此不需要 `package-lock.json`。

## 下一步建議

1. 將大型資料解析與 Join 移到 Web Worker。
2. 導入 DuckDB-Wasm 或 Arrow，降低大型資料物件複製。
3. 加入關聯設定 JSON 匯出與匯入。
4. 加入多張資料表依序 Join 的資料集建構器。
5. 加入 Duplicate、Gap、Aging、Stratify 與 Benford。
