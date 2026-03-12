import {
  isJSONObject,
  type JSONData,
  type JSONArray,
  type JSONArrayToItem,
  type JSONObject,
  type JSONPrimitive,
  type JSONPrimitiveToName,
} from "bun-workspaces/src/internal/core";

type PrimitiveToDisplay<P extends JSONPrimitive = JSONPrimitive> = {
  primitive: true;
  types: Array<JSONPrimitiveToName<P>>;
};

type ArrayToDisplay<A extends JSONArray = JSONArray> = {
  array: true;
  item: ValueToDisplay<JSONArrayToItem<A>>;
};

export type ValueToDisplay<O extends JSONData = JSONData> = O extends JSONObject
  ? {
      [key in keyof O]: O[key] extends JSONPrimitive
        ? PrimitiveToDisplay<O[key]>
        : O[key] extends JSONArray
          ? ArrayToDisplay<O[key]>
          : O[key] extends JSONObject
            ? ValueToDisplay<O[key]>
            : string;
    }
  : O extends JSONArray
    ? ArrayToDisplay<O>
    : O extends JSONPrimitive
      ? PrimitiveToDisplay<O>
      : string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _formatSimpleTypeToDisplay = <V extends ValueToDisplay<any>>(
  value: V,
  prev = "",
  level = 0,
) => {
  let result = prev;
  const indent = "  ".repeat(level);
  const nextIndent = "  ".repeat(level + 1);

  if ((value as { primitive: true }).primitive === true) {
    result += (value as { types: string[] }).types.join(" | ");
  } else if (isJSONObject(value)) {
    if ((value as ArrayToDisplay).array === true) {
      result +=
        _formatSimpleTypeToDisplay((value as ArrayToDisplay).item, "", level) +
        "[]";
      return result;
    }

    result += "{\n";
    const entries = Object.entries(value as ValueToDisplay);
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      result +=
        nextIndent +
        key +
        (key.includes("[") ? "" : "?") +
        ": " +
        _formatSimpleTypeToDisplay(val as ValueToDisplay, "", level + 1) +
        (i < entries.length - 1 ? ",\n" : "");
    }
    result += "\n" + indent + "}";
  } else if (typeof value === "string") {
    result += value;
  }

  return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatSimpleTypeToDisplay = <V extends ValueToDisplay<any>>(
  value: V,
) => _formatSimpleTypeToDisplay(value);
