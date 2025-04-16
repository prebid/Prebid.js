import {klona} from "klona/json";

export function deepClone<T>(obj: T): T {
    return (klona(obj) || {}) as T;
}
