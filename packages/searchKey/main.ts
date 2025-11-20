import {
  createCleanIframe,
  diffGlobalKeys,
  isNumericKey,
  isNativeFunction,
} from "@js-to-ts-interfaces/core";

/**
 * 合併自原始 searchKey 專案的主檔案。
 * 來源：workspace 根目錄的 `searchKey/main.ts`。
 */
/**
 * 最大搜索深度。此參數影響注入時間和內存佔用，謹慎修改
 */
const MAX_DEPTH: number = Infinity;

/**
 * $searchKey 回傳結果型別
 */
type SearchResult = { path: string; code: any };

// 模組化後需使用 declare global 擴充 Window
declare global {
  interface Window {
    $searchKey?: (key: string, fuzzy?: boolean) => SearchResult[];
  }
}

/**
 * 忽略的屬性
 */
const IGNORE_PROPS: Set<string> = new Set<string>([
  // 忽略數組長度
  "length",
  // 忽略函數參數
  "arguments",
  // 忽略函數調用者
  "caller",
  // 忽略原型
  "prototype",
  // 忽略構造函數
  "constructor",
]);

/**
 * vue額外忽略的屬性
 */
const VUE_IGNORE_PROPS: Set<string> = new Set([
  "__ob__", // Vue 的觀察者對象
  "$options", // Vue 實例的選項
  "_$vnode", // Vue 的虛擬節點
]);

/**
 * react額外忽略的屬性
 */
const REACT_IGNORE_PROPS: Set<string> = new Set([
  "memoizedState", // React 的內部狀態
  "updateQueue", // React 的更新隊列
  "refs", // React 的引用
  "context", // React 的上下文
]);

/**
 * Safely evaluates a string of JavaScript code with an optional safety check.
 *
 * @param stringCode - The string of JavaScript code to evaluate.
 * @param safety - A boolean indicating whether to perform a safety check on the code. Default is true.
 * @returns The result of the evaluated code.
 * @throws Will throw an error if the safety check is enabled and the code contains blacklisted keywords or patterns.
 */
function newEval(stringCode: string, safety: boolean = true) {
  const blackList: Array<string | RegExp> = [
    "eval",
    "function",
    "let",
    "var",
    "document",
    "alert",
    "navigator",
    "localStorage",
    "sessionStorage",
    "console",
    "XMLHttpRequest",
    "fetch",
    "import",
    "export",
    "async",
    "await",
    "with",
    "Promise",
    /window\.[0-9a-zA-Z_]+ *=/,
  ];

  if (
    safety &&
    blackList.some((value) =>
      typeof value === "string"
        ? stringCode.includes(value)
        : value.test(stringCode),
    )
  ) {
    throw new Error(`不允許的關鍵字或代碼: ${stringCode}`);
  }

  return new Function(`${safety ? "return" : ""} ${stringCode}`)();
}

/**
 * Returns the type of the given item as a lowercase string.
 *
 * @param item - The item whose type is to be determined.
 * @returns The type of the item as a lowercase string.
 */
function getType(item: any): string {
  return Object.prototype.toString.call(item).slice(8, -1).toLowerCase();
}

/**
 * Retrieves all property names (including inherited ones) from an object.
 *
 * @param obj - The object from which to retrieve the property names.
 * @returns A Set containing all property names of the object.
 */
function getAllProps(obj: any): Set<string> {
  const props = new Set<string>();
  while (obj && obj !== Object.prototype && obj !== Function.prototype) {
    Object.getOwnPropertyNames(obj).forEach((prop) => props.add(prop));
    obj = Object.getPrototypeOf(obj);
  }
  return props;
}

/**
 * Retrieves all nodes in the document, including elements and comments.
 *
 * This function uses a TreeWalker to traverse the entire document starting
 * from the document's root element. It collects all nodes that are either
 * elements or comments and returns them in an array.
 *
 * @returns {Node[]} An array containing all element and comment nodes in the document.
 */
function getAllNodes(): Node[] {
  const result: Node[] = [];
  const walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
    null,
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    result.push(node);
  }

  return result;
}

/**
 * 屬性收集類
 */
class KeyCollector {
  ignoreProps: Set<string>;
  allKeys = new Map<string, Set<string | { path: string; [k: string]: any }>>();
  taskList = new Array<Promise<any>>();
  refs!: WeakMap<
    object,
    {
      path?: string;
      root: string;
      parent?: any;
      extra?: any;
      key?: any;
      added?: boolean;
    }
  >;
  tempKeys!: Map<string, Set<{ value: any; parent: any }>>;
  discardKeys!: Map<any, { root: any; parent?: any; key?: any; extra: any }>;
  constructor(ignoreProps: Set<string>) {
    this.ignoreProps = ignoreProps;
    this._init();
  }
  _init() {
    console.debug("init KeyCollector");
    this.refs = new WeakMap([
      [
        window,
        {
          path: "window",
          root: "window",
          // root 沒有父層，避免 window.parent===window 導致深度計算死循環
          parent: undefined,
        },
      ],
    ]);
    this.tempKeys = new Map();
    this.discardKeys = new Map();
  }
  private depthCache: Map<any, number> = new Map();

  _calcDepth(obj: any) {
    const start = obj;
    if (this.depthCache.has(start)) {
      return this.depthCache.get(start)!;
    }
    let depth = 0;
    let current = obj;
    let item = this.refs.get(current);
    // 逐層往上直到沒有 parent
    while (item && item.parent) {
      current = item.parent;
      item = this.refs.get(current);
      depth++;
      // 安全防護：深度異常時提前退出
      if (depth > 1e4) break;
    }
    this.depthCache.set(start, depth);
    return depth;
  }
  async _collectKeys(
    obj: { [x: string]: any } | null,
    item: { root: any; parent?: any; key?: any; extra: any },
    recordDiscard = true,
    depth = 0,
  ) {
    if (obj === null || (typeof obj !== "function" && typeof obj !== "object"))
      return;
    if (obj instanceof Node) return;
    if (MAX_DEPTH > 0 && depth >= MAX_DEPTH) {
      if (recordDiscard) this.discardKeys.set(obj, item);
      return;
    }
    console.debug("collectKeys:", obj, item, recordDiscard, depth);
    if (this.refs.has(obj as object)) {
      if (depth < this._calcDepth(obj)) this.refs.set(obj, item);
      return;
    }
    this.refs.set(obj, item);
    const keys = getAllProps(obj);
    for (const key of keys) {
      if (!this.ignoreProps.has(key)) {
        let value;
        try {
          value = (obj as any)[key];
        } catch (e) {
          continue;
        }
        if (value instanceof Promise) {
          value.catch(() => {});
          continue;
        }
        const val =
          this.tempKeys.get(key) || new Set<{ value: any; parent: any }>();
        val.add({ value, parent: obj });
        this.tempKeys.set(key, val);
        const _item = {
          root: item.root,
          parent: obj,
          key: key,
          extra: item.extra,
        };
        await this._collectKeys(value, _item, recordDiscard, depth + 1);
      }
    }
  }
  _generatePath(obj: {
    path: string;
    parent: any;
    root: any;
    extra: any;
    key: any;
  }) {
    if (obj.path) return;
    if (!obj.parent) {
      obj.path = obj.root;
      return;
    }
    const parent: any = this.refs.get(obj.parent);
    obj.extra = parent.extra;
    this._generatePath(parent);
    obj.path =
      parent.path + (isNumericKey(obj.key) ? `[${obj.key}]` : `['${obj.key}']`);
  }
  _generateAllPaths() {
    for (const [key, val] of this.tempKeys) {
      for (const obj of val) {
        const item = this.refs.get(obj.value) as {
          [x: string]: any;
          path: string;
          root: string;
          parent: Window;
          extra: any;
          key: any;
        };
        if (item && item.key === key) {
          if (!item.added) {
            this._generatePath(item);
            this.addKey(key, item.path, item.extra);
            item.added = true;
          }
        } else {
          const parent = this.refs.get(obj.parent) as {
            [x: string]: any;
            path: string;
            root: string;
            parent: Window;
            extra: any;
            key: any;
          };
          this._generatePath(parent);
          const path = isNumericKey(key)
            ? `${parent.path}[${key}]`
            : `${parent.path}['${key}']`;
          this.addKey(key, path, parent.extra);
        }
      }
    }
  }
  addKey(key: any, path: string, extra = null) {
    const arr =
      this.allKeys.get(key) ||
      new Set<string | { path: string; [k: string]: any }>();
    if (extra && typeof extra === "object") {
      arr.add({ path, ...(extra as Record<string, any>) });
    } else {
      arr.add(path);
    }
    this.allKeys.set(key, arr);
  }
  collect(obj: Window, root: string, extra: any = null) {
    console.debug("collect:", obj, root, extra);
    let key;
    if (extra && Object.hasOwn(extra, "prop")) {
      key = extra.prop;
    } else {
      const keys = String.prototype.match.call(
        root,
        /(?<=[.\[]['"]?)[^'".\[\]]+/g,
      );
      if (keys) key = keys.pop();
    }
    this.taskList.push(this._collectKeys(obj, { root, key, extra }));
  }
  async getAllKeys() {
    console.debug("getAllKeys:", this.taskList);
    await Promise.allSettled(this.taskList);
    // 處理丟棄的鍵
    await Promise.allSettled(
      [...this.discardKeys.entries()].map(([obj, item]) => {
        const depth = this._calcDepth(item.parent) + 1;
        if (depth < MAX_DEPTH) {
          return this._collectKeys(obj, item, false, depth);
        }
      }),
    );
    this._generateAllPaths();
    this._init();
    return this.allKeys;
  }
}

/**
 * 可選注入函數:建立並注入 `$searchKey` 全域方法。
 * 呼叫後回傳注入的函數參考與分析後的鍵集合(供進階使用)。
 *
 * @param options.globalName 注入的全域名稱,預設 `$searchKey`
 * @param options.fuzzy 是否預設啟用 fuzzy 模式(僅影響使用者未傳第三參數時)
 * @param options.maxDepth 重新指定最大搜索深度(覆蓋 MAX_DEPTH)
 * @param options.log 是否輸出 console 訊息
 */

/**
 * Helper function to collect keys from global properties.
 */
async function collectGlobalKeys(
  globalProps: Record<string, string[]>,
): Promise<Map<string, Set<string | { path: string; [k: string]: any }>>> {
  const kc = new KeyCollector(IGNORE_PROPS);
  for (const type in globalProps) {
    for (const key of globalProps[type]) {
      const path = `window['${key}']`;
      kc.addKey(key, path);
      kc.collect((window as any)[key], path);
    }
  }
  return kc.getAllKeys();
}

/**
 * Helper function to collect keys from framework-mounted nodes (Vue/React).
 */
async function collectFrameworkKeys() {
  const vkc = new KeyCollector(new Set([...IGNORE_PROPS, ...VUE_IGNORE_PROPS]));
  const rkc = new KeyCollector(
    new Set([...IGNORE_PROPS, ...REACT_IGNORE_PROPS]),
  );

  for (const node of getAllNodes()) {
    for (const prop of Object.getOwnPropertyNames(node)) {
      if (prop.startsWith("__vue")) {
        vkc.collect((node as any)[prop], `node['${prop}']`, { node });
      }
      if (prop.startsWith("__react")) {
        rkc.collect((node as any)[prop], `node['${prop}']`, { node });
      }
    }
  }

  const vueKeys = await vkc.getAllKeys();
  const reactKeys = await rkc.getAllKeys();
  return { vueKeys, reactKeys };
}

export async function injectSearchKey(options?: {
  globalName?: string;
  fuzzy?: boolean;
  maxDepth?: number;
  log?: boolean;
}) {
  const tag =
    window === window.top ? "top" : location.origin + location.pathname;
  const {
    globalName = "$searchKey",
    fuzzy = false,
    maxDepth,
    log = true,
  } = options || {};
  if (typeof maxDepth === "number" && maxDepth > 0) {
    // 覆蓋 MAX_DEPTH (仍保持非嚴格，僅影響後續遞迴)
    (globalThis as any).__SEARCH_KEY_MAX_DEPTH_OVERRIDE__ = maxDepth;
  }
  if ((globalThis as any)[globalName]) {
    if (log) console.log(`${globalName} 已存在，跳過重新注入。`);
    return { fn: (window as any)[globalName] as typeof window.$searchKey };
  }
  const { win: iWindow, cleanup } = createCleanIframe();
  try {
    // 取得全域差異（僅需要 window 與乾淨 iframe window 鍵差）
    const globalProps: Record<string, string[]> = diffGlobalKeys(
      window,
      iWindow,
    );
    console.log(`${tag} 全局屬性：\n`, globalProps);

    // 注入函數：蒐集全域鍵
    const globalKeys = await collectGlobalKeys(globalProps);

    // 掃描框架掛載節點
    const { vueKeys, reactKeys } = await collectFrameworkKeys();

    /**
     * Converts a Set of mixed entries (strings or objects with path property) to an array of path strings.
     */
    function convertSetToPaths(set: Set<any> | undefined): string[] {
      if (!set) return [];
      const paths: string[] = [];
      for (const entry of set) {
        if (typeof entry === "string") {
          paths.push(entry);
        } else if (
          entry &&
          typeof entry === "object" &&
          typeof entry.path === "string"
        ) {
          paths.push(entry.path);
        }
      }
      return paths;
    }

    /**
     * Searches a single key collection for matching keys and returns their paths.
     */
    function searchInKeyCollection(
      keyCollection: Map<string, Set<any>>,
      searchKey: string,
      useFuzzy: boolean,
    ): string[] {
      if (useFuzzy) {
        const lowerKey = searchKey.toLowerCase();
        const paths: string[] = [];
        for (const _key of keyCollection.keys()) {
          if (_key.toLowerCase().includes(lowerKey)) {
            paths.push(...convertSetToPaths(keyCollection.get(_key)));
          }
        }
        return paths;
      }
      return convertSetToPaths(keyCollection.get(searchKey));
    }

    /**
     * Safely evaluates a path string to retrieve the actual object reference.
     */
    function evaluatePathSafely(path: string): any {
      try {
        return newEval(`return ${path}`, false);
      } catch {
        return undefined;
      }
    }

    /**
     * Checks if a search result is valid (non-null, non-native-function).
     */
    function isValidSearchResult(item: SearchResult): boolean {
      if (!item?.code) return false;
      if (typeof item.code === "function") {
        return !isNativeFunction(item.code);
      }
      return true;
    }

    /**
     * Searches for a key in multiple key collections and returns an array of objects containing the path and evaluated code.
     *
     * @param {string} key - The key to search for.
     * @param {boolean} [fuzzy=false] - Whether to perform a fuzzy search (case-insensitive and partial match).
     * @returns {{ path: string; code: any; }[]} An array of objects, each containing the path and evaluated code.
     *
     * The function searches through three key collections: `globalKeys`, `vueKeys`, and `reactKeys`.
     * If `fuzzy` is true, it performs a case-insensitive search and includes keys that partially match the input key.
     * If `fuzzy` is false, it performs an exact match search.
     *
     * The results are evaluated using the `newEval` function and filtered to exclude native functions.
     */
    function $searchKey(key: string, _fuzzy: boolean = fuzzy): SearchResult[] {
      const useFuzzy = _fuzzy === true;

      // Collect paths from all three key collections
      const allPaths = [
        ...searchInKeyCollection(globalKeys, key, useFuzzy),
        ...searchInKeyCollection(vueKeys, key, useFuzzy),
        ...searchInKeyCollection(reactKeys, key, useFuzzy),
      ];

      // Deduplicate paths
      const uniquePaths = Array.from(new Set(allPaths));

      // Evaluate paths and create results
      const results: SearchResult[] = uniquePaths.map((path) => ({
        path,
        code: evaluatePathSafely(path),
      }));

      // Filter out invalid results and native functions
      return results.filter(isValidSearchResult);
    }
    // 將函數暴露到全域以便於在控制台或其他腳本中使用（避免覆蓋既有同名函數）
    (globalThis as any)[globalName] = $searchKey;
    if (log) console.log(`${globalName} 函數已注入！`, $searchKey);
    return { fn: $searchKey, globalKeys, vueKeys, reactKeys };
  } finally {
    // 清理隱藏 iframe，避免長駐 DOM
    cleanup();
  }
}
