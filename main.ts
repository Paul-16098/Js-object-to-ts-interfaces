function ts(object: any, InterfaceName: string = "RootType", root: number = 0) {
  console.log("ts:", object, "root=", root);
  if (typeof object === "function") {
    console.log("ts:fn\n", object);
    /**
     * match like `(obj, root = 0)`
     */
    const r = /^\(.*\)/;
    const fn_str: string = object.toString();

    if (r.test(fn_str)) {
      /**
       * like `(obj, root = 0)`
       */
      let fn_type = (r.exec(object.toString()) as RegExpExecArray)[0];

      return `${fn_type} => any`;
    } else {
      return "() => any/* warn: type unknown */";
    }
  }
  if (typeof object !== "object") {
    console.log("ts:not obj\n", object);
    return typeof object;
  }
  let t = "";
  if (root === 0) {
    t = `interface ${InterfaceName} {\n`;
  } else {
    t = "{";
  }
  let IsArray = false;
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      const element = object[key];
      const element_type = ts(element, undefined, root + 1);
      let appt = "";
      if (root === 0) {
        appt += "    ";
      } else {
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
      console.log("appt: ", appt);
      t += appt;
    }
  }

  for (let i = 0; i < root; i++) {
    t += "    ";
  }
  t += "}";
  if (IsArray) {
    t += "// Is are `Array`?";
  }

  return t;
}
