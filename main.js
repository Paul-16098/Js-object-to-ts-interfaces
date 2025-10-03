"use strict";
//#endregion ts-type
/**
 * 跳過循環引用
 * @see {@link EventHandlerBase}
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 */
class SkipLoopRef {
    on = "GetTypeTop" /* EventType.GetTypeTop */;
    do(env, arg) {
        if (arg.element === env.obj) {
            console.debug("ts:ref=>ref", arg.element, env.path);
            return 0 /* FnActions.Continue */;
        }
        return 4 /* FnActions.None */;
    }
}
/**
 * 處理特殊鍵名（jQuery, $）
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
class JQueryHandler {
    on = "GetTypeTop" /* EventType.GetTypeTop */;
    do(env, arg) {
        // depth 1 == top-level (after initial increment in generate)
        if (env.depth <= 1) {
            if (arg.key === "jQuery") {
                return [2 /* FnActions.Eval */, "interfaceStr+='jQuery:JQueryStatic;'"];
            }
            try {
                if (arg.key === "$" &&
                    typeof arg.element === "function" &&
                    arg.element.toString() === "function(e,t){return new w.fn.init(e,t)}") {
                    return [2 /* FnActions.Eval */, "interfaceStr+='$:JQueryStatic;'"];
                }
            }
            catch {
                /* ignore */
            }
        }
        return 4 /* FnActions.None */;
    }
}
/**
 * 跳過瀏覽器全域物件
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
class SkipProperties {
    on = "GetTypeTop" /* EventType.GetTypeTop */;
    skipKeys;
    constructor(skipKeys) {
        this.skipKeys = Array.from(new Set(skipKeys));
    }
    do(env, arg) {
        for (const a_element of this.skipKeys) {
            if (window[a_element] == arg.element) {
                return 0 /* FnActions.Continue */;
            }
        }
        if (this.skipKeys.includes(arg.key)) {
            console.debug("ts:skip", arg.key);
            return 0 /* FnActions.Continue */;
        }
        return 4 /* FnActions.None */;
    }
}
/**
 * 處理最終返回值（後處理）
 * @implements {EventHandlerBase<EventHandlerGetTypeReturnArgType>}
 * @see {@link EventHandlerBase}
 */
class ReturnHandler {
    on = "GetTypeReturn" /* EventType.GetTypeReturn */;
    rep_list;
    constructor(rep_list = []) {
        this.rep_list = rep_list;
    }
    do(env, arg) {
        for (const rep of this.rep_list) {
            if (rep.length !== 2) {
                console.warn("ts:rep_list error", rep);
                continue;
            }
            arg.Return = arg.Return.replaceAll(rep[0], rep[1]);
            console.debug("ts:rep", rep[0], "=>", rep[1]);
        }
        return [3 /* FnActions.SetReturn */, arg.Return];
    }
}
/**
 * The `GetTypeGenerator` class provides functionality to generate TypeScript interface definitions
 * from JavaScript objects at runtime. It supports extensible event handlers for custom processing
 * and can print hints for unknown types or array detection.
 *
 * @remarks
 * - The generator traverses the input object recursively, inferring property types and structure.
 * - Custom event handlers can be registered to intercept or modify the generation process.
 * - Handles functions, native code, arrays, and window/document/self objects with special logic.
 *
 * @example
 * ```typescript
 * const generator = new GetTypeGenerator();
 * const tsInterface = generator.generate(someObject, "MyInterface");
 * console.log(tsInterface);
 * ```
 *
 * @public
 */
class GetTypeGenerator {
    /** 設定 */
    config;
    /**
     * The list of event handlers.
     */
    _EventHandlerList = [
        new SkipLoopRef(),
        new JQueryHandler(),
        new SkipProperties([
            "document",
            "location",
            "history",
            "window",
            "navigation",
            "self",
            "locationbar",
            "scrollbars",
            "customElements",
            "menubar",
            "personalbar",
            "statusbar",
            "toolbar",
            "opener",
            "navigator",
            "external",
            "screen",
            "visualViewport",
            "clientInformation",
            "cookieStore",
            "speechSynthesis",
            GetTypeGenerator.name,
        ]),
        new ReturnHandler([
            ["$:JQueryStatic;$:() => unknown", "$:JQueryStatic"],
            ["jQuery:JQueryStatic;jQuery:() => unknown", "jQuery:JQueryStatic"],
        ]),
    ];
    /**
     * 遞迴深度計數器
     * @remarks This is used to track the depth of recursion during the type generation process.
     */
    depth = 0;
    /**
     * 屬性路徑
     */
    path = [":root:"];
    /**
     * 已拜訪集合（偵測循環引用）
     */
    visited = new WeakSet();
    /**
     * init
     */
    init() {
        this.config.download = this.config.download ?? true;
        this.config.printHint = this.config.printHint ?? false;
    }
    get EventHandlerList() {
        return this._EventHandlerList;
    }
    /**
     * @param handlerList - The list of event handlers to set.
     */
    set EventHandlerList(handlerList) {
        console.debug("ts:SetEventHandlerList", handlerList);
        this._EventHandlerList = handlerList;
    }
    /**
     * @param handler - The event handler to add.
     * @remarks This will add the handler to the list of event handlers.
     * @returns The updated list of event handlers.
     */
    AddEventHandler(handler) {
        console.debug("ts:AddEventHandler", handler);
        this._EventHandlerList.push(handler);
        return this._EventHandlerList;
    }
    /**
     * Creates an instance of the class.
     * @param printHint - Determines whether to print a hint. Defaults to `true`.
     */
    constructor(c = {
        printHint: false,
        download: true,
    }) {
        this.config = { ...c };
        this.init();
    }
    // --- 新增：輔助方法（降低 generate 複雜度） ---
    isPrimitiveOrNull(v) {
        return v === null || (typeof v !== "object" && typeof v !== "function");
    }
    /**
     * @returns typeof v
     */
    getPrimitiveTypeString(v) {
        if (v === null)
            return "null";
        return typeof v;
    }
    /**
     * 將執行期的函式物件轉成對應的 TypeScript 函式型別字串。
     *
     * 行為:
     * - 若為原生（native code）函式，回傳字串 'native-code'（供外層略過輸出）。
     * - 嘗試以正則擷取函式字串的參數區段，成功則組成 '(args...) => unknown'。
     * - 若無法解析參數列表，回傳 '() => unknown'，並在啟用 printHint 時附帶提示註解。
     *
     * 為安全與簡化，不嘗試推斷回傳型別與參數型別，只標示為 unknown。
     *
     * @param fn 需轉換的函式實例。
     * @returns 代表此函式型別的字串，或特殊標記 'native-code'。
     */
    handleFunctionType(fn) {
        const native_fn = /^function [A-Za-z]+\(\) \{ \[native code\] \}$/;
        if (native_fn.test(fn.toString()))
            return "native-code";
        const fn_arguments_RegExp = /^\(.*\)/;
        const fn_str = fn.toString();
        if (fn_arguments_RegExp.test(fn_str)) {
            const fn_type = fn_arguments_RegExp.exec(fn_str)[0];
            return `${fn_type} => unknown`;
        }
        return `() => unknown${this.config.printHint ? "/* warn: type unknown */" : ""}`;
    }
    /**
     * 標記並檢測是否存在循環引用。
     *
     * 流程：
     * 1. 若目標物件已存在於 visited（表示先前遞迴層級已處理過），回傳 true 代表偵測到循環。
     * 2. 否則將物件加入 visited，回傳 false 代表首次出現，可繼續展開其屬性。
     *
     * 為何需要：
     * - 遞迴展開物件結構時避免無窮遞迴（例如物件彼此參照或 self-reference）。
     *
     * @param obj 目前遞迴檢查的物件節點。
     * @returns true 代表已拜訪過（循環引用），false 代表首次拜訪。
     */
    markAndCheckCircular(obj) {
        if (this.visited.has(obj))
            return true;
        this.visited.add(obj);
        return false;
    }
    startInterfaceDeclaration(obj, InterfaceName) {
        if (this.depth === 1) {
            return `/**
 * form https://github.com/Paul-16098/Js-object-to-ts-interfaces
 * url: ${location.href}
 * obj: ${obj.toString()}
 */\ninterface ${InterfaceName ?? "RootType"} {`;
        }
        return "{";
    }
    /**
     * 嘗試在根層 (depth === 1) 且目標物件為 window / document / self 時開啟一個「乾淨」的新視窗。
     *
     * 為何需要:
     * - 透過建立一個獨立的空白視窗 (safeWindow) 取得瀏覽器預設屬性集合，用以比對與過濾原始 window 上的原生屬性，
     *   減少列舉時受到動態屬性或副作用影響。
     *
     * 流程:
     * 1. 判斷 obj 是否為 window | document | self 之一。
     * 2. 只在遞迴第一次展開 (depth === 1) 時開啟新視窗並回傳；否則回傳 null。
     *
     * 使用者責任:
     * - 呼叫端需在後續 finally 區塊判斷 safeWindow 是否存在並關閉 (close) 以避免資源遺漏。
     *
     * @param obj 目前正在推斷型別的根物件或其子節點。
     * @returns 若條件符合則回傳新開啟的 Window 參考；否則回傳 null。
     */
    openSafeWindowIfNeeded(obj) {
        const isWin = obj == window || obj == document || obj == self;
        if (this.depth === 1 && isWin) {
            return open();
        }
        return null;
    }
    tryMutateInterfaceStr(code, mutate) {
        if (!code.startsWith("interfaceStr+=")) {
            console.warn("Blocked eval:", code);
            return;
        }
        try {
            mutate(code);
        }
        catch (e) {
            console.error(e);
        }
    }
    interpretHandlerData(Data, mutate) {
        if (Data === 4 /* FnActions.None */)
            return { action: "none" };
        if (Data === 0 /* FnActions.Continue */)
            return { action: "continue" };
        if (!Array.isArray(Data))
            return { action: "none" };
        const [act, payload] = Data;
        if (act === 1 /* FnActions.Return */) {
            return { action: "return", returnValue: payload };
        }
        if (act === 2 /* FnActions.Eval */) {
            this.tryMutateInterfaceStr(payload, mutate);
        }
        return { action: "none" };
    }
    runTopHandlersAndMaybeMutateInterfaceStr(key, element, obj, InterfaceName, depth, path, mutate) {
        for (const Data of this.runHandlers("GetTypeTop" /* EventType.GetTypeTop */, obj, InterfaceName, depth, path, { key, element })) {
            const result = this.interpretHandlerData(Data, mutate);
            if (result.action !== "none")
                return result;
        }
        return { action: "none" };
    }
    applyReturnHandlers(obj, InterfaceName, interfaceStr) {
        for (const Data of this.runHandlers("GetTypeReturn" /* EventType.GetTypeReturn */, obj, InterfaceName, this.depth, this.path, { Return: interfaceStr })) {
            if (Array.isArray(Data) && Data[0] === 3 /* FnActions.SetReturn */) {
                interfaceStr = Data[1];
            }
        }
        return interfaceStr;
    }
    // --- 重構後的 generate ---
    generate(obj, InterfaceName) {
        this.depth++;
        console.groupCollapsed(this.path[this.path.length - 1]);
        console.debug("ts:", obj, "depth:", this.depth, "path:", this.path);
        // 原始 / 函式快速處理
        const primitiveHandled = this.tryHandlePrimitiveOrFunction(obj);
        if (primitiveHandled)
            return this.finalizeEarly(primitiveHandled);
        // 循環引用
        if (typeof obj === "object" && obj) {
            if (this.markAndCheckCircular(obj)) {
                return this.finalizeEarly("any" + (this.config.printHint ? "/* circular */" : ""));
            }
        }
        // 準備 interface
        const prep = this.prepareInterface(obj, InterfaceName);
        let interfaceStr = prep.interfaceStr;
        let isArray = false;
        try {
            for (const key of Object.keys(obj)) {
                const r = this.processKey({
                    key,
                    obj,
                    InterfaceName,
                    obj_isWindow: prep.obj_isWindow,
                    safeWindow: prep.safeWindow,
                    mutate: (code) => {
                        // eslint-disable-next-line no-eval
                        eval(code);
                    },
                    interfaceStr,
                });
                if (r.earlyReturn)
                    return this.finalizeEarly(r.earlyReturn);
                if (r.skip)
                    continue;
                interfaceStr = r.interfaceStr;
                if (r.isArrayKey)
                    isArray = true;
            }
        }
        finally {
            if (prep.safeWindow && !prep.safeWindow.closed)
                prep.safeWindow.close();
        }
        interfaceStr += "}";
        if (isArray && this.config.printHint)
            interfaceStr += "/* Is it are `Array`? */";
        interfaceStr = this.applyReturnHandlers(obj, InterfaceName, interfaceStr);
        this.generate_back();
        if (this.depth === 0 && this.config.download) {
            const downloadEle = document.createElement("a");
            downloadEle.href =
                "data:text/plain;charset=utf-8," + encodeURIComponent(interfaceStr);
            downloadEle.download = (InterfaceName ?? "RootType") + ".d.ts";
            downloadEle.click();
            downloadEle.remove();
        }
        return interfaceStr;
    }
    generate_back() {
        this.path.pop();
        this.depth--;
        console.groupEnd();
    }
    /**
     * 策略執行器：根據事件執行所有策略
     * @param EventName 事件名稱
     * @param obj 目標物件
     * @param InterfaceName 介面名稱
     * @param depth 遞迴深度
     * @param path 屬性路徑
     * @param arg 事件處理器參數
     */
    runHandlers(EventName, obj, InterfaceName, depth, path, arg) {
        const ReturnList = [];
        for (const Fn of this.EventHandlerList) {
            if (Fn.on !== EventName)
                continue;
            console.debug(Fn);
            ReturnList.push(Fn.do({
                obj: obj,
                InterfaceName: InterfaceName,
                depth: depth,
                path: path,
            }, arg));
        }
        return ReturnList;
    }
    // 新增：早期返回統一出口
    finalizeEarly(val) {
        this.generate_back();
        return val;
    }
    // 新增：處理原始型別與函式（可返回型別字串，否則 null）
    /**
     * 嘗試直接判斷並回傳原始型別（含 null）或函式的型別字串。
     *
     * @param obj 要檢測的值。
     * @returns
     * - 若為原始型別或 null：回傳對應的 TypeScript 型別字串（如 'string', 'number', 'null'）。
     * - 若為函式：回傳其參數列推斷出的簽章字串（例如 '(a,b)=> unknown'），
     *   若無法解析參數列則回傳 '() => unknown'（可能附帶提示註解）。
     * - 其他（物件 / 陣列等可遞迴結構）：回傳 null 以交由後續遞迴處理。
     *
     * @remarks
     * 此方法的目的在於及早處理「可立即確定型別」的節點，降低遞迴深度與複雜度；
     * 回傳 null 代表該值仍需進一步結構展開。
     */
    tryHandlePrimitiveOrFunction(obj) {
        if (this.isPrimitiveOrNull(obj))
            return this.getPrimitiveTypeString(obj);
        if (typeof obj === "function")
            return this.handleFunctionType(obj);
        return null;
    }
    // 新增：準備 interface 前置資訊
    /**
     * 準備建立介面宣告所需的前置資訊。
     *
     * 用途:
     * - 產出初始的 interface 宣告字串 (interfaceStr)（根層會含有來源資訊註解）。
     * - 判斷目前目標是否為 window / document / self (obj_isWindow) 以便後續做瀏覽器原生屬性過濾。
     * - 視需要開啟一個乾淨視窗 (safeWindow) 做為比對基準（僅在 depth===1 且目標為全域物件時）。
     *
     * 為何抽離:
     * - 降低 generate 主流程複雜度，集中前置判斷邏輯與相關副作用（建立新視窗）。
     *
     * 資源管理:
     * - 若回傳的 safeWindow 不為 null，呼叫端（generate）在 finally 區塊負責關閉避免資源洩漏。
     *
     * @param obj 目前欲分析/展開型別的目標物件。
     * @param InterfaceName 根層（depth===1）欲輸出的介面名稱；未提供時預設為 "RootType"。
     * @returns
     * - interfaceStr: 初始介面宣告片段（尚未補上結尾大括號）。
     * - safeWindow: 若根目標為 window / document / self 並符合條件則為新開啟視窗，否則為 null。
     * - obj_isWindow: 布林值，指出 obj 是否為瀏覽器全域相關物件（供屬性過濾邏輯使用）。
     *
     * @internal 僅供 generate 流程內部使用，不建議外部呼叫。
     */
    prepareInterface(obj, InterfaceName) {
        const interfaceStr = this.startInterfaceDeclaration(obj, InterfaceName);
        const obj_isWindow = obj == window || obj == document || obj == self;
        const safeWindow = this.openSafeWindowIfNeeded(obj);
        return { interfaceStr, safeWindow, obj_isWindow };
    }
    /**
     * 處理單一可列舉屬性並回傳更新後的介面片段。
     *
     * 流程概要:
     * 1. 執行頂層事件處理器 (EventType.GetTypeTop)，可能：
     *    - 要求略過 (skip)
     *    - 要求提早結束並直接回傳最終型別字串 (earlyReturn)
     *    - 透過安全的 mutate 介面插入自訂片段 (僅允許 "interfaceStr+=" 開頭)
     * 2. 若為 window / document / self，且屬性在 safeWindow 中出現且值一致則跳過（過濾原生環境屬性）。
     * 3. 進行遞迴 generate 以取得該屬性對應之型別字串。
     * 4. 追加成員宣告到 interfaceStr。
     * 5. 判斷 key 是否為純數字以協助外層推斷「可能為陣列」。
     *
     * 副作用與狀態:
     * - 呼叫 generate 時會暫時 push key 至 path（generate 完成後於 finalize 流程 pop）。
     * - 事件處理器可經由 FnActions.Eval 操作 interfaceStr（受 tryMutateInterfaceStr 保護）。
     *
     * @param params.key 目前處理的屬性名稱。
     * @param params.obj 當前遞迴節點物件。
     * @param params.InterfaceName 最頂層介面名稱（僅深度 1 有意義）。
     * @param params.obj_isWindow 是否為 window / document / self 三者之一。
     * @param params.safeWindow 乾淨對照用視窗物件（僅頂層且為 window/document/self 時存在），否則為 null。
     * @param params.mutate 安全執行 "interfaceStr+=" 形式程式碼的函式。
     * @param params.interfaceStr 累積中的介面宣告字串（不可就地突變原參考，需回傳新值）。
     *
     * @returns
     * - interfaceStr: 更新後的介面字串累積結果。
     * - skip: 若為 true 表示本屬性已被略過（不追加宣告）。
     * - earlyReturn: 若存在，表示應立即結束整體 generate 並以此值為最終結果。
     * - isArrayKey: 若 key 為純數字（/^\d+$/）則為 true，用於協助外層判斷是否顯示「可能為陣列」提示。
     *
     * @internal 僅供類內部組裝流程使用，不建議外部呼叫。
     */
    processKey(params) {
        const { key, obj, InterfaceName, obj_isWindow, safeWindow, mutate } = params;
        let { interfaceStr } = params;
        const element = obj[key];
        // 頂層事件處理
        const handlerResult = this.runTopHandlersAndMaybeMutateInterfaceStr(key, element, obj, InterfaceName, this.depth, this.path, mutate);
        if (handlerResult.action === "continue")
            return { interfaceStr, skip: true, isArrayKey: false };
        if (handlerResult.action === "return")
            return {
                interfaceStr,
                skip: true,
                earlyReturn: handlerResult.returnValue,
                isArrayKey: false,
            };
        // window 對應屬性過濾
        if (obj_isWindow && safeWindow && safeWindow[key] === element) {
            return { interfaceStr, skip: true, isArrayKey: false };
        }
        // 遞迴
        this.path.push(key);
        const ElementType = this.generate(element);
        if (ElementType === "native-code") {
            // 子層已清理 path
            return { interfaceStr, skip: true, isArrayKey: false };
        }
        interfaceStr += `${key}:${ElementType};${this.config.printHint ? "/** `" + String(element) + "` */" : ""}`;
        return {
            interfaceStr,
            skip: false,
            isArrayKey: /^\d+$/.test(key),
        };
    }
}
// 用法範例
new GetTypeGenerator({ download: false }).generate(window, "Window");
//# sourceMappingURL=main.js.map