type IfUnbounded<T extends readonly any[], THEN, ELSE> = number extends T['length'] ? THEN : ELSE;
/**
 * Last<T> => type of last element in tuple T
 */
export type Last<T extends readonly any[]> =
    [...T] extends [...rest: any[], last: infer R] ? R : IfUnbounded<T, T[1e100], never>
/**
 * AllExceptLast<T> => Type of tuple that matches T except it drops the last element
 */
export type AllExceptLast<T extends readonly any[]> =
    [...T] extends [...rest: infer R, last: any] ? R : IfUnbounded<T, T, []>;
