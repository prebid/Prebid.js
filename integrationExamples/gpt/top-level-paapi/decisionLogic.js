// taken from https://privacysandboxdemos-seller.casalemedia.com/ssp/decision-logic.js

function log(label, o) {
  console.debug(label, JSON.stringify(o, ' ', ' '));
}

function scoreAd(
  adMetadata,
  bid,
  auctionConfig,
  trustedScoringSignals,
  browserSignals,
  directFromSellerSignals,
) {
  var score = bid+20;

  console.groupCollapsed( "%c PAAPI SSP %c scoreAd %c BID:%d => SCORE:%d", "color: green;  background-color:yellow; border: 1px solid black", "color: blue; border:1px solid black", "", bid, score);
//		console.group('creative');
  console.log( 'owner: %s', browserSignals.interestGroupOwner );
  console.log( 'creativeURL: %s', browserSignals.renderUrl );
  console.log( 'adMetadata: %o', adMetadata );
//		console.groupEnd();

  console.log( 'sellerSignals: %o', auctionConfig.sellerSignals);
  console.log( 'trustedScoringSignals: %o', trustedScoringSignals?.renderUrl[browserSignals.renderUrl] );

//		console.groupCollapsed('browserSignals');
  console.log( 'topWindowHostname: %s', browserSignals.topWindowHostname );
  console.log( 'seller: %s', browserSignals.seller );
//		console.groupEnd();

  console.groupEnd();

  log('scoreAd', {
    adMetadata,
    bid,
    auctionConfig,
    trustedScoringSignals,
    browserSignals,
    directFromSellerSignals,
  });


  var debug = '&winningBid=${winningBid}&winningBidCurrency=${winningBidCurrency}&topLevelWinningBid=${topLevelWinningBid}&topLevelWinningBidCurrency=${topLevelWinningBidCurrency}';
  var bidDetails = '&owner=' + browserSignals.interestGroupOwner + '&bid=' + bid + '&score=' + score;
  var queryString = bidDetails + debug;

  forDebuggingOnly.reportAdAuctionWin( auctionConfig.seller + '/ssp/forDebuggingOnly?type=reportAdAuctionWin' + queryString );
  forDebuggingOnly.reportAdAuctionLoss( auctionConfig.seller + '/ssp/forDebuggingOnly?type=reportAdAuctionLoss' + queryString );

  return {
    desirability: score,
    rejectReason: "not-available", /* https://github.com/qingxinwu/turtledove/blob/main/Proposed_First_FLEDGE_OT_Details.md#reporting */
    allowComponentAuction: true,
  };
}

function reportResult(auctionConfig, browserSignals, directFromSellerSignals) {
  console.groupEnd();
  console.groupCollapsed( "%c PAAPI SSP %c reportResult %c BID:%d", "color: green;  background-color:yellow; border: 1px solid black", "color: blue; border:1px solid black", "", browserSignals.bid);
  console.log( 'bid: %d', browserSignals.bid );
  console.log( 'score: %d', browserSignals.desirability );
  console.log( 'creativeURL: %s', browserSignals.renderUrl );
  console.log( 'highestOtherBid: %d', browserSignals.highestScoringOtherBid );

  console.log( 'sellerSignals: %o', auctionConfig.sellerSignals);

  console.groupCollapsed('browserSignals');
  console.log( 'topWindowHostname: %s', browserSignals.topWindowHostname );
  console.log( 'seller: %s', browserSignals.seller );
  console.log( 'componentSeller: %s', browserSignals.componentSeller );
  console.log( 'topLevelSeller: %s', browserSignals.topLevelSeller );
  console.groupEnd();
  console.groupEnd();
  console.groupEnd();

  log('reportResult', { auctionConfig, browserSignals, directFromSellerSignals });

  var callbackDomain = auctionConfig.seller;

  sendReportTo(callbackDomain + '/ssp/reporting?report=result' + '&domain='+browserSignals.topWindowHostname + '&igOwner='+browserSignals.interestGroupOwner + '&winningBid='+browserSignals.bid + '&nextBid=' + browserSignals.highestScoringOtherBid + '&renderUrl='+browserSignals.renderUrl);
  return {
    success: true,
    signalsForWinner: { signalForWinner: 1 },
    reportUrl: auctionConfig.seller + '/report_seller',
  };
}
