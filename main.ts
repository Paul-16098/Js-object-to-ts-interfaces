//#region ts-type
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
const enum EventType {
  /**
   * Represents the event for retrieving the top type.
   */
  GetTypeTop = "GetTypeTop",
  /**
   * Represents the event for retrieving the return type.
   */
  GetTypeReturn = "GetTypeReturn",
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
  readonly on: EventType;
  do(env: EventHandlerEnvType, arg: EventArg): EventHandlerReturn;
}
//#endregion ts-type
/**
 * 跳過循環引用
 * @see {@link EventHandlerBase}
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 */
class SkipLoopRef implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
  on = EventType.GetTypeTop;
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
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
class JQueryHandler implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
  on = EventType.GetTypeTop;
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
 * @implements {EventHandlerBase<EventHandlerGetTypeTopArgType>}
 * @see {@link EventHandlerBase}
 */
class SkipProperties
  implements EventHandlerBase<EventHandlerGetTypeTopArgType>
{
  on: EventType = EventType.GetTypeTop;
  private skipKeys: string[];
  constructor(skipKeys: string[]) {
    this.skipKeys = Array.from(new Set(skipKeys));
  }
  do(
    env: EventHandlerEnvType,
    arg: EventHandlerGetTypeTopArgType
  ): EventHandlerReturn {
    for (const a_element of this.skipKeys) {
      if ((window as any)[a_element] == arg.element) {
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
 * @implements {EventHandlerBase<EventHandlerGetTypeReturnArgType>}
 * @see {@link EventHandlerBase}
 */
class ReturnHandler
  implements EventHandlerBase<EventHandlerGetTypeReturnArgType>
{
  on = EventType.GetTypeReturn;
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
  private config: {
    /** 若為 true，輸出時附帶提示 */
    printHint?: boolean;
    /** 根層呼叫完成後是否自動下載檔案 */
    download?: boolean;
  };
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
    new ReturnHandler([
      ["$:JQueryStatic;$:() => unknown", "$:JQueryStatic"],
      ["jQuery:JQueryStatic;jQuery:() => unknown", "jQuery:JQueryStatic"],
    ]),
  ];
  /**
   * 遞迴深度計數器
   * @remarks This is used to track the depth of recursion during the type generation process.
   */
  private depth: number = 0;
  /**
   * 屬性路徑
   */
  private path: Array<string> = [":root:"];
  /**
   * 已拜訪集合（偵測循環引用）
   */
  private visited: WeakSet<object> = new WeakSet();
  /**
   * init
   */
  private init(): void {
    this.config.download = this.config.download ?? true;
    this.config.printHint = this.config.printHint ?? false;
  }
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
   * Creates an instance of the class.
   * @param printHint - Determines whether to print a hint. Defaults to `true`.
   */
  constructor(
    c: typeof this.config = {
      printHint: false,
      download: true,
    }
  ) {
    this.config = { ...c };
    this.init();
  }

  /**
   * 生成 TypeScript 介面字串
   * @param obj 目標物件
   * @param InterfaceName 介面名稱
   * @returns TypeScript 介面字串
   */
  public generate(obj: GetType_obj_type, InterfaceName?: string): string {
    this.depth++;
    console.groupCollapsed(this.path[this.path.length - 1]);
    let safeWindow: (Window & { [key: string]: any }) | null = null;
    let interfaceStr = ""; // 重要：handler 可能透過 eval 操作此變數
    try {
      console.debug("ts:", obj, "depth:", this.depth, "path:", this.path);
      if (obj === null) {
        this.generate_back();
        return "null";
      }
      if (typeof obj !== "function" && typeof obj !== "object") {
        this.generate_back();
        return typeof obj;
      }

      // 循環引用保護
      if (typeof obj === "object") {
        if (this.visited.has(obj)) {
          this.generate_back();
          return "any" + (this.config.printHint ? "/* circular */" : "");
        }
        this.visited.add(obj);
      }

      if (typeof obj === "function") {
        const native_fn = /^function [A-Za-z]+\(\) \{ \[native code\] \}$/;
        if (native_fn.test(obj.toString())) {
          this.generate_back();
          return "native-code";
        }
        console.debug("ts:fn\n", obj);
        // 匹配函數參數
        const fn_arguments_RegExp = /^\(.*\)/;
        const fn_str: string = obj.toString();
        this.generate_back();
        if (fn_arguments_RegExp.test(fn_str)) {
          let fn_type = (
            fn_arguments_RegExp.exec(obj.toString()) as RegExpExecArray
          )[0];
          return `${fn_type} => unknown`;
        } else {
          return `() => unknown${
            this.config.printHint ? "/* warn: type unknown */" : ""
          }`;
        }
      }
      // 處理物件
      if (this.depth === 1) {
        interfaceStr = `/**
 * form https://github.com/Paul-16098/Js-object-to-ts-interfaces
 * url: ${location.href}
 * obj: ${obj.toString()}
 */\ninterface ${InterfaceName ?? "RootType"} {`;
      } else {
        interfaceStr = "{";
      }
      let isArray = false;
      let obj_isWindow = obj == window || obj == document || obj == self;
      if (this.depth === 0 && obj_isWindow) {
        safeWindow = open();
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const element: object[keyof object] = obj[key as keyof object];
          let tmp_interfaceStr = "";
          let needContinue = false;
          for (let Data of this.runHandlers(
            EventType.GetTypeTop,
            obj,
            InterfaceName,
            this.depth,
            this.path,
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
                  // 僅允許簡單的 interfaceStr 拼接
                  if (/^interfaceStr\+=/.test(Data[1])) {
                    // eslint-disable-next-line no-eval
                    eval(Data[1]);
                  } else {
                    console.warn("Blocked eval:", Data[1]);
                  }
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
          this.path.push(key);
          const ElementType = this.generate(element);
          if (ElementType === "native-code") continue;
          tmp_interfaceStr += `${key}:${ElementType};${
            this.config.printHint ? "/** `" + String(element) + "` */" : ""
          }`;
          if (/^[0-9]+$/.test(key)) isArray = true;
          console.debug("appt: ", tmp_interfaceStr);
          interfaceStr += tmp_interfaceStr;
        }
      }
      if (safeWindow && !safeWindow.closed) safeWindow.close();
      interfaceStr += "}";
      if (isArray && this.config.printHint)
        interfaceStr += "/* Is it are `Array`? */";
    } catch (e) {
      if (safeWindow && !safeWindow.closed) safeWindow.close();
    }
    for (let Data of this.runHandlers(
      EventType.GetTypeReturn,
      obj,
      InterfaceName,
      this.depth,
      this.path,
      { Return: interfaceStr }
    )) {
      if (!Array.isArray(Data) || Data[0] !== FnActions.SetReturn) continue;
      Data = Data as [FnActions.SetReturn, string];
      interfaceStr = Data[1];
    }
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

  private generate_back() {
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
  private runHandlers(
    EventName: EventType,
    obj: GetType_obj_type,
    InterfaceName: string | undefined,
    depth: number,
    path: Array<string>,
    arg: EventHandlerGetTypeTopArgType | EventHandlerGetTypeReturnArgType
  ): EventHandlerReturn[] {
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
    return ReturnList;
  }
}

// 用法範例
new GetTypeGenerator({ download: false }).generate(window, "Window");
