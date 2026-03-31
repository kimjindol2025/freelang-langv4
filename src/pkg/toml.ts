// Lightweight TOML Parser (no external dependencies)

export interface TomlValue {
  [key: string]: any;
}

export function parseTOML(content: string): TomlValue {
  const result: TomlValue = {};
  const lines = content.split("\n");
  let currentSection: string | null = null;
  let currentObj: TomlValue = result;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;

    // Section header: [section]
    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim();
      if (!result[currentSection]) {
        result[currentSection] = {};
      }
      currentObj = result[currentSection];
      continue;
    }

    // Key-value pairs: key = value
    const eqIndex = line.indexOf("=");
    if (eqIndex > 0) {
      const key = line.substring(0, eqIndex).trim();
      const valueStr = line.substring(eqIndex + 1).trim();
      const value = parseValue(valueStr);
      currentObj[key] = value;
    }
  }

  return result;
}

function parseValue(valueStr: string): any {
  // String values (double quotes)
  if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
    return valueStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }

  // String values (single quotes)
  if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
    return valueStr.slice(1, -1);
  }

  // Boolean values
  if (valueStr === "true") return true;
  if (valueStr === "false") return false;

  // Numeric values
  if (!isNaN(Number(valueStr))) {
    return Number(valueStr);
  }

  // Array values [item1, item2, ...]
  if (valueStr.startsWith("[") && valueStr.endsWith("]")) {
    const itemsStr = valueStr.slice(1, -1);
    const items = itemsStr.split(",").map((item) => parseValue(item.trim()));
    return items;
  }

  // Table values {key = value, ...}
  if (valueStr.startsWith("{") && valueStr.endsWith("}")) {
    const content = valueStr.slice(1, -1);
    const obj: TomlValue = {};
    const pairs = content.split(",");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx > 0) {
        const k = pair.substring(0, eqIdx).trim();
        const v = pair.substring(eqIdx + 1).trim();
        obj[k] = parseValue(v);
      }
    }
    return obj;
  }

  // Return as string if no match
  return valueStr;
}

export function stringifyTOML(obj: TomlValue, indent: number = 0): string {
  const lines: string[] = [];
  const indentStr = " ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      // Nested section
      if (indent === 0) {
        lines.push(`[${key}]`);
      }
      lines.push(stringifyTOML(value, indent + 2));
    } else if (Array.isArray(value)) {
      // Array
      const items = value.map((v) => stringifyValue(v)).join(", ");
      lines.push(`${indentStr}${key} = [${items}]`);
    } else {
      // Scalar value
      lines.push(`${indentStr}${key} = ${stringifyValue(value)}`);
    }
  }

  return lines.filter((l) => l).join("\n");
}

function stringifyValue(value: any): string {
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => stringifyValue(v)).join(", ");
    return `[${items}]`;
  }
  return String(value);
}
