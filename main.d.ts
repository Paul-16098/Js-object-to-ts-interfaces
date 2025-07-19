/**
 * TypeScript Interface 生成器
 * 將 JS 對象自動轉換為 TypeScript 介面定義。
 * 支援遞迴解析、策略擴展、特殊鍵跳過、函數類型推斷等。
 */
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
    Continue = 0,
    Return = 1,
    Eval = 2,
    SetReturn = 3,
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
declare enum EventName {
    GetTypeTop = "GetTypeTop",
    GetTypeReturn = "GetTypeReturn"
}
/**
 * Represents the possible return types for an event handler function.
 *
 * - `FnActions.Continue`: Indicates that the event handler should continue processing.
 * - `FnActions.None`: Indicates that no action should be taken.
 * - A tuple containing one of `FnActions.Return`, `FnActions.Eval`, or `FnActions.SetReturn` and a `string` value:
 *   - `FnActions.Return`: Indicates a return action with an associated string value.
 *   - `FnActions.Eval`: Indicates an evaluation action with an associated string value.
 *   - `FnActions.SetReturn`: Indicates setting a return value with an associated string value.
 */
type EventHandlerReturn = FnActions.Continue | FnActions.None | [FnActions.Return | FnActions.Eval | FnActions.SetReturn, string];
/**
 * 支援的物件型別
 */
type GetType_obj_type = null | number | string | bigint | boolean | symbol | undefined | Function | object;
/**
 * 策略介面：可根據事件擴展多種處理
 */
interface EventHandlerBase {
    on: EventName;
    do(this: {
        ver: {
            obj: GetType_obj_type;
            InterfaceName: string | undefined;
            depth: number;
            path: Array<string>;
        };
    }, arg: {
        key: string;
        element: object[keyof object];
    } | {
        Return: string;
    }): EventHandlerReturn;
}
/**
 * 跳過循環引用
 */
declare class SkipLoopRef implements EventHandlerBase {
    on: EventName;
    do(this: {
        ver: {
            obj: GetType_obj_type;
            InterfaceName: string | undefined;
            depth: number;
            path: Array<string>;
        };
    }, arg: {
        key: string;
        element: object[keyof object];
    }): EventHandlerReturn;
}
/**
 * 處理特殊鍵名（jQuery, $）
 */
declare class JQueryHandler implements EventHandlerBase {
    on: EventName;
    do(this: {
        ver: {
            obj: GetType_obj_type;
            InterfaceName: string | undefined;
            depth: number;
            path: Array<string>;
        };
    }, arg: {
        key: string;
        element: object[keyof object];
    }): EventHandlerReturn;
}
/**
 * 跳過瀏覽器全域物件
 */
declare class SkipWindowProperties implements EventHandlerBase {
    on: EventName;
    do(this: {
        ver: {
            obj: GetType_obj_type;
            InterfaceName: string | undefined;
            depth: number;
            path: Array<string>;
        };
    }, arg: {
        key: string;
        element: object[keyof object];
    }): EventHandlerReturn;
}
/**
 * 處理最終返回值（後處理）
 */
declare class ReturnHandler implements EventHandlerBase {
    on: EventName;
    do(this: {
        ver: {
            obj: GetType_obj_type;
            InterfaceName: string | undefined;
            depth: number;
            path: Array<string>;
        };
    }, arg: {
        Return: string;
    }): EventHandlerReturn;
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
    private _EventHandlerList;
    get EventHandlerList(): EventHandlerBase[];
    set EventHandlerList(value: EventHandlerBase[]);
    AddEventHandler(handler: EventHandlerBase): void;
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
     * @param depth 遞迴深度
     * @param path 屬性路徑
     * @returns TypeScript 介面字串
     */
    generate(obj: GetType_obj_type, InterfaceName?: string, depth?: number, path?: Array<string>): string;
    /**
     * 策略執行器：根據事件執行所有策略
     */
    private runHandlers;
}
declare function ts(object: GetType_obj_type, InterfaceName?: string): void;
