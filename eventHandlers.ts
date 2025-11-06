//#region ts-type (extracted)
/**
 * Represents the possible actions that can be performed by a function.
 */
export const enum FnActions {
  /** Continue execution. */
  Continue,
  /** Return from the function. */
  Return,
  /** Evaluate an expression. */
  Eval,
  /** Set a return value. */
  SetReturn,
  /** No action. */
  None,
}

/**
 * Enumeration of event names used in the application.
 */
export const enum EventType {
  /** Represents the event for retrieving the top type. */
  GetTypeTop = "GetTypeTop",
  /** Represents the event for retrieving the return type. */
  GetTypeReturn = "GetTypeReturn",
}

/**
 * Represents the possible return types for an event handler function.
 */
export type EventHandlerReturn =
  | FnActions.Continue
  | FnActions.None
  | [FnActions.Return | FnActions.Eval | FnActions.SetReturn, string];

/**
 * 支援的物件型別
 */
export type GetType_obj_type =
  | null
  | number
  | string
  | bigint
  | boolean
  | symbol
  | undefined
  | Function
  | object;

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
export type EventHandlerGetTypeReturnArgType = { Return: string };

/** Event handler argument type for retrieving the top type. */
export type EventHandlerGetTypeTopArgType = {
  key: string;
  // 原寫法 object[keyof object] 會變成 never，導致傳入 { key, element } 報錯
  element: unknown;
};

/**
 * Event handler argument type for various event handlers.
 */
export type EventHandlerArgType =
  | EventHandlerGetTypeReturnArgType
  | EventHandlerGetTypeTopArgType;

/**
 * 策略介面：可根據事件擴展多種處理
 */
export interface EventHandlerBase<EventArg extends EventHandlerArgType> {
  readonly on: EventType;
  do(env: EventHandlerEnvType, arg: EventArg): EventHandlerReturn;
}
//#endregion ts-type (extracted)

/**
 * 跳過循環引用
 */
export class SkipLoopRef
  implements EventHandlerBase<EventHandlerGetTypeTopArgType>
{
  on = EventType.GetTypeTop as const;
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    if (arg.element === env.obj) {
      console.debug("ts:ref=>ref", arg.element, env.path);
      return FnActions.Continue;
    }
    return FnActions.None;
  }
}

/**
 * 處理特殊鍵名（jQuery, $）
 */
export class JQueryHandler
  implements EventHandlerBase<EventHandlerGetTypeTopArgType>
{
  on = EventType.GetTypeTop as const;
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    // depth 1 == top-level (after initial increment in generate)
    if (env.depth <= 1) {
      if (arg.key === "jQuery") {
        return [FnActions.Eval, "interfaceStr+='jQuery:JQueryStatic;'"];
      }
      try {
        if (
          arg.key === "$" &&
          typeof arg.element === "function" &&
          (arg.element as Function).toString() ===
            "function(e,t){return new w.fn.init(e,t)}"
        ) {
          return [FnActions.Eval, "interfaceStr+='$:JQueryStatic;'"];
        }
      } catch {
        /* ignore */
      }
    }
    return FnActions.None;
  }
}

/**
 * 跳過瀏覽器全域物件
 */
export class SkipProperties
  implements EventHandlerBase<EventHandlerGetTypeTopArgType>
{
  on: EventType = EventType.GetTypeTop;
  private readonly skipKeys: string[];
  constructor(skipKeys: string[]) {
    this.skipKeys = Array.from(new Set(skipKeys));
  }
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    for (const a_element of this.skipKeys) {
      if ((globalThis as any)[a_element] == arg.element) {
        return FnActions.Continue;
      }
    }
    if (this.skipKeys.includes(arg.key)) {
      console.debug("ts:skip", arg.key);
      return FnActions.Continue;
    }
    return FnActions.None;
  }
}

/**
 * 處理最終返回值（後處理）
 */
export class ReturnHandler
  implements EventHandlerBase<EventHandlerGetTypeReturnArgType>
{
  on = EventType.GetTypeReturn as const;
  rep_list: string[][];
  constructor(rep_list: Array<Array<string>> = []) {
    this.rep_list = rep_list;
  }
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeReturnArgType
  ): EventHandlerReturn {
    for (const rep of this.rep_list) {
      if (rep.length !== 2) {
        console.warn("ts:rep_list error", rep);
        continue;
      }
      arg.Return = arg.Return.replaceAll(rep[0], rep[1]);
      console.debug("ts:rep", rep[0], "=>", rep[1]);
    }

    return [FnActions.SetReturn, arg.Return];
  }
}
