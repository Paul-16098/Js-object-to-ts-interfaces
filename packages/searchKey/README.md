# searchKey

## 專案名稱與簡介

**searchKey** 子套件是 js-object-to-ts-interfaces 專案中的一個瀏覽器輔助工具，主要功能是在瀏覽器環境下注入 `$searchKey()` 全域函式，協助開發者在大型前端專案（如 Vue/React）中快速模糊搜尋全域物件、框架掛載點或 store 等關鍵節點，並可直接將搜尋結果導入 TypeScript 介面產生器進行型別推斷。
此工具專為大型 SPA 或複雜全域命名空間設計，支援 Vue/React 掛載點自動偵測、深度遞迴索引、fuzzy search、以及與主專案的型別產生流程無縫整合。

## 技術棧

- **語言**：TypeScript 5.6.x
- **執行環境**：瀏覽器（IIFE bundle，可直接 `<script>` 注入）
- **建置工具**：esbuild（產生 dist/bundle.js）、tsc
- **套件管理**：pnpm（monorepo 管理）、rimraf（清理）、@types/jquery（型別輔助）
- **依賴**：
  - 內部依賴：`@js-to-ts-interfaces/core`（共用工具、iframe 建立、全域差異分析）
  - 無外部執行時依賴，僅開發時型別輔助

## 架構說明

- **核心流程**：
  1.  透過 `injectSearchKey()` 建立乾淨 iframe，對比全域物件，收集所有可用鍵值。
  2.  遞迴遍歷全域物件，支援深度限制（`MAX_DEPTH`），自動辨識 Vue/React 掛載點。
  3.  建立可搜尋索引，並將 `$searchKey()` 函式注入至 window。
  4.  `$searchKey(query, fuzzy)` 支援模糊/精確搜尋，回傳 `{ path, code }[]` 結果。
  5.  可將搜尋結果直接傳給主專案的型別產生器進行 TypeScript 介面生成。
- **設計重點**：
  - 使用 core 套件的 iframe 與全域差異分析工具，確保只索引用戶自定義或框架物件。
  - 支援 Vue (`__ob__`, `$options`) 與 React (`memoizedState`, `updateQueue`) 掛載點自動辨識。
  - 遞迴深度與記憶體消耗可調整，預設為無限深度。

## 快速開始

### 安裝與建置

1. **安裝依賴**  
    在 monorepo 根目錄執行：

   ```sh
   pnpm install
   ```

2. **建置 searchKey 套件**
   ```sh
   pnpm build:searchKey
   ```
   產生 `dist/bundle.js`，可直接於瀏覽器 `<script>` 注入。

### 使用方式

1. **注入 searchKey 至瀏覽器**
   - 於瀏覽器 console 執行 `dist/bundle.js` 內容，或於網頁 `<script>` 載入。
   - 執行：
     ```js
     await injectSearchKey();
     ```
   - 之後可於 console 使用 `$searchKey("store", true)` 進行模糊搜尋。

2. **與主專案整合**
   - 搜尋結果可直接傳給主專案的型別產生器：
     ```js
     const results = window.$searchKey("store", true);
     if (results.length) {
       gen.generate(results[0].code, "Store");
     }
     ```

### 前置需求

- 需於瀏覽器環境執行，無 Node.js 執行時支援。

## 專案結構

```
c:\Users\pl816\OneDrive\文件\git\Js-object-to-ts-interfaces\packages\searchKey\
├── main.ts         # searchKey 核心實作，包含注入、索引、搜尋邏輯
├── package.json    # 套件資訊、依賴、建置腳本
├── README.md       # 套件說明文件
├── tsconfig.json   # TypeScript 設定
└── dist/
		└── bundle.js   # IIFE 瀏覽器用 bundle（建置產物）
```

- 主要開發皆於 `main.ts`，建置後產生 `dist/bundle.js` 供瀏覽器注入。
- 依賴 core 套件（`@js-to-ts-interfaces/core`）提供 iframe 與全域差異分析。

## 主要功能

- **全域鍵值遞迴索引**：自動遍歷 window 物件，收集所有可用鍵值。
- **Vue/React 掛載點自動偵測**：辨識常見框架的 store、root、component 掛載點。
- **fuzzy search 支援**：`$searchKey(query, true)` 可模糊比對關鍵字。
- **深度限制**：可自訂遞迴深度，避免過度消耗記憶體。
- **結果導出**：搜尋結果可直接傳給主專案型別產生器。
- **iframe 差異分析**：利用乾淨 iframe 過濾瀏覽器原生屬性，只索引用戶/框架自定義物件。
- **瀏覽器即時注入**：可於 DevTools console 動態注入與使用。

## 開發流程

1. **開發流程**
   - 於 `main.ts` 撰寫/修改核心邏輯。
   - 使用 pnpm 管理依賴與建置腳本。
   - 透過 `pnpm build:searchKey` 產生 bundle，於瀏覽器測試功能。

2. **建置腳本**
   - `pnpm build:searchKey`：TypeScript 編譯 + esbuild 打包 IIFE
   - `pnpm run clean`：清除建置產物

3. **與主專案協作**
   - 依賴 core 套件，若需擴充全域分析或 iframe 工具，請先於 core 開發並發佈。

## 程式風格與命名慣例

- **TypeScript 標準**：嚴格型別、明確介面定義、避免 any。
- **命名慣例**：
  - 類型/介面：PascalCase（如 `KeyCollector`）
  - 常數：SCREAMING_SNAKE_CASE（如 `MAX_DEPTH`）
  - 變數/函式：camelCase
- **註解**：以繁體中文為主，僅於複雜邏輯或框架偵測處補充說明。
- **匯入**：跨套件一律使用 path alias（如 `@js-to-ts-interfaces/core`），避免相對路徑。
- **自我解釋式程式碼**：優先以清楚命名與結構減少註解需求。

## 測試

- **單元測試**：目前以手動於瀏覽器 console 測試為主，尚未整合自動化測試框架。
- **測試流程**：
  1.  於本地建置後，將 `dist/bundle.js` 載入目標網頁。
  2.  執行 `await injectSearchKey()`，驗證 `$searchKey()` 是否正確注入。
  3.  測試各種搜尋情境（精確/模糊、Vue/React 掛載點、深度限制）。
- **建議**：可考慮未來導入自動化 E2E 測試（如 Playwright）以提升穩定性。

## 貢獻指引

- **開發建議**
  - 先於 core 套件擴充共用工具，再於 searchKey 引用。
  - 變更主流程請詳閱 main.ts 註解，並保持與主專案型別產生器介面一致。
- **提交規範**
  - 請以繁體中文撰寫註解與說明。
  - commit message 建議遵循 Conventional Commits 格式。
- **討論與協作**
  - 有新功能建議或 bug，請先於主專案 issue 討論。
  - PR 請附上測試案例或手動驗證步驟。

---

**免責聲明**：本文件由 [GitHub Copilot](https://docs.github.com/copilot/about-github-copilot/what-is-github-copilot) 在地化產生，可能包含錯誤。如發現不當或錯誤翻譯，請至 [issue](../../issues) 回報。
