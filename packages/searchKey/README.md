# searchKey

將頁面上的執行期物件建立可搜尋索引，並注入 `$searchKey()` 以跨「全域」與「框架掛載節點」定位值/函數。

此子套件已搬移整合至 monorepo：Js-object-to-ts-interfaces/packages/searchKey。

- 入口：`main.ts`（編譯後為 `main.js`）
- 編譯：`pnpm -w -C ../../ build` 或在根目錄 `pnpm -w -F @js-to-ts-interfaces/search-key build`
- 使用方式與原專案一致。

> 注意：此程式設計在瀏覽器環境執行，內含對 `window`/`document` 的使用。
