import { expect } from 'chai';
import { bidboostSubmodule } from 'modules/bidboostRtdProvider.js';
import { consumePredictorSnapshotForAuction } from 'src/bidboostShared.js';
import { server } from 'test/mocks/xhr.js';

describe('bidboostRtdProvider', function () {
  let responseBody;

  beforeEach(function () {
    responseBody = {
      g: 2,
      b: 1100,
      p: {
        top_slot: {
          b: [{ c: 'ix' }, { c: 'apn' }]
        }
      }
    };
    server.respondWith(
      'POST',
      'https://predict.bidboost.net/predict',
      [200, { 'Content-Type': 'application/json' }, JSON.stringify(responseBody)]
    );
  });

  it('fails init when required params are missing', function () {
    expect(bidboostSubmodule.init({ params: {} })).to.equal(false);
  });

  it('accepts valid module params', function () {
    expect(
      bidboostSubmodule.init({
        params: {
          client: 'client-code',
          site: 'site-code'
        }
      })
    ).to.equal(true);
  });

  it('posts predictor request, shapes bids, and stores snapshot', function (done) {
    bidboostSubmodule.init({
      params: {
        client: 'client-code',
        site: 'site-code',
        ignoredBidders: ['rubicon'],
        placementMapper: (adUnit) => `${adUnit.code}_slot`,
        bidderMapper: (bidder) => (bidder === 'appnexus' ? 'apn' : bidder),
        reverseBidderMapper: (bidder) => (bidder === 'apn' ? 'appnexus' : bidder),
        additionalBidders: [{
          code: 'top',
          bids: [{ bidder: 'ix', params: { siteId: 123 } }]
        }]
      }
    });

    const req = {
      auctionId: 'auc-1',
      timeout: 1500,
      adUnits: [{
        code: 'top',
        bids: [
          { bidder: 'appnexus', params: { placementId: 1 } },
          { bidder: 'rubicon', params: { accountId: 1 } }
        ]
      }]
    };

    bidboostSubmodule.getBidRequestData(req, () => {
      expect(server.requests).to.have.length(1);
      expect(server.requests[0].url).to.equal('https://predict.bidboost.net/predict');

      const predictorRequest = JSON.parse(server.requests[0].requestBody);
      expect(predictorRequest.c).to.equal('client-code');
      expect(predictorRequest.s).to.equal('site-code');
      expect(predictorRequest.b).to.equal(1500);
      expect(predictorRequest.p[0].c).to.equal('top_slot');
      expect(predictorRequest.p[0].b.map((bidder) => bidder.c)).to.include.members(['apn', 'ix']);

      const bidderCodes = req.adUnits[0].bids.map((bid) => bid.bidder);
      expect(bidderCodes).to.deep.equal(['rubicon', 'ix', 'appnexus']);
      expect(req.timeout).to.equal(1100);

      const snapshot = consumePredictorSnapshotForAuction('auc-1');
      expect(snapshot.g).to.equal(2);
      expect(snapshot.b).to.equal(1100);
      expect(snapshot.m.top).to.equal('top_slot');
      done();
    });
    server.respond();
  });

  it('assigns auctionId when missing and stores snapshot', function (done) {
    bidboostSubmodule.init({
      params: {
        client: 'client-code',
        site: 'site-code'
      }
    });

    const req = {
      timeout: 1200,
      adUnits: [{ code: 'top', bids: [{ bidder: 'appnexus' }] }]
    };

    bidboostSubmodule.getBidRequestData(req, () => {
      expect(server.requests).to.have.length(1);
      expect(req.auctionId).to.be.a('string').and.not.empty;
      const predictorRequest = JSON.parse(server.requests[0].requestBody);
      expect(predictorRequest.c).to.equal('client-code');
      expect(predictorRequest.s).to.equal('site-code');
      const snapshot = consumePredictorSnapshotForAuction(req.auctionId);
      expect(snapshot).to.exist;
      done();
    });
    server.respond();
  });

  it('keeps auction runnable when predictor request fails', function (done) {
    server.respondWith(
      'POST',
      'https://predict.bidboost.net/predict',
      [500, { 'Content-Type': 'text/plain' }, 'boom']
    );

    bidboostSubmodule.init({
      params: {
        client: 'client-code',
        site: 'site-code'
      }
    });

    const req = {
      auctionId: 'auc-failure',
      adUnits: [{
        code: 'top',
        bids: [{ bidder: 'appnexus' }, { bidder: 'rubicon' }]
      }]
    };

    bidboostSubmodule.getBidRequestData(req, () => {
      expect(server.requests).to.have.length(1);
      expect(req.adUnits[0].bids.map((bid) => bid.bidder)).to.deep.equal(['appnexus', 'rubicon']);

      const snapshot = consumePredictorSnapshotForAuction('auc-failure');
      expect(snapshot).to.exist;
      expect(snapshot.g).to.equal(0);
      expect(snapshot.b).to.equal(3000);
      expect(snapshot.r).to.equal(null);
      done();
    });
    server.respond();
  });
});
