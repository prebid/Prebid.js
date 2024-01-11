import { config } from 'src/config.js';
import { expect } from 'chai';
import { spec } from 'modules/dailymotionBidAdapter.js';

describe('dailymotionBidAdapterTests', () => {
  // Validate that isBidRequestValid only validates requests
  // with both api_key and position config parameters set
  it('validates isBidRequestValid', () => {
    config.setConfig({ dailymotion: {} });
    expect(spec.isBidRequestValid({
      bidder: 'dailymotion',
    })).to.be.false;

    config.setConfig({ dailymotion: { api_key: 'test_api_key' } });
    expect(spec.isBidRequestValid({
      bidder: 'dailymotion',
    })).to.be.false;

    config.setConfig({ dailymotion: { position: 'test_position' } });
    expect(spec.isBidRequestValid({
      bidder: 'dailymotion',
    })).to.be.false;

    config.setConfig({ dailymotion: { api_key: 'test_api_key', position: 'test_position' } });
    expect(spec.isBidRequestValid({
      bidder: 'dailymotion',
    })).to.be.true;
  });

  // Validate request generation with api key & position only
  it('validates buildRequests - with api key & position', () => {
    const dmConfig = { api_key: 'test_api_key', position: 'test_position' };

    config.setConfig({
      dailymotion: dmConfig,
      coppa: true,
    });

    const bidRequestData = [{
      adUnitCode: 'test_adunitcode',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: 123456,
      bidder: 'dailymotion',
    }];

    const bidderRequestData = {
      uspConsent: '1YN-',
      gdprConsent: {
        consentString: 'xxx',
        gdprApplies: 1
      },
    };

    const [request] = spec.buildRequests(bidRequestData, bidderRequestData);
    const { data: reqData } = request;

    expect(request.url).to.equal('https://pb.dmxleo.com');
    expect(reqData.bidder_request).to.equal(bidderRequestData)
    expect(reqData.config).to.equal(dmConfig);
    expect(reqData.coppa).to.be.true;
    expect(reqData.request).to.equal(bidRequestData[0]);
  });

  // Validate request generation with api key, position, xid
  it('validates buildRequests - with auth & xid', function () {
    const dmConfig = {
      api_key: 'test_api_key',
      position: 'test_position',
      xid: 'x123456',
    };

    config.setConfig({ dailymotion: dmConfig });

    const bidRequestData = [{
      adUnitCode: 'test_adunitcode',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: 123456,
      bidder: 'dailymotion',
    }];

    const bidderRequestData = {
      uspConsent: '1YN-',
      gdprConsent: {
        consentString: 'xxx',
        gdprApplies: 1
      },
    };

    const [request] = spec.buildRequests(bidRequestData, bidderRequestData);
    const { data: reqData } = request;

    expect(request.url).to.equal('https://pb.dmxleo.com');
    expect(reqData.bidder_request).to.equal(bidderRequestData)
    expect(reqData.config).to.equal(dmConfig);
    expect(reqData.coppa).to.equal(true);
    expect(reqData.request).to.equal(bidRequestData[0]);
  });

  it('validates buildRequests - with empty/undefined validBidRequests', function () {
    const dmConfig = {
      api_key: 'test_api_key',
      position: 'test_position',
      xid: 'x123456',
    };

    config.setConfig({ dailymotion: dmConfig });

    expect(spec.buildRequests([], {})).to.have.lengthOf(0);

    expect(spec.buildRequests(undefined, {})).to.have.lengthOf(0);
  });

  it('validates interpretResponse', function () {
    const serverResponse = {
      body: {
        ad: 'https://fakecacheserver/cache?uuid=1234',
        cacheId: '1234',
        cpm: 20.0,
        creativeId: '5678',
        currency: 'USD',
        dealId: 'deal123',
        nurl: 'https://bid/nurl',
        requestId: 'test_requestid',
        vastUrl: 'https://fakecacheserver/cache?uuid=1234',
      },
    };

    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);

    const [bid] = bids;
    expect(bid.ad).to.equal(serverResponse.body.ad);
    expect(bid.cacheId).to.equal(serverResponse.body.cacheId);
    expect(bid.cpm).to.equal(serverResponse.body.cpm);
    expect(bid.creativeId).to.equal(serverResponse.body.creativeId);
    expect(bid.currency).to.equal(serverResponse.body.currency);
    expect(bid.dealId).to.equal(serverResponse.body.dealId);
    expect(bid.nurl).to.equal(serverResponse.body.nurl);
    expect(bid.requestId).to.equal(serverResponse.body.requestId);
    expect(bid.vastUrl).to.equal(serverResponse.body.vastUrl);
  });

  it('validates interpretResponse - with empty/undefined serverResponse', function () {
    expect(spec.interpretResponse({})).to.have.lengthOf(0);

    expect(spec.interpretResponse(undefined)).to.have.lengthOf(0);
  });
});
