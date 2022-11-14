import {addSegmentData, captifySubmodule, getMatchingBidders, setCaptifyTargeting} from 'modules/captifyRtdProvider.js';
import {server} from 'test/mocks/xhr.js';
import {config} from 'src/config.js';
import {deepAccess} from '../../../src/utils';

const responseHeader = {'Content-Type': 'application/json'};
const defaultRequestUrl = 'https://live-classification.cpx.to/prebid-segments';

describe('captifyRtdProvider', function () {
  describe('init function', function () {
    it('successfully instantiates, when configured properly', function () {
      const config = {
        params: {
          pubId: 123456,
          bidders: ['appnexus'],
        }
      };
      expect(captifySubmodule.init(config, null)).to.equal(true);
    });

    it('return false on init, when config is invalid', function () {
      const config = {
        params: {}
      };
      expect(captifySubmodule.init(config, null)).to.equal(false);
      expect(captifySubmodule.init(null, null)).to.equal(false);
    });

    it('return false on init, when pubId is absent', function () {
      const config = {
        params: {
          bidders: ['appnexus'],
        }
      };
      expect(captifySubmodule.init(config, null)).to.equal(false);
      expect(captifySubmodule.init(null, null)).to.equal(false);
    });

    it('return false on init, when bidders is empty array', function () {
      const config = {
        params: {
          bidders: [],
          pubId: 123,
        }
      };
      expect(captifySubmodule.init(config, null)).to.equal(false);
      expect(captifySubmodule.init(null, null)).to.equal(false);
    });
  });

  describe('addSegmentData function', function () {
    it('adds segment data', function () {
      config.resetConfig();

      let data = {
        xandr: [111111, 222222],
      };

      addSegmentData(['appnexus'], data);
      expect(deepAccess(config.getConfig(), 'appnexusAuctionKeywords.captify_segments')).to.eql(data['xandr']);
    });
  });

  describe('getMatchingBidders function', function () {
    it('returns only bidders that used within adUnits', function () {
      const moduleConfig = {
        params: {
          pubId: 123,
          bidders: ['appnexus', 'pubmatic'],
        }
      };
      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            }
          }]
        }]
      };

      let matchedBidders = getMatchingBidders(moduleConfig, reqBidsConfigObj);
      expect(matchedBidders).to.eql(['appnexus']);
    });

    it('return empty result, when there are no bidders configured for adUnits', function () {
      const moduleConfig = {
        params: {
          pubId: 123,
          bidders: ['pubmatic'],
        }
      };
      let reqBidsConfigObj = {
        adUnits: [{
          bids: []
        }]
      };
      expect(getMatchingBidders(moduleConfig, reqBidsConfigObj)).to.be.empty;
    });

    it('return empty result, when there are no bidders matched', function () {
      const moduleConfig = {
        params: {
          pubId: 123,
          bidders: ['pubmatic'],
        }
      };
      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            params: {
              bidder: 'appnexus',
              placementId: 13144370,
            }
          }]
        }]
      };
      expect(getMatchingBidders(moduleConfig, reqBidsConfigObj)).to.be.empty;
    });

    it('return empty result, when there are no adUnits with bidders', function () {
      const moduleConfig = {
        params: {
          pubId: 123,
          bidders: ['pubmatic'],
        }
      };
      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            params: {
              placementId: 13144370,
            }
          }]
        }]
      };
      expect(getMatchingBidders(moduleConfig, reqBidsConfigObj)).to.be.empty;
    });
  });

  describe('integration test with mock live-classification response', function () {
    const moduleConfig = {
      params: {
        pubId: 123456,
        bidders: ['appnexus'],
      }
    };

    const reqBidsConfigObj = {
      adUnits: [{
        bids: [{
          bidder: 'appnexus',
          params: {
            placementId: 13144370
          }
        }, {
          bidder: 'other'
        }]
      }]
    };

    const expectedUrlParam = 'http://localhost:9876/context.html';

    it('gets data from async request and adds segment data', function () {
      config.resetConfig();
      let data = {xandr: [111111, 222222]};
      const callbackSpy = sinon.spy();
      setCaptifyTargeting(reqBidsConfigObj, callbackSpy, moduleConfig, {});
      let request = server.requests[0];
      let requestBody = JSON.parse(server.requests[0].requestBody);
      expect(request.url).to.be.eq(defaultRequestUrl);
      expect(requestBody['pubId']).to.eq(moduleConfig.params.pubId);
      expect(requestBody['url']).to.eq(expectedUrlParam);
      request.respond(200, responseHeader, JSON.stringify(data));
      expect(deepAccess(config.getConfig(), 'appnexusAuctionKeywords.captify_segments')).to.eql(data['xandr']);
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('do not send classification request, if no matching adUnits on page', function () {
      config.resetConfig();
      let reqBidsConfigObj = {
        adUnits: [{
          bids: [
            {bidder: 'pubmatic'}
          ]
        }]
      };
      const callbackSpy = sinon.spy();
      setCaptifyTargeting(reqBidsConfigObj, callbackSpy, moduleConfig, {});
      expect(server.requests).to.be.empty;
    });

    it('gets data from async request and adds segment data, using URL from config', function () {
      config.resetConfig();
      let data = {xandr: [111111, 222222]};
      const callbackSpy = sinon.spy();
      const testUrl = 'http://my-test-server.com/path';
      const conf = {
        params: {
          url: testUrl,
          pubId: 123456,
          bidders: ['appnexus'],
        }
      };
      setCaptifyTargeting(reqBidsConfigObj, callbackSpy, conf, {});
      let request = server.requests[0];
      let requestBody = JSON.parse(server.requests[0].requestBody);
      expect(request.url).to.be.eq(testUrl);
      expect(requestBody['pubId']).to.eq(conf.params.pubId);
      expect(requestBody['url']).to.eq(expectedUrlParam);
      request.respond(200, responseHeader, JSON.stringify(data));
      expect(deepAccess(config.getConfig(), 'appnexusAuctionKeywords.captify_segments')).to.eql(data['xandr']);
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('do not set anything, in case server responded with 202', function () {
      config.resetConfig();
      const callbackSpy = sinon.spy();
      setCaptifyTargeting(reqBidsConfigObj, callbackSpy, moduleConfig, {});
      let request = server.requests[0];
      let requestBody = JSON.parse(server.requests[0].requestBody);
      expect(request.url).to.be.eq(defaultRequestUrl);
      expect(requestBody['pubId']).to.eq(moduleConfig.params.pubId);
      expect(requestBody['url']).to.eq(expectedUrlParam);
      request.respond(202, responseHeader, '');
      expect(deepAccess(config.getConfig(), 'appnexusAuctionKeywords.captify_segments')).to.be.undefined;
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('do not set anything, in case server responded with error', function () {
      config.resetConfig();
      const callbackSpy = sinon.spy();
      setCaptifyTargeting(reqBidsConfigObj, callbackSpy, moduleConfig, {});
      let request = server.requests[0];
      expect(request.url).to.be.eq(defaultRequestUrl);
      request.respond(500, null, '');
      expect(deepAccess(config.getConfig(), 'appnexusAuctionKeywords.captify_segments')).to.be.undefined;
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('do not set anything, in case request error', function () {
      config.resetConfig();
      const callbackSpy = sinon.spy();
      setCaptifyTargeting(reqBidsConfigObj, callbackSpy, moduleConfig, {});
      let request = server.requests[0];
      expect(request.url).to.be.eq(defaultRequestUrl);
      request.abort('test error');
      expect(deepAccess(config.getConfig(), 'appnexusAuctionKeywords.captify_segments')).to.be.undefined;
      expect(callbackSpy.calledOnce).to.be.true;
    });
  });
});
