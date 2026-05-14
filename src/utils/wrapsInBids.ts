export type WrapsInBids<T> = T[] & {
  bids: T[]
}

export function wrapInBids<T>(arr: T[]): WrapsInBids<T> {
  const wrapped = arr.slice() as WrapsInBids<T>;
  wrapped.bids = wrapped;
  return wrapped;
}
