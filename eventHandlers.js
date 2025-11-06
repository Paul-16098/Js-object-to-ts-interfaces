"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnHandler = exports.SkipProperties = exports.JQueryHandler = exports.SkipLoopRef = void 0;
//#endregion ts-type (extracted)
/**
 * 跳過循環引用
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
exports.SkipLoopRef = SkipLoopRef;
/**
 * 處理特殊鍵名（jQuery, $）
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
                    arg.element.toString() ===
                        "function(e,t){return new w.fn.init(e,t)}") {
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
exports.JQueryHandler = JQueryHandler;
/**
 * 跳過瀏覽器全域物件
 */
class SkipProperties {
    on = "GetTypeTop" /* EventType.GetTypeTop */;
    skipKeys;
    constructor(skipKeys) {
        this.skipKeys = Array.from(new Set(skipKeys));
    }
    do(env, arg) {
        for (const a_element of this.skipKeys) {
            if (globalThis[a_element] == arg.element) {
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
exports.SkipProperties = SkipProperties;
/**
 * 處理最終返回值（後處理）
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
exports.ReturnHandler = ReturnHandler;
//# sourceMappingURL=eventHandlers.js.map