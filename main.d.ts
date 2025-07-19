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
declare const enum EventName {
    /**
     * Represents the event for retrieving the top type.
     */
    GetTypeTop = 0,
    /**
     * Represents the event for retrieving the return type.
     */
    GetTypeReturn = 1
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
    obj: GetType_obj_type;
    InterfaceName: string | undefined;
    depth: number;
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
    element: object[keyof object];
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
    on: EventName;
    do(env: EventHandlerEnvType, arg: EventArg): EventHandlerReturn;
}
/**
 * 跳過循環引用
 * @see {@link EventHandlerBase}
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 */
declare class SkipLoopRef implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventName;
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 處理特殊鍵名（jQuery, $）
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
declare class JQueryHandler implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventName;
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 跳過瀏覽器全域物件
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
declare class SkipProperties implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventName;
    private _skipKeys;
    get skipKeys(): string[];
    constructor(skipKeys: string[]);
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 處理最終返回值（後處理）
 * @implements {EventHandlerBase<EventHandlerGetTypeReturnArgType>}
 * @see {@link EventHandlerBase}
 */
declare class ReturnHandler implements EventHandlerBase<EventHandlerGetTypeReturnArgType> {
    on: EventName;
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
    private path;
    /**
     * 重置計數器和路徑
     * @remarks This method resets the depth counter and the path array to their initial state.
     */
    private reset;
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
     * Determines whether to print hints for unknown types.
     * @remarks If `true`, hints will be printed for types that cannot be determined.
     */
    private printHint;
    /**
     * Creates an instance of the class.
     * @param printHint - Determines whether to print a hint. Defaults to `true`.
     */
    constructor(printHint?: boolean);
    /**
     * 生成 TypeScript 介面字串
     * @param obj 目標物件
     * @param InterfaceName 介面名稱
     * @returns TypeScript 介面字串
     */
    generate(obj: GetType_obj_type, InterfaceName?: string): string;
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
}
declare function ts(object: GetType_obj_type, InterfaceName?: string): void;
