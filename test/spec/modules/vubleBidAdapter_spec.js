// import or require modules necessary for the test, e.g.:

import {expect} from 'chai';
import {spec as adapter} from 'modules/vubleBidAdapter';
import * as utils from 'src/utils';

describe('VubleAdapter', function () {
  describe('Check methods existance', function () {
    it('exists and is a function', function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a('function');
    });
  });

  describe('Check method isBidRequestValid return', function () {
    let bid = {
      bidder: 'vuble',
      params: {
        env: 'net',
        pubId: '3',
        zoneId: '12345',
        floorPrice: 5.00 // optional
      },
      sizes: [[640, 360]],
      mediaTypes: {
        video: {
          context: 'instream'
        }
      },
    };

    it('should be true', function () {
      expect(adapter.isBidRequestValid(bid)).to.be.true;
    });

    it('should be false because the sizes are missing or in the wrong format', function () {
      let wrongBid = utils.deepClone(bid);
      wrongBid.sizes = '640360';
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;

      wrongBid = utils.deepClone(bid);
      delete wrongBid.sizes;
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;
    });

    it('should be false because the mediaType is missing or wrong', function () {
      let wrongBid = utils.deepClone(bid);
      wrongBid.mediaTypes = {};
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;

      wrongBid = utils.deepClone(bid);
      delete wrongBid.mediaTypes;
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;
    });

    it('should be false because the env is missing or wrong', function () {
      let wrongBid = utils.deepClone(bid);
      wrongBid.params.env = 'us';
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;

      wrongBid = utils.deepClone(bid);
      delete wrongBid.params.env;
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;
    });

    it('should be false because params.pubId is missing', function () {
      let wrongBid = utils.deepClone(bid);
      delete wrongBid.params.pubId;
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;
    });

    it('should be false because params.zoneId is missing', function () {
      let wrongBid = utils.deepClone(bid);
      delete wrongBid.params.zoneId;
      expect(adapter.isBidRequestValid(wrongBid)).to.be.false;
    });
  });

  describe('Check buildRequests method', function () {
    let sandbox;
    before(function () {
      sandbox = sinon.sandbox.create();
      sandbox.stub(utils, 'getTopWindowUrl').returns('http://www.vuble.tv/');
    });

    // Bids to be formatted
    let bid1 = {
      bidder: 'vuble',
      params: {
        env: 'net',
        pubId: '3',
        zoneId: '12345',
        floorPrice: 5.50 // optional
      },
      sizes: [[640, 360]],
      mediaTypes: {
        video: {
          context: 'instream'
        }
      },
      bidId: 'abdc',
      adUnitCode: ''
    };
    let bid2 = {
      bidder: 'vuble',
      params: {
        env: 'com',
        pubId: '8',
        zoneId: '2468',
        referrer: 'http://www.vuble.fr/'
      },
      sizes: '640x360',
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      },
      bidId: 'efgh',
      adUnitCode: 'code'
    };

    // Formatted requets
    let request1 = {
      method: 'POST',
      url: '//player.mediabong.net/prebid/request',
      data: {
        width: '640',
        height: '360',
        pub_id: '3',
        zone_id: '12345',
        context: 'instream',
        floor_price: 5.5,
        url: 'http://www.vuble.tv/',
        env: 'net',
        bid_id: 'abdc',
        adUnitCode: ''
      }
    };
    let request2 = {
      method: 'POST',
      url: '//player.mediabong.com/prebid/request',
      data: {
        width: '640',
        height: '360',
        pub_id: '8',
        zone_id: '2468',
        context: 'outstream',
        floor_price: 0,
        url: 'http://www.vuble.fr/',
        env: 'com',
        bid_id: 'efgh',
        adUnitCode: 'code'
      }
    };

    it('must return the right formatted requests', function () {
      let rs = adapter.buildRequests([bid1, bid2]);
      expect(adapter.buildRequests([bid1, bid2])).to.deep.equal([request1, request2]);
    });

    after(function () {
      sandbox.restore();
    });
  });

  describe('Check interpretResponse method return', function () {
    // Server's response
    let response = {
      body: {
        status: 'ok',
        cpm: 5.00,
        creativeId: '2468',
        url: 'https//player.mediabong.net/prebid/ad/a1b2c3d4',
        dealId: 'MDB-TEST-1357'
      }
    };
    // bid Request
    let bid = {
      data: {
        context: 'instream',
        env: 'net',
        width: '640',
        height: '360',
        pub_id: '3',
        zone_id: '12345',
        bid_id: 'abdc',
        floor_price: 5.50, // optional
        adUnitCode: 'code'
      },
      method: 'POST',
      url: '//player.mediabong.net/prebid/request'
    };
    // Formatted reponse
    let result = {
      requestId: 'abdc',
      cpm: 5.00,
      width: '640',
      height: '360',
      ttl: 60,
      creativeId: '2468',
      dealId: 'MDB-TEST-1357',
      netRevenue: true,
      currency: 'USD',
      vastUrl: 'https//player.mediabong.net/prebid/ad/a1b2c3d4',
      mediaType: 'video'
    };

    it('should equal to the expected formatted result', function () {
      expect(adapter.interpretResponse(response, bid)).to.deep.equal([result]);
    });

    it('should be empty because the status is missing or wrong', function () {
      let wrongResponse = utils.deepClone(response);
      wrongResponse.body.status = 'ko';
      expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;

      wrongResponse = utils.deepClone(response);
      delete wrongResponse.body.status;
      expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;
    });

    it('should be empty because the body is missing or wrong', function () {
      let wrongResponse = utils.deepClone(response);
      wrongResponse.body = [1, 2, 3];
      expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;

      wrongResponse = utils.deepClone(response);
      delete wrongResponse.body;
      expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;
    });

    it('should equal to the expected formatted result', function () {
      response.body.renderer_url = 'vuble_renderer.js';
      result.adUnitCode = 'code';
      let formattedResponses = adapter.interpretResponse(response, bid);
      expect(formattedResponses[0].adUnitCode).to.equal(result.adUnitCode);
    });
  });

  describe('Check getUserSyncs method return', function () {
    // Sync options
    let syncOptions = {
      iframeEnabled: false
    };
    // Server's response
    let response = {
      body: {
        status: 'ok',
        cpm: 5.00,
        creativeId: '2468',
        url: 'https//player.mediabong.net/prebid/ad/a1b2c3d4'
      }
    };
    // Formatted reponse
    let result = {
      type: 'iframe',
      url: 'http://player.mediabong.net/csifr?1234'
    };

    it('should return an empty array', function () {
      expect(adapter.getUserSyncs({}, [])).to.be.empty;
      expect(adapter.getUserSyncs({}, [])).to.be.empty;
      expect(adapter.getUserSyncs(syncOptions, [response])).to.be.empty;
      expect(adapter.getUserSyncs(syncOptions, [response])).to.be.empty;
      syncOptions.iframeEnabled = true;
      expect(adapter.getUserSyncs(syncOptions, [response])).to.be.empty;
      expect(adapter.getUserSyncs(syncOptions, [response])).to.be.empty;
    });

    it('should be equal to the expected result', function () {
      response.body.iframeSync = 'http://player.mediabong.net/csifr?1234';
      expect(adapter.getUserSyncs(syncOptions, [response])).to.deep.equal([result]);
    })
  });

  describe('Check outstream scenario with renderer', function () {
    // bid Request
    let bid = {
      data: {
        context: 'outstream',
        env: 'net',
        width: '640',
        height: '360',
        pub_id: '3',
        zone_id: '12345',
        bid_id: 'abdc',
        floor_price: 5.50, // optional
        adUnitCode: 'code'
      },
      method: 'POST',
      url: '//player.mediabong.net/prebid/request'
    };
    // Server's response
    let response = {
      body: {
        status: 'ok',
        cpm: 5.00,
        creativeId: '2468',
        url: 'https//player.mediabong.net/prebid/ad/a1b2c3d4',
        dealId: 'MDB-TEST-1357',
        renderer_id: 0,
        renderer_url: 'vuble_renderer.js',
        content: 'test'
      }
    };

    let adResponse = {
      ad: {
        video: {
          content: 'test'
        }
      }
    };
    let adUnitCode = 'code';
    let rendererUrl = 'vuble_renderer.js';
    let rendererId = 0;

    let formattedResponses = adapter.interpretResponse(response, bid);
    it('should equal to the expected format result', function () {
      expect(formattedResponses[0].adResponse).to.deep.equal(adResponse);
      expect(formattedResponses[0].adUnitCode).to.deep.equal(adUnitCode);
      expect(formattedResponses[0].renderer.url).to.equal(rendererUrl);
      expect(formattedResponses[0].renderer.id).to.equal(rendererId);
      expect(formattedResponses[0].renderer.render).to.exist.and.to.be.a('function');
    });
  });
});
