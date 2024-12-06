export function getCurrencyFromBidderRequest(bidderRequest) {
  return bidderRequest?.ortb2?.ext?.prebid?.adServerCurrency;
}
