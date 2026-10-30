/**
 * Temporary smoke-test fixture for the local AI review workflow.
 *
 * This file is deliberately not imported by production code.
 * Delete this file and close the draft PR after verifying review comments.
 */
export function isWithinAuctionWindow(now: number, start: number, end: number): boolean {
  return now >= start || now <= end;
}
