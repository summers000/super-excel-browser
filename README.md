# Super Excel Browser v0.2.0

一套以瀏覽器本機運算為核心的資料匯入、清洗、分析與視覺化關聯工具。

## v0.2 新增功能

- Power BI／Access 類型的資料模型畫布
- 資料表節點拖曳、縮放、平移與 Mini Map
- 從主資料表欄位拉線到對照資料表欄位
- Primary Table／Secondary Table 設定
- 單欄比對鍵與多欄複合鍵
- 比對前標準化：去除空白、全形轉半形、大小寫統一、空值匹配
- 自動判斷 1:1、1:N、N:1、N:N 關聯
- 主表／對照表重複鍵、空白鍵及匹配率分析
- 預估輸出筆數及多對多資料膨脹警示
- Left、Inner、Full、Left Anti、Right Anti、Semi Join
- 選擇要從對照資料表帶入的欄位
- Join 結果建立為新的衍生資料表

## 原有功能

- Excel、CSV、TXT、TSV 匯入
- UTF-8、Big5／CP950、UTF-16 等編碼預覽與切換
- 分隔符號及表頭列選擇
- 欄位型態推測
- 空值、重複值、疑似亂碼及型態異常概況
- 文字與數值清洗
- 篩選、排序及 IF 欄位
- 快速單欄 Join
- SUM、AVERAGE、COUNT、COUNT DISTINCT、MIN、MAX 樞紐分析
- CSV 與 XLSX 安全匯出

## 隱私設計

使用者匯入的資料只存在目前瀏覽器頁面的記憶體中，不會上傳至 GitHub Pages 或其他伺服器。重新整理或關閉頁面後，未匯出的資料會消失。

## 本機執行

```bash
npm install
npm run dev
```

正式建置：

```bash
npm test
npm run build
```

## GitHub Pages

1. 將專案根目錄中的所有內容上傳至 GitHub Repository。
2. 確認 `package.json`、`src`、`public` 與 `.github` 位於 Repository 根目錄。
3. 到 `Settings → Pages`，將 Source 設為 `GitHub Actions`。
4. 推送至 `main` 後，`.github/workflows/deploy.yml` 會自動測試、建置與部署。

## 資料模型操作

1. 至少匯入兩張資料表。
2. 點擊頂端「資料模型」。
3. 從主資料表欄位右側圓點拖曳到對照資料表欄位左側圓點。
4. 右側設定 Join 類型、複合鍵、標準化方式與輸出欄位。
5. 檢查基數、重複鍵、空白鍵、匹配率及預估輸出筆數。
6. 點擊「驗證並產出 Join 結果」。

若關聯方向相反，可使用右側「交換主表」。

## 技術架構

- React
- TypeScript
- Vite
- React Flow (`@xyflow/react`)
- Papa Parse
- SheetJS
- Vitest

## 已知限制

- 目前分析引擎仍以瀏覽器記憶體與 TypeScript 陣列為主，尚未接入 DuckDB-Wasm／Web Worker。
- 大型 Join 的速度與可處理資料量取決於檔案大小、欄位數量、Join 基數、瀏覽器及電腦可用記憶體。
- 畫布節點預設顯示前 18 個欄位；其他欄位仍可在右側關聯設定中選取。
- 關聯與分析流程目前只存在當次工作階段，尚未加入設定 JSON 匯出／匯入。
