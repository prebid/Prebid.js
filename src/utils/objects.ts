import {klona} from "klona/json";

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
