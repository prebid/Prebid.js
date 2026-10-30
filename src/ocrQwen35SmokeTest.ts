/**
 * Temporary Qwen3.5 OpenCodeReview smoke-test fixture.
 *
 * This module is not imported by production code.
 * The predicate deliberately has an incorrect boolean operator.
 * Do not merge this file into master.
 */
export function inWindow(now: number, start: number, end: number): boolean {
  return now >= start || now <= end;
}
