"use strict";
/**
 * TypeScript Interface 生成器
 * 將 JS 對象自動轉換為 TypeScript 介面定義。
 * 支援遞迴解析、策略擴展、特殊鍵跳過、函數類型推斷等。
 */
/**
 * 跳過循環引用
 * @see {@link EventHandlerBase}
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 */
class SkipLoopRef {
    on = 0 /* EventName.GetTypeTop */;
    do(env, arg) {
        if (arg.element === env.obj) {
            console.warn("ts:ref=>ref", arg.element, env.path);
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
    on = 0 /* EventName.GetTypeTop */;
    do(env, arg) {
        if (env.depth === 0) {
            if (arg.key === "jQuery") {
                return [2 /* FnActions.Eval */, "appt+='jQuery:JQueryStatic;'"];
            }
            if (arg.key === "$" &&
                arg.element.toString() ===
                    "function(e,t){return new w.fn.init(e,t)}") {
                return [2 /* FnActions.Eval */, "appt+='$:JQueryStatic;'"];
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
    on = 0 /* EventName.GetTypeTop */;
    _skipKeys;
    get skipKeys() {
        return this._skipKeys;
    }
    constructor(skipKeys) {
        this._skipKeys = Array.from(new Set(skipKeys));
    }
    do(env, arg) {
        for (const a_element of this._skipKeys) {
            if (window[a_element] == arg.element) {
                return 0 /* FnActions.Continue */;
            }
        }
        if (this._skipKeys.includes(arg.key)) {
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
    on = 1 /* EventName.GetTypeReturn */;
    do(env, arg) {
        return [
            3 /* FnActions.SetReturn */,
            arg.Return.replaceAll("$:JQueryStatic;$:() => unknown", "$:JQueryStatic").replaceAll("jQuery:JQueryStatic;jQuery:() => unknown", "jQuery:JQueryStatic"),
        ];
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
        new ReturnHandler(),
    ];
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
     * Determines whether to print hints for unknown types.
     * @remarks If `true`, hints will be printed for types that cannot be determined.
     */
    printHint;
    /**
     * Creates an instance of the class.
     * @param printHint - Determines whether to print a hint. Defaults to `true`.
     */
    constructor(printHint = true) {
        this.printHint = printHint;
    }
    /**
     * 生成 TypeScript 介面字串
     * @param obj 目標物件
     * @param InterfaceName 介面名稱
     * @param depth 遞迴深度
     * @param path 屬性路徑
     * @returns TypeScript 介面字串
     */
    generate(obj, InterfaceName, depth = 0, path = ["The Object"]) {
        console.groupCollapsed(path[path.length - 1]);
        let safeWindow = null;
        let interfaceStr = "";
        try {
            console.log("ts:", obj, "depth:", depth, "path:", path);
            if (obj === null)
                return "null";
            if (typeof obj !== "function" && typeof obj !== "object")
                return typeof obj;
            if (typeof obj === "function") {
                const native_fn = /^function [A-Za-z]+\(\) \{ \[native code\] \}$/;
                if (native_fn.test(obj.toString())) {
                    return "native-code";
                }
                console.debug("ts:fn\n", obj);
                // 匹配函數參數
                const fn_arguments_RegExp = /^\(.*\)/;
                const fn_str = obj.toString();
                if (fn_arguments_RegExp.test(fn_str)) {
                    let fn_type = fn_arguments_RegExp.exec(obj.toString())[0];
                    return `${fn_type} => unknown`;
                }
                else {
                    return `() => unknown${this.printHint ? "/* warn: type unknown */" : ""}`;
                }
            }
            // 處理物件
            if (depth === 0) {
                interfaceStr = `/** form ${obj.toString()} */\ninterface ${InterfaceName ?? "RootType"} {`;
            }
            else {
                interfaceStr = "{";
            }
            let isArray = false;
            let obj_isWindow = obj == window || obj == document || obj == self;
            if (depth === 0 && obj_isWindow) {
                safeWindow = open();
            }
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const element = obj[key];
                    let tmp_interfaceStr = "";
                    let needContinue = false;
                    for (let Data of this.runHandlers(0 /* EventName.GetTypeTop */, obj, InterfaceName, depth, path, { key: key, element: element })) {
                        if (Data === 4 /* FnActions.None */)
                            continue;
                        if (Data === 0 /* FnActions.Continue */) {
                            needContinue = true;
                            break;
                        }
                        Data = Data;
                        switch (Data[0]) {
                            case 1 /* FnActions.Return */:
                                return Data[1];
                            case 2 /* FnActions.Eval */:
                                try {
                                    eval(Data[1]);
                                }
                                catch (e) {
                                    console.error(e);
                                    continue;
                                }
                                break;
                        }
                    }
                    if (needContinue)
                        continue;
                    if (obj_isWindow && safeWindow && safeWindow[key] === element) {
                        console.debug("ts:continue", element);
                        continue;
                    }
                    path.push(key);
                    const ElementType = this.generate(element, undefined, depth + 1, path);
                    if (ElementType === "native-code")
                        continue;
                    tmp_interfaceStr += `${key}:${ElementType};${this.printHint ? "/** `" + String(element) + "` */" : ""}`;
                    if (/^[0-9]+$/.test(key))
                        isArray = true;
                    console.debug("appt: ", tmp_interfaceStr);
                    interfaceStr += tmp_interfaceStr;
                }
            }
            if (safeWindow && !safeWindow.closed)
                safeWindow.close();
            interfaceStr += "}";
            if (isArray && this.printHint)
                interfaceStr += "/* Is it are `Array`? */";
        }
        catch (e) {
            if (safeWindow && !safeWindow.closed)
                safeWindow.close();
        }
        console.groupEnd();
        for (let Data of this.runHandlers(1 /* EventName.GetTypeReturn */, obj, InterfaceName, depth, path, { Return: interfaceStr })) {
            if (!Array.isArray(Data) || Data[0] !== 3 /* FnActions.SetReturn */)
                continue;
            Data = Data;
            interfaceStr = Data[1];
        }
        return interfaceStr;
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
        console.groupCollapsed(`ts:EventHandlerRun ${EventName}`);
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
        console.groupEnd();
        return ReturnList;
    }
}
// 用法範例
function ts(object, InterfaceName) {
    const generator = new GetTypeGenerator(false);
    generator.AddEventHandler(new SkipProperties([ts.name]));
    const de = document.createElement("a");
    de.href =
        "data:text/plain;charset=utf-8," +
            encodeURIComponent(generator.generate(object, InterfaceName));
    de.download = (InterfaceName ?? "RootType") + ".d.ts";
    de.click();
    de.remove();
}
ts(window, "Window");
//# sourceMappingURL=main.js.map