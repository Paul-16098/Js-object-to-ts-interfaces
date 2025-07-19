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
const enum FnActions {
  /**
   * Continue execution.
   */
  Continue,
  /**
   * Return from the function.
   */
  Return,
  /**
   * Evaluate an expression.
   * This action allows for dynamic evaluation of expressions during the event handling.
   */
  Eval,
  /**
   * Set a return value.
   */
  SetReturn,
  /**
   * No action.
   * This action indicates that no further processing is needed for the event.
   */
  None,
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
const enum EventName {
  /**
   * Represents the event for retrieving the top type.
   */
  GetTypeTop,
  /**
   * Represents the event for retrieving the return type.
   */
  GetTypeReturn,
}

/**
 * Represents the possible return types for an event handler function.
 *
 * @see {@link FnActions}
 */
type EventHandlerReturn =
  | FnActions.Continue
  | FnActions.None
  | [FnActions.Return | FnActions.Eval | FnActions.SetReturn, string];

/**
 * 支援的物件型別
 */
type GetType_obj_type =
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
type EventHandlerEnvType = {
  obj: GetType_obj_type;
  InterfaceName: string | undefined;
  depth: number;
  path: Array<string>;
};
/**
 * Event handler argument type for retrieving the return type.
 */
type EventHandlerGetTypeReturnArgType = { Return: string };
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
type EventHandlerArgType =
  | EventHandlerGetTypeReturnArgType
  | EventHandlerGetTypeTopArgType;
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
class SkipLoopRef implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
  on = EventName.GetTypeTop;
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    if (arg.element === env.obj) {
      console.warn("ts:ref=>ref", arg.element, env.path);
      return FnActions.Continue;
    }
    return FnActions.None;
  }
}

/**
 * 處理特殊鍵名（jQuery, $）
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
class JQueryHandler implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
  on = EventName.GetTypeTop;
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    if (env.depth === 0) {
      if (arg.key === "jQuery") {
        return [FnActions.Eval, "appt+='jQuery:JQueryStatic;'"];
      }
      if (
        arg.key === "$" &&
        (arg.element as JQueryStatic | Function).toString() ===
          "function(e,t){return new w.fn.init(e,t)}"
      ) {
        return [FnActions.Eval, "appt+='$:JQueryStatic;'"];
      }
    }
    return FnActions.None;
  }
}

/**
 * 跳過瀏覽器全域物件
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
class SkipProperties
  implements EventHandlerBase<EventHandlerGetTypeTopArgType>
{
  on: EventName = EventName.GetTypeTop;
  private _skipKeys: string[];
  public get skipKeys(): string[] {
    return this._skipKeys;
  }
  constructor(skipKeys: string[]) {
    this._skipKeys = Array.from(new Set(skipKeys));
  }
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    for (const a_element of this._skipKeys) {
      if ((window as any)[a_element] == arg.element) {
        return FnActions.Continue;
      }
    }
    if (this._skipKeys.includes(arg.key)) {
      console.debug("ts:skip", arg.key);
      return FnActions.Continue;
    }
    return FnActions.None;
  }
}

/**
 * 處理最終返回值（後處理）
 * @implements {EventHandlerBase<EventHandlerGetTypeReturnArgType>}
 * @see {@link EventHandlerBase}
 */
class ReturnHandler
  implements EventHandlerBase<EventHandlerGetTypeReturnArgType>
{
  on = EventName.GetTypeReturn;
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeReturnArgType
  ): EventHandlerReturn {
    return [
      FnActions.SetReturn,
      arg.Return.replaceAll(
        "$:JQueryStatic;$:() => unknown",
        "$:JQueryStatic"
      ).replaceAll(
        "jQuery:JQueryStatic;jQuery:() => unknown",
        "jQuery:JQueryStatic"
      ),
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
  private _EventHandlerList: EventHandlerBase<EventHandlerArgType>[] = [
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
  public get EventHandlerList(): EventHandlerBase<EventHandlerArgType>[] {
    return this._EventHandlerList;
  }
  /**
   * @param handlerList - The list of event handlers to set.
   */
  public set EventHandlerList(
    handlerList: EventHandlerBase<EventHandlerArgType>[]
  ) {
    console.debug("ts:SetEventHandlerList", handlerList);
    this._EventHandlerList = handlerList;
  }
  /**
   * @param handler - The event handler to add.
   * @remarks This will add the handler to the list of event handlers.
   * @returns The updated list of event handlers.
   */
  AddEventHandler(handler: EventHandlerBase<EventHandlerArgType>) {
    console.debug("ts:AddEventHandler", handler);
    this._EventHandlerList.push(handler);
    return this._EventHandlerList;
  }
  /**
   * Determines whether to print hints for unknown types.
   * @remarks If `true`, hints will be printed for types that cannot be determined.
   */
  private printHint: boolean;

  /**
   * Creates an instance of the class.
   * @param printHint - Determines whether to print a hint. Defaults to `true`.
   */
  constructor(printHint: boolean = true) {
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
  public generate(
    obj: GetType_obj_type,
    InterfaceName?: string,
    depth: number = 0,
    path: Array<string> = ["The Object"]
  ): string {
    console.groupCollapsed(path[path.length - 1]);
    let safeWindow: (Window & { [key: string]: any }) | null = null;
    let interfaceStr = "";
    try {
      console.log("ts:", obj, "depth:", depth, "path:", path);
      if (obj === null) return "null";
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
        const fn_str: string = obj.toString();
        if (fn_arguments_RegExp.test(fn_str)) {
          let fn_type = (
            fn_arguments_RegExp.exec(obj.toString()) as RegExpExecArray
          )[0];
          return `${fn_type} => unknown`;
        } else {
          return `() => unknown${
            this.printHint ? "/* warn: type unknown */" : ""
          }`;
        }
      }
      // 處理物件
      if (depth === 0) {
        interfaceStr = `/** form ${obj.toString()} */\ninterface ${
          InterfaceName ?? "RootType"
        } {`;
      } else {
        interfaceStr = "{";
      }
      let isArray = false;
      let obj_isWindow = obj == window || obj == document || obj == self;
      if (depth === 0 && obj_isWindow) {
        safeWindow = open();
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const element: object[keyof object] = obj[key as keyof object];
          let tmp_interfaceStr = "";
          let needContinue = false;
          for (let Data of this.runHandlers(
            EventName.GetTypeTop,
            obj,
            InterfaceName,
            depth,
            path,
            { key: key, element: element }
          )) {
            if (Data === FnActions.None) continue;
            if (Data === FnActions.Continue) {
              needContinue = true;
              break;
            }
            Data = Data as [FnActions.Return | FnActions.Eval, string];
            switch (Data[0]) {
              case FnActions.Return:
                return Data[1];
              case FnActions.Eval:
                try {
                  eval(Data[1]);
                } catch (e) {
                  console.error(e);
                  continue;
                }
                break;
            }
          }
          if (needContinue) continue;
          if (obj_isWindow && safeWindow && safeWindow[key] === element) {
            console.debug("ts:continue", element);
            continue;
          }
          path.push(key);
          const ElementType = this.generate(
            element,
            undefined,
            depth + 1,
            path
          );
          if (ElementType === "native-code") continue;
          tmp_interfaceStr += `${key}:${ElementType};${
            this.printHint ? "/** `" + String(element) + "` */" : ""
          }`;
          if (/^[0-9]+$/.test(key)) isArray = true;
          console.debug("appt: ", tmp_interfaceStr);
          interfaceStr += tmp_interfaceStr;
        }
      }
      if (safeWindow && !safeWindow.closed) safeWindow.close();
      interfaceStr += "}";
      if (isArray && this.printHint) interfaceStr += "/* Is it are `Array`? */";
    } catch (e) {
      if (safeWindow && !safeWindow.closed) safeWindow.close();
    }
    console.groupEnd();
    for (let Data of this.runHandlers(
      EventName.GetTypeReturn,
      obj,
      InterfaceName,
      depth,
      path,
      { Return: interfaceStr }
    )) {
      if (!Array.isArray(Data) || Data[0] !== FnActions.SetReturn) continue;
      Data = Data as [FnActions.SetReturn, string];
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
  private runHandlers(
    EventName: EventName,
    obj: GetType_obj_type,
    InterfaceName: string | undefined,
    depth: number,
    path: Array<string>,
    arg: EventHandlerGetTypeTopArgType | EventHandlerGetTypeReturnArgType
  ): EventHandlerReturn[] {
    console.groupCollapsed(`ts:EventHandlerRun ${EventName}`);
    const ReturnList: EventHandlerReturn[] = [];
    for (const Fn of this.EventHandlerList) {
      if (Fn.on !== EventName) continue;
      console.debug(Fn);
      ReturnList.push(
        Fn.do(
          {
            obj: obj,
            InterfaceName: InterfaceName,
            depth: depth,
            path: path,
          },
          arg
        )
      );
    }
    console.groupEnd();
    return ReturnList;
  }
}

// 用法範例
function ts(object: GetType_obj_type, InterfaceName?: string) {
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
