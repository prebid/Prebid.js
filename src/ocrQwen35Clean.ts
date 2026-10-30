export function inWindow(now: number, start: number, end: number): boolean {
  return now >= start && now <= end;
}
