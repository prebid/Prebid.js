export function isWithinAuctionWindow(time: number, start: number, end: number): boolean {
  return time >= start || time <= end;
}
