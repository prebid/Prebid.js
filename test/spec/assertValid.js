function assertMatchesReportSpec(report) {
  expect(report).to.have.property('analyticsVersion', '1.0.0');
  expect(report).to.have.property('pid').that.is.a('string');
  expect(report).to.have.property('src').that.is.a('string');
  expect(report).to.have.property('pbjsVersion').that.is.a('string');
  expect(report).to.have.property('auctions').that.is.an('array');
  expect(report.auctions).to.have.lengthOf.above(0);

  report.auctions.forEach(auction => {
    expect(auction).to.have.property('adUnits').that.is.an('array');
    expect(auction).to.have.property('auctionId').that.is.a('string');
    expect(auction).to.have.property('userIds').that.is.an('array');

    auction.adUnits.forEach(adUnit => {
      expect(adUnit).to.have.property('transactionId').that.is.a('string');
      expect(adUnit).to.have.property('adUnitCode').that.is.a('string');
      expect(adUnit).to.have.property('slotId').that.is.a('string');
      expect(adUnit).to.have.property('mediaTypes').that.is.an('array');
      expect(adUnit).to.have.property('sizes').that.is.an('array');
      expect(adUnit).to.have.property('bids').that.is.an('array');

      adUnit.mediaTypes.forEach(assertIsMediaType);

      adUnit.sizes.forEach(assertIsSizeString);

      adUnit.bids.forEach(bid => {
        expect(bid).to.have.property('bidder').that.is.a('string');
        expect(bid).to.have.property('bidId').that.is.a('string');
        expect(bid).to.have.property('source').that.is.a('string');
        expect(bid).to.have.property('status').that.is.a('string');

        if (bid.bidResponse) {
          expect(bid.bidResponse).to.be.an('object');
          assertIsMediaType(bid.bidResponse.mediaType);
          assertIsSizeString(bid.bidResponse.size);
          expect(bid.bidResponse).to.have.property('cur').that.is.a('string');
          expect(bid.bidResponse).to.have.property('cpm').that.is.a('number');
          expect(bid.bidResponse).to.have.property('cpmFloor').that.is.a('number');
          if (bid.bidResponse.cpmOrig) {
            expect(bid.bidResponse).to.have.property('cpmOrig').that.is.a('number');
          }
        }
        if (bid.hasWon) {
          expect(bid.hasWon).to.have.property('hasWon', 1);
        }
      });
    });
  });

  function assertIsMediaType(mediaType) {
    expect(mediaType).to.be.oneOf(['banner', 'video', 'native']);
  }

  function assertIsSizeString(size) {
    expect(size).to.match(/[0-9]+x[0-9]+/);
  }
}
