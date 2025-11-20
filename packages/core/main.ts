/**
 * Core shared utilities for js-object-to-ts-interfaces monorepo.
 * 提供：
 * 1. isNumericKey(key)
 * 2. isNativeFunction(fn)
 * 3. createCleanIframe() 建立隱藏 iframe 並返回 { win, cleanup }
 * 4. diffGlobalKeys(win, cleanWin)
 */

/** 判斷鍵是否為純數字 (用於陣列偵測) */
export function isNumericKey(key: string): boolean {
  return /^\d+$/.test(key);
}

/** 判斷函式是否為原生函式 */
export function isNativeFunction(fn: Function): boolean {
  const s = Function.prototype.toString.call(fn);
  return /^function \w*\([^)]*\) \{ \[native code\] \}$/.test(s);
}

/** 建立隱藏 iframe (乾淨環境) */
export function createCleanIframe(): { win: Window; cleanup: () => void } {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const cleanup = () => {
    try {
      iframe.remove();
    } catch (e) {
      console.warn(e);
    }
  };
  if (!win) throw new Error("iframe.contentWindow is null");
  return { win, cleanup };
}

/**
 * 比對全域 window 與乾淨 iframe window 取得差異鍵集合，並依型別分類。
 */
export function diffGlobalKeys(
  target: Window,
  clean: Window
): Record<string, string[]> {
  const diff: Record<string, string[]> = {};
  const wKeys = Object.getOwnPropertyNames(target);
  const iKeys = Object.getOwnPropertyNames(clean);
  for (const key of wKeys) {
    if (!isNumericKey(key) && !iKeys.includes(key)) {
      const type = Object.prototype.toString
        .call((target as any)[key])
        .slice(8, -1)
        .toLowerCase();
      diff[type] ||= [];
      diff[type].push(key);
    }
  }
  return diff;
}

export type GlobalDiff = Record<string, string[]>;
