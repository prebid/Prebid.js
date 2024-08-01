export function getCurrencyFromBidderRequest(bidderRequest) {
  return (bidderRequest?.ortb2?.ext?.cur || [])[0];
}
