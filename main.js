"use strict";
function ts(object, InterfaceName, depth = 0) {
    console.groupCollapsed(depth);
    let sw;
    try {
        console.log("ts:", object, "root=", depth);
        if (object === null) {
            return "null";
        }
        switch (typeof object) {
            case "number":
                return "number";
            case "string":
                return "string";
            case "bigint":
                return "bigint";
            case "boolean":
                return "boolean";
            case "symbol":
                return "symbol";
            case "undefined":
                return "undefined";
            case "function": {
                console.debug("ts:fn\n", object);
                /**
                 * match like `(obj, root = 0)`
                 */
                const fn_arguments_RegExp = /^\(.*\)/;
                const fn_str = object.toString();
                if (fn_arguments_RegExp.test(fn_str)) {
                    /**
                     * like `(obj, root = 0)`
                     */
                    let fn_type = fn_arguments_RegExp.exec(object.toString())[0];
                    return `${fn_type} => any`;
                }
                else {
                    return "() => unknown/* warn: type unknown */";
                }
            }
            case "object":
                break;
            default: {
                console.debug("ts:not obj\n", object);
                return typeof object;
            }
        }
        let t = "";
        if (depth === 0) {
            t = `interface ${InterfaceName ?? "RootType"} {\n`;
        }
        else {
            t = "{";
        }
        let IsArray = false;
        let oiw = object === window;
        if (depth === 0) {
            if (oiw) {
                sw = open();
            }
        }
        for (const key in object) {
            if (Object.prototype.hasOwnProperty.call(object, key)) {
                const element = object[key];
                if (oiw && sw) {
                    if (sw[key] === element) {
                        console.debug("ts:continue");
                        continue;
                    }
                }
                const element_type = ts(element, undefined, depth + 1);
                let appt = "";
                if (depth === 0) {
                    appt += "    ";
                }
                else {
                    appt += "\n    ";
                    for (let i = 0; i < (key + ": ").length / 2; i++) {
                        appt += " ";
                    }
                }
                appt += `${key}: ${element_type};`;
                if (/[0-9]+/.test(key)) {
                    IsArray = true;
                    // appt += `// Is are \`Array<${element_type}>\`?`;
                }
                appt += "\n";
                console.debug("appt: ", appt);
                t += appt;
            }
        }
        if (sw && !sw.closed) {
            sw.close();
        }
        for (let i = 0; i < depth; i++) {
            t += "    ";
        }
        t += "}";
        if (IsArray) {
            t += "// Is it are `Array`?";
        }
        return t.replaceAll("\n\n", "\n");
    }
    catch (e) {
        if (sw && !sw.closed) {
            sw.close();
        }
    }
    console.groupEnd();
}
//# sourceMappingURL=main.js.map