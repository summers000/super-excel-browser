# GitHub 更新方式

## 最穩定方式：整個 Repository 換成 v0.2

1. 先下載完整 ZIP 並解壓縮。
2. 在 GitHub Repository 根目錄刪除舊的 `src`、`public`、`.github` 及舊設定檔，或使用 GitHub Desktop 將本機專案完整覆蓋。
3. 上傳解壓縮後 `super-excel-browser` 資料夾「裡面的所有內容」，不要多包一層資料夾。
4. 確認 Repository 首頁直接看得到：
   - `.github`
   - `public`
   - `src`
   - `package.json`
   - `vite.config.ts`
5. Commit 到 `main`。
6. 到 Actions 查看最新一筆 `Deploy to GitHub Pages`。
7. 部署完成後，在網站按 `Ctrl + F5` 強制更新。

## 只更新差異檔案

使用 patch ZIP 時，依照 ZIP 內的資料夾位置覆蓋 GitHub 中的同名檔案。必須同時更新 `package.json`，因為 v0.2 新增 `@xyflow/react`。

## v0.2 必要新檔案

- `src/lib/relationships.ts`
- `src/components/model/handleIds.ts`
- `src/components/model/TableNode.tsx`
- `src/components/model/RelationshipEdge.tsx`
- `src/components/model/RelationshipCanvas.tsx`
- `src/components/model/RelationshipPanel.tsx`
- `src/test/relationships.test.ts`

## 注意

GitHub 網頁上傳資料夾時，隱藏資料夾 `.github` 容易被漏掉。若沒有看到 `.github/workflows/deploy.yml`，請在 GitHub 使用 `Add file → Create new file`，檔名輸入 `.github/workflows/deploy.yml`，再貼入專案中的內容。
