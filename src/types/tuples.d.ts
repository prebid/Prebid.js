type IfUnbounded<T extends readonly any[], THEN, ELSE> = number extends T['length'] ? THEN : ELSE;
type AddUntil<E, T extends E[], L extends number> = T['length'] extends L ? T : AddUntil<E, [E, ...T], L>;
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

/**
 * Repeat<T, L> => tuple of length L where each member is of type T
 */
export type Repeat<T, L extends number> = number extends L ? T[] : AddUntil<T, [], L>;
