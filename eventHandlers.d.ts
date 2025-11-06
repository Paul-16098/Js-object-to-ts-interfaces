/**
 * Represents the possible actions that can be performed by a function.
 */
export declare const enum FnActions {
    /** Continue execution. */
    Continue = 0,
    /** Return from the function. */
    Return = 1,
    /** Evaluate an expression. */
    Eval = 2,
    /** Set a return value. */
    SetReturn = 3,
    /** No action. */
    None = 4
}
/**
 * Enumeration of event names used in the application.
 */
export declare const enum EventType {
    /** Represents the event for retrieving the top type. */
    GetTypeTop = "GetTypeTop",
    /** Represents the event for retrieving the return type. */
    GetTypeReturn = "GetTypeReturn"
}
/**
 * Represents the possible return types for an event handler function.
 */
export type EventHandlerReturn = FnActions.Continue | FnActions.None | [FnActions.Return | FnActions.Eval | FnActions.SetReturn, string];
/**
 * 支援的物件型別
 */
export type GetType_obj_type = null | number | string | bigint | boolean | symbol | undefined | Function | object;
/**
 * Event handler environment type.
 */
export type EventHandlerEnvType = {
    obj: GetType_obj_type;
    InterfaceName: string | undefined;
    depth: number;
    path: Array<string>;
};
/** Event handler argument type for retrieving the return type. */
export type EventHandlerGetTypeReturnArgType = {
    Return: string;
};
/** Event handler argument type for retrieving the top type. */
export type EventHandlerGetTypeTopArgType = {
    key: string;
    element: unknown;
};
/**
 * Event handler argument type for various event handlers.
 */
export type EventHandlerArgType = EventHandlerGetTypeReturnArgType | EventHandlerGetTypeTopArgType;
/**
 * 策略介面：可根據事件擴展多種處理
 */
export interface EventHandlerBase<EventArg extends EventHandlerArgType> {
    readonly on: EventType;
    do(env: EventHandlerEnvType, arg: EventArg): EventHandlerReturn;
}
/**
 * 跳過循環引用
 */
export declare class SkipLoopRef implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventType.GetTypeTop;
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 處理特殊鍵名（jQuery, $）
 */
export declare class JQueryHandler implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventType.GetTypeTop;
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 跳過瀏覽器全域物件
 */
export declare class SkipProperties implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
    on: EventType;
    private readonly skipKeys;
    constructor(skipKeys: string[]);
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeTopArgType): EventHandlerReturn;
}
/**
 * 處理最終返回值（後處理）
 */
export declare class ReturnHandler implements EventHandlerBase<EventHandlerGetTypeReturnArgType> {
    on: EventType.GetTypeReturn;
    rep_list: string[][];
    constructor(rep_list?: Array<Array<string>>);
    do(env: EventHandlerEnvType, arg: EventHandlerGetTypeReturnArgType): EventHandlerReturn;
}
