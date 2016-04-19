pbjs.que.push(function() {
  var adUnits = [{
	code: "div-gpt-ad-1438287399331-0",
	sizes: [[300, 250], [300, 600]],
	bids: [{
	  bidder: "rubicon",
	  params: {
		accountId: "4934",
		siteId: "13945",
		zoneId: "23948",
		sizes: [15]
	  }
	}, {
	  bidder: 'sovrn',
	  params: { tagId: '315045' }
	}, {
	  bidder: "appnexus",
	  params: { placementId: "234235" }
	}]
  }];
  pbjs.addAdUnits(adUnits);

  pbjs.requestBids({
	bidsBackHandler: function() {
	  // callback when requested bids are all back
	}
  });
});
