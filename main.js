"use strict";
/**
 * TypeScript Interface 生成器
 * 將 JS 對象自動轉換為 TypeScript 介面定義。
 * 支援遞迴解析、策略擴展、特殊鍵跳過、函數類型推斷等。
 */
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
var EventName;
(function (EventName) {
    EventName["GetTypeTop"] = "GetTypeTop";
    EventName["GetTypeReturn"] = "GetTypeReturn";
})(EventName || (EventName = {}));
/**
 * 跳過循環引用
 */
class SkipLoopRef {
    on = EventName.GetTypeTop;
    do(arg) {
        if (arg.element === this.ver.obj) {
            console.warn("ts:ref=>ref", arg.element, this.ver.path);
            return 0 /* FnActions.Continue */;
        }
        return 4 /* FnActions.None */;
    }
}
/**
 * 處理特殊鍵名（jQuery, $）
 */
class JQueryHandler {
    on = EventName.GetTypeTop;
    do(arg) {
        if (this.ver.depth === 0) {
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
 */
class SkipWindowProperties {
    on = EventName.GetTypeTop;
    do(arg) {
        const skipKeys = [
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
            ts.name,
            GetTypeGenerator.name,
        ];
        for (const a_element of skipKeys) {
            if (window[a_element] == arg.element) {
                return 0 /* FnActions.Continue */;
            }
        }
        if (skipKeys.includes(arg.key)) {
            console.debug("ts:skip", arg.key);
            return 0 /* FnActions.Continue */;
        }
        return 4 /* FnActions.None */;
    }
}
/**
 * 處理最終返回值（後處理）
 */
class ReturnHandler {
    on = EventName.GetTypeReturn;
    do(arg) {
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
    _EventHandlerList = [
        new SkipLoopRef(),
        new JQueryHandler(),
        new SkipWindowProperties(),
        new ReturnHandler(),
    ];
    get EventHandlerList() {
        return this._EventHandlerList;
    }
    set EventHandlerList(value) {
        this._EventHandlerList = value;
    }
    AddEventHandler(handler) {
        this._EventHandlerList.push(handler);
    }
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
        let SafeWindow;
        let InterfaceStr = "";
        try {
            console.log("ts:", obj, "depth:", depth, "path:", path);
            if (obj === null)
                return "null";
            if (typeof obj !== "function" && typeof obj !== "object")
                return typeof obj;
            obj = obj;
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
                InterfaceStr = `/** form ${obj.toString()} */\ninterface ${InterfaceName ?? "RootType"} {`;
            }
            else {
                InterfaceStr = "{";
            }
            let IsArray = false;
            let ObjIsWindow = obj == window || obj == document || obj == self;
            if (depth === 0 && ObjIsWindow) {
                SafeWindow = open();
            }
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const element = obj[key];
                    let TmpInterfaceStr = "";
                    let NeedContinue = false;
                    for (let Data of this.runHandlers(EventName.GetTypeTop, obj, InterfaceName, depth, path, { key: key, element: element })) {
                        if (Data === 4 /* FnActions.None */)
                            continue;
                        if (Data === 0 /* FnActions.Continue */) {
                            NeedContinue = true;
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
                    if (NeedContinue)
                        continue;
                    if (ObjIsWindow &&
                        SafeWindow &&
                        SafeWindow[key] === element) {
                        console.debug("ts:continue", element);
                        continue;
                    }
                    path.push(key);
                    const ElementType = this.generate(element, undefined, depth + 1, path);
                    if (ElementType === "native-code")
                        continue;
                    TmpInterfaceStr += `${key}:${ElementType};${this.printHint ? "/** `" + String(element) + "` */" : ""}`;
                    if (/^[0-9]+$/.test(key))
                        IsArray = true;
                    console.debug("appt: ", TmpInterfaceStr);
                    InterfaceStr += TmpInterfaceStr;
                }
            }
            if (SafeWindow && !SafeWindow.closed)
                SafeWindow.close();
            InterfaceStr += "}";
            if (IsArray && this.printHint)
                InterfaceStr += "/* Is it are `Array`? */";
        }
        catch (e) {
            if (SafeWindow && !SafeWindow.closed)
                SafeWindow.close();
        }
        console.groupEnd();
        for (let Data of this.runHandlers(EventName.GetTypeReturn, obj, InterfaceName, depth, path, { Return: InterfaceStr })) {
            if (!Array.isArray(Data) || Data[0] !== 3 /* FnActions.SetReturn */)
                continue;
            Data = Data;
            InterfaceStr = Data[1];
        }
        return InterfaceStr;
    }
    /**
     * 策略執行器：根據事件執行所有策略
     */
    runHandlers(EventName, obj, InterfaceName, depth, path, arg) {
        console.group(`ts:EventHandlerRun ${EventName}`);
        const ReturnList = [];
        for (const Fn of this.EventHandlerList) {
            if (Fn.on !== EventName)
                continue;
            console.debug(Fn);
            ReturnList.push(Fn.do.apply({
                ver: {
                    obj: obj,
                    InterfaceName: InterfaceName,
                    depth: depth,
                    path: path,
                },
            }, [arg]));
        }
        console.groupEnd();
        return ReturnList;
    }
}
// 用法範例
function ts(object, InterfaceName) {
    const generator = new GetTypeGenerator(false);
    const de = document.createElement("a");
    de.href =
        "data:text/plain;charset=utf-8," +
            encodeURIComponent(generator.generate(object, InterfaceName, undefined, undefined));
    de.download = "type.d.ts";
    de.click();
    de.remove();
}
ts(window, "Window");
//# sourceMappingURL=main.js.map