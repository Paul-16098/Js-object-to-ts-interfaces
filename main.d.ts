/**
 * Represents the possible actions that can be performed by a function.
 *
 * @enum FnActions
 * @property {number} Continue - Continue execution.
 * @property {number} Return - Return from the function.
 * @property {number} Eval - Evaluate an expression.
 * @property {number} SetReturn - Set a return value.
 * @property {number} None - No action.
 */
declare const enum FnActions {
    /**
     * Continue execution.
     */
    Continue = 0,
    /**
     * Return from the function.
     */
    Return = 1,
    /**
     * Evaluate an expression.
     * This action allows for dynamic evaluation of expressions during the event handling.
     */
    Eval = 2,
    /**
     * Set a return value.
     */
    SetReturn = 3,
    /**
     * No action.
     * This action indicates that no further processing is needed for the event.
     */
    None = 4
}
/**
 * Enumeration of event names used in the application.
 *
 * @remarks
 * This enum defines the possible event names that can be emitted or handled.
 *
 * @enum {string}
 * @property {string} GetTypeTop - Represents the event for retrieving the top type.
 * @property {string} GetTypeReturn - Represents the event for retrieving the return type.
 */
declare const enum EventType {
    /**
     * Represents the event for retrieving the top type.
     */
    GetTypeTop = "GetTypeTop",
    /**
     * Represents the event for retrieving the return type.
     */
    GetTypeReturn = "GetTypeReturn"
}
/**
 * Represents the possible return types for an event handler function.
 *
 * @see {@link FnActions}
 */
type EventHandlerReturn = FnActions.Continue | FnActions.None | [FnActions.Return | FnActions.Eval | FnActions.SetReturn, string];
/**
 * 支援的物件型別
 */
type GetType_obj_type = null | number | string | bigint | boolean | symbol | undefined | Function | object;
/**
 * Event handler environment type.
 */
type EventHandlerEnvType = {
    /**
     * @see {@link GetTypeGenerator.generate}
     */
    obj: GetType_obj_type;
    /**
     * @see {@link GetTypeGenerator.generate}
     */
    InterfaceName: string | undefined;
    /**
     * @see {@link GetTypeGenerator.depth}
     */
    depth: number;
    /**
     * @see {@link GetTypeGenerator.path}
     */
    path: Array<string>;
};
/**
 * Event handler argument type for retrieving the return type.
 */
type EventHandlerGetTypeReturnArgType = {
    Return: string;
};
/**
 * Event handler argument type for retrieving the top type.
 */
type EventHandlerGetTypeTopArgType = {
    key: string;
    element: unknown;
};
/**
 * Event handler argument type for various event handlers.
 *
 * @see {@link EventHandlerGetTypeReturnArgType}
 * @see {@link EventHandlerGetTypeTopArgType}
 */
type EventHandlerArgType = EventHandlerGetTypeReturnArgType | EventHandlerGetTypeTopArgType;
/**
 * 策略介面：可根據事件擴展多種處理
 */
interface EventHandlerBase<EventArg extends EventHandlerArgType> {
    readonly on: EventType;
    do(env: EventHandlerEnvType, arg: EventArg): EventHandlerReturn;
}
/**
 * 跳過循環引用
 * @see {@link EventHandlerBase}
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 */
declare class SkipLoopRef implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventType;
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 處理特殊鍵名（jQuery, $）
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
declare class JQueryHandler implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventType;
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 跳過瀏覽器全域物件
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
declare class SkipProperties implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventType;
    private readonly skipKeys;
    constructor(skipKeys: string[]);
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 處理最終返回值（後處理）
 * @implements {EventHandlerBase<EventHandlerGetTypeReturnArgType>}
 * @see {@link EventHandlerBase}
 */
declare class ReturnHandler implements EventHandlerBase<EventHandlerGetTypeReturnArgType> {
    on: EventType;
    rep_list: string[][];
    constructor(rep_list?: Array<Array<string>>);
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeReturnArgType): EventHandlerReturn;
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
declare class GetTypeGenerator {
    /** 設定 */
    private readonly config;
    /**
     * The list of event handlers.
     */
    private _EventHandlerList;
    /**
     * 遞迴深度計數器
     * @remarks This is used to track the depth of recursion during the type generation process.
     */
    private depth;
    /**
     * 屬性路徑
     */
    private readonly path;
    /**
     * 已拜訪集合（偵測循環引用）
     */
    private readonly visited;
    /**
     * init
     */
    private init;
    get EventHandlerList(): EventHandlerBase<EventHandlerArgType>[];
    /**
     * @param handlerList - The list of event handlers to set.
     */
    set EventHandlerList(handlerList: EventHandlerBase<EventHandlerArgType>[]);
    /**
     * @param handler - The event handler to add.
     * @remarks This will add the handler to the list of event handlers.
     * @returns The updated list of event handlers.
     */
    AddEventHandler(handler: EventHandlerBase<EventHandlerArgType>): EventHandlerBase<EventHandlerArgType>[];
    /**
     * Creates an instance of the class.
     * @param printHint - Determines whether to print a hint. Defaults to `true`.
     */
    constructor(c?: typeof this.config);
    private isPrimitiveOrNull;
    /**
     * @returns typeof v
     */
    private getPrimitiveTypeString;
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
    private handleFunctionType;
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
    private markAndCheckCircular;
    private startInterfaceDeclaration;
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
    private openSafeWindowIfNeeded;
    private tryMutateInterfaceStr;
    private interpretHandlerData;
    private runTopHandlersAndMaybeMutateInterfaceStr;
    private applyReturnHandlers;
    generate(obj: GetType_obj_type, InterfaceName?: string): string;
    private generate_back;
    /**
     * 策略執行器：根據事件執行所有策略
     * @param EventName 事件名稱
     * @param obj 目標物件
     * @param InterfaceName 介面名稱
     * @param depth 遞迴深度
     * @param path 屬性路徑
     * @param arg 事件處理器參數
     */
    private runHandlers;
    private finalizeEarly;
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
    private tryHandlePrimitiveOrFunction;
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
    private prepareInterface;
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
    private processKey;
}
