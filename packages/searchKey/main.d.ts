/**
 * 合併自原始 searchKey 專案的主檔案。
 * 來源：workspace 根目錄的 `searchKey/main.ts`。
 */
/**
 * 最大搜索深度。此參數影響注入時間和內存佔用，謹慎修改
 */
declare const MAX_DEPTH: number;
/**
 * $searchKey 回傳結果型別
 */
type SearchResult = {
    path: string;
    code: any;
};
interface Window {
    $searchKey?: (key: string, fuzzy?: boolean) => SearchResult[];
}
/**
 * 忽略的屬性
 */
declare const IGNORE_PROPS: Set<string>;
/**
 * vue額外忽略的屬性
 */
declare const VUE_IGNORE_PROPS: Set<string>;
/**
 * react額外忽略的屬性
 */
declare const REACT_IGNORE_PROPS: Set<string>;
/**
 * Safely evaluates a string of JavaScript code with an optional safety check.
 *
 * @param stringCode - The string of JavaScript code to evaluate.
 * @param safety - A boolean indicating whether to perform a safety check on the code. Default is true.
 * @returns The result of the evaluated code.
 * @throws Will throw an error if the safety check is enabled and the code contains blacklisted keywords or patterns.
 */
declare function newEval(stringCode: string, safety?: boolean): any;
/**
 * 是否為純數字
 * @param str
 * @returns boolean
 */
declare function isNum(str: string): boolean;
/**
 * Returns the type of the given item as a lowercase string.
 *
 * @param item - The item whose type is to be determined.
 * @returns The type of the item as a lowercase string.
 */
declare function getType(item: any): string;
/**
 * Retrieves all property names (including inherited ones) from an object.
 *
 * @param obj - The object from which to retrieve the property names.
 * @returns A Set containing all property names of the object.
 */
declare function getAllProps(obj: any): Set<string>;
/**
 * Retrieves all nodes in the document, including elements and comments.
 *
 * This function uses a TreeWalker to traverse the entire document starting
 * from the document's root element. It collects all nodes that are either
 * elements or comments and returns them in an array.
 *
 * @returns {Node[]} An array containing all element and comment nodes in the document.
 */
declare function getAllNodes(): Node[];
/**
 * 屬性收集類
 */
declare class KeyCollector {
    ignoreProps: Set<string>;
    allKeys: Map<string, Set<string | {
        [k: string]: any;
        path: string;
    }>>;
    taskList: Promise<any>[];
    refs: WeakMap<object, {
        path?: string;
        root: string;
        parent?: any;
        extra?: any;
        key?: any;
        added?: boolean;
    }>;
    tempKeys: Map<string, Set<{
        value: any;
        parent: any;
    }>>;
    discardKeys: Map<any, {
        root: any;
        parent?: any;
        key?: any;
        extra: any;
    }>;
    constructor(ignoreProps: Set<string>);
    _init(): void;
    private depthCache;
    _calcDepth(obj: any): number;
    _collectKeys(obj: {
        [x: string]: any;
    } | null, item: {
        root: any;
        parent?: any;
        key?: any;
        extra: any;
    }, recordDiscard?: boolean, depth?: number): Promise<void>;
    _generatePath(obj: {
        path: string;
        parent: any;
        root: any;
        extra: any;
        key: any;
    }): void;
    _generateAllPaths(): void;
    addKey(key: any, path: string, extra?: null): void;
    collect(obj: Window, root: string, extra?: any): void;
    getAllKeys(): Promise<Map<string, Set<string | {
        [k: string]: any;
        path: string;
    }>>>;
}
declare const tag: string;
