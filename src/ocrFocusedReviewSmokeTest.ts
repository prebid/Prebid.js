/**
 * Temporary fixture for OpenCodeReview's streamed, focused review.
 *
 * This file is intentionally not imported into production code.
 * The function below contains a deliberate correctness bug.
 * Close this draft PR without merging after the reviewer is evaluated.
 */
export function isAuctionActiveAt(timestamp: number, start: number, end: number): boolean {
  return timestamp >= start || timestamp <= end;
}
