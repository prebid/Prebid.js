function logPrefix(scope) {
  return [
    `%c PAAPI %c ${scope} %c`,
    'color: green;  background-color:yellow; border: 1px solid black',
    'color: blue; border:1px solid black',
    '',
  ];
}

function scoreAd(
  adMetadata,
  bid,
  auctionConfig,
  trustedScoringSignals,
  browserSignals,
  directFromSellerSignals
) {
  console.group(...logPrefix('scoreAd'), 'Buyer:', browserSignals.interestGroupOwner);
  console.log('Context:', JSON.stringify({
    adMetadata,
    bid,
    auctionConfig: {
      ...auctionConfig,
      componentAuctions: '[omitted]'
    },
    trustedScoringSignals,
    browserSignals,
    directFromSellerSignals
  }, ' ', ' '));

  const result = {
    desirability: bid,
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
  console.log('Result:', result);
  console.groupEnd();
  return result;
}

function reportResult(auctionConfig, browserSignals) {
  console.group(...logPrefix('reportResult'));
  console.log('Context', JSON.stringify({auctionConfig, browserSignals}, ' ', ' '));
  console.groupEnd();
  sendReportTo(`${auctionConfig.seller}/report/win?${Object.entries(browserSignals).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`);
  return {};
}
