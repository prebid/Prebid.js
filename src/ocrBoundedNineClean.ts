export function isWithinAuctionWindow(timestamp: number, start: number, end: number): boolean {
  return timestamp >= start && timestamp <= end;
}
