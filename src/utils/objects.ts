import { klona } from "klona/json";
import type { AnyFunction } from "../types/functions.d.ts";
import type { Repeat } from "../types/tuples.d.ts";

export function deepClone<T>(obj: T): T {
  return (klona(obj) || {}) as T;
}

/**
 * Build an object consisting of only defined parameters to avoid creating an
 * object with defined keys and undefined values.
 * @param object The object to pick defined params out of
 * @param params An array of strings representing properties to look for in the object
 * @returns An object containing all the specified values that are defined
 */
export function getDefinedParams<T extends object, K extends readonly (keyof T)[]>(object: T, params: K): Partial<Pick<T, K[number]>> {
  return params
    .filter(param => object[param])
    .reduce((bid, param) => Object.assign(bid, { [param]: object[param] }), {});
}

const toString = Object.prototype.toString;

/**
 * Return if the object is of the
 * given type.
 */
export function isFn(object): object is AnyFunction {
  return typeof object === 'function';
}

export function isStr(object): object is string {
  return typeof object === 'string';
}

export const isArray: (object) => object is any[] = Array.isArray.bind(Array);

export function isNumber(object): object is number {
  return typeof object === 'number';
}

export function isPlainObject(object): object is Record<any, unknown> {
  return toString.call(object) === '[object Object]'
}

export function isBoolean(object): object is boolean {
  return typeof object === 'boolean';
}

/**
 * Checks input is integer or not
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
 */
export const isInteger: (value) => value is number = Number.isInteger.bind(Number);

export function isArrayOfNums<L extends number>(val, size?: L): val is Repeat<number, L> {
  return (isArray(val)) && ((size) ? val.length === size : true) && (val.every(v => isInteger(v)));
}
