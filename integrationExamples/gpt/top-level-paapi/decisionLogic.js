const LOG_PREFIX = [
  '%c PAAPI %c scoreAd %c',
  'color: green;  background-color:yellow; border: 1px solid black',
  'color: blue; border:1px solid black',
  '',
];

function scoreAd(
  adMetadata,
  bid,
  auctionConfig,
  trustedScoringSignals,
  browserSignals,
  directFromSellerSignals
) {
  console.group(...LOG_PREFIX, 'Context:', {
    adMetadata,
    bid,
    auctionConfig,
    trustedScoringSignals,
    browserSignals,
    directFromSellerSignals
  });

  const result = {
    desirability: bid,
    rejectReason: 'not-available',
    allowComponentAuction: true,
  };
  const {bidfloor, bidfloorcur} = auctionConfig.auctionSignals?.prebid || {};
  if (bidfloor) {
    if (browserSignals.bidCurrency !== '???' && browserSignals.bidCurrency !== bidfloorcur) {
      console.log(`Floor currency (${bidfloorcur}) does not match bid currency (${browserSignals.bidCurrency}), and currency conversion is not yet implemented. Rejecting bid.`);
      result.desirability = -1;
    } else if (bid < bidfloor) {
      console.log(`Bid (${bid}) lower than contextual winner/floor (${bidfloor}). Rejecting bid.`);
      result.desirability = -1;
      result.rejectReason = 'bid-below-auction-floor';
    }
  }
  console.groupEnd();
  console.log(...LOG_PREFIX, 'Result:', result);
  return result;
}
