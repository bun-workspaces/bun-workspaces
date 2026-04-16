import {
  isJSONObject,
  type JSONPrimitive,
  type JSONArray,
  type JSONData,
} from "bw-common/types";
import { isTypeof } from "../language";

export const isJSONPrimitive = (value: unknown): value is JSONPrimitive =>
  isTypeof(value, "string", "number", "boolean") || value === null;

export const isJSONArray = <T extends JSONArray = JSONArray>(
  value: unknown,
): value is T => Array.isArray(value) && value.every(isJSON);

export const isJSON = (value: unknown): value is JSONData =>
  isJSONPrimitive(value) || isJSONArray(value) || isJSONObject(value);
