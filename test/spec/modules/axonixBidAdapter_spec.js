import { expect } from 'chai';
import { spec } from 'modules/axonixBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('AxonixBidAdapter', function () {
  const adapter = newBidder(spec);

  const SUPPLY_ID_1 = '91fd110a-5685-11eb-8db6-a7e0eeefbbc7';
  const SUPPLY_ID_2 = '22de2092-568b-11eb-bae3-cfa975dc72aa';
  const REGION_1 = 'us-east-1';
  const REGION_2 = 'eu-west-1';

  const BANNER_REQUEST = {
    adUnitCode: 'ad_code',
    bidId: 'abcd1234',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 200]
        ]
      }
    },
    bidder: 'axonix',
    params: {
      supplyId: SUPPLY_ID_1,
      region: REGION_1
    },
    requestId: 'q4owht8ofqi3ulwsd',
    transactionId: 'fvpq3oireansdwo'
  };

  const VIDEO_REQUEST = {
    adUnitCode: 'ad_code',
    bidId: 'abcd1234',
    mediaTypes: {
      video: {
        context: 'outstream',
        mimes: ['video/mp4'],
        playerSize: [400, 300],
        renderer: {
          url: 'https://url.com',
          backupOnly: true,
          render: () => true
        },
      }
    },
    bidder: 'axonix',
    params: {
      supplyId: SUPPLY_ID_1,
      region: REGION_1
    },
    requestId: 'q4owht8ofqi3ulwsd',
    transactionId: 'fvpq3oireansdwo'
  };

  const BIDDER_REQUEST = {
    bidderCode: 'axonix',
    auctionId: '18fd8b8b0bd757',
    bidderRequestId: '418b37f85e772c',
    timeout: 3000,
    gdprConsent: {
      consentString: 'BOKAVy4OKAVy4ABAB8AAAAAZ+A==',
      gdprApplies: true
    },
    refererInfo: {
      referer: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    }
  };

  const BANNER_RESPONSE = {
    body: [{
      requestId: 'f08b3a8dcff747eabada295dcf94eee0',
      cpm: 6,
      currency: 'USD',
      width: 300,
      height: 250,
      ad: '<html></html>',
      creativeId: 'abc',
      netRevenue: false,
      meta: {
        networkId: 'nid',
        advertiserDomains: [
          'https://the.url'
        ],
        secondaryCatIds: [
          'IAB1'
        ],
        mediaType: 'banner'
      },
      nurl: 'https://win.url'
    }]
  };

  const VIDEO_RESPONSE = {
    body: [{
      requestId: 'f08b3a8dcff747eabada295dcf94eee0',
      cpm: 6,
      currency: 'USD',
      width: 300,
      height: 250,
      ad: '<?xml version="1.0" encoding="UTF-8" ?><VAST version="3.0"></VAST>',
      creativeId: 'abc',
      netRevenue: false,
      meta: {
        networkId: 'nid',
        advertiserDomains: [
          'https://the.url'
        ],
        secondaryCatIds: [
          'IAB1'
        ],
        mediaType: 'video'
      },
      nurl: 'https://win.url'
    }]
  };

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let validBids = [
      {
        bidder: 'axonix',
        params: {
          supplyId: SUPPLY_ID_1,
          region: REGION_1
        },
      },
      {
        bidder: 'axonix',
        params: {
          supplyId: SUPPLY_ID_2,
          region: REGION_2
        },
        future_parameter: {
          future: 'ididid'
        }
      },
    ];

    let invalidBids = [
      {
        bidder: 'axonix',
        params: {},
      },
      {
        bidder: 'axonix',
      },
    ];

    it('should accept valid bids', function () {
      for (let bid of validBids) {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      }
    });

    it('should reject invalid bids', function () {
      for (let bid of invalidBids) {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      }
    });
  });

  describe('buildRequests: can handle banner ad requests', function () {
    it('creates ServerRequests with the correct data', function () {
      const [request] = spec.buildRequests([BANNER_REQUEST], BIDDER_REQUEST);

      expect(request).to.have.property('url', `https://openrtb-${REGION_1}.axonix.com/supply/prebid/${SUPPLY_ID_1}`);
      expect(request).to.have.property('method', 'POST');
      expect(request).to.have.property('data');

      const { data } = request;
      expect(data.app).to.be.undefined;

      expect(data).to.have.property('site');
      expect(data.site).to.have.property('page', 'https://www.prebid.org');

      expect(data).to.have.property('validBidRequest', BANNER_REQUEST);
      expect(data).to.have.property('connectionType').to.exist;
      expect(data).to.have.property('effectiveType').to.exist;
      expect(data).to.have.property('devicetype', 2);
      expect(data).to.have.property('bidfloor', 0);
      expect(data).to.have.property('dnt', 0);
      expect(data).to.have.property('language').to.be.a('string');
      expect(data).to.have.property('prebidVersion').to.be.a('string');
      expect(data).to.have.property('screenHeight').to.be.a('number');
      expect(data).to.have.property('screenWidth').to.be.a('number');
      expect(data).to.have.property('tmax').to.be.a('number');
      expect(data).to.have.property('ua').to.be.a('string');
    });

    it('creates ServerRequests pointing to the correct region and endpoint if it changes', function () {
      const bannerRequests = [utils.deepClone(BANNER_REQUEST), utils.deepClone(BANNER_REQUEST)];
      bannerRequests[0].params.endpoint = 'https://the.url';
      bannerRequests[1].params.endpoint = 'https://the.other.url';

      const requests = spec.buildRequests(bannerRequests, BIDDER_REQUEST);

      requests.forEach((request, index) => {
        expect(request).to.have.property('url', bannerRequests[index].params.endpoint);
      });
    });

    it('creates ServerRequests pointing to default endpoint if missing', function () {
      const bannerRequests = [utils.deepClone(BANNER_REQUEST), utils.deepClone(BANNER_REQUEST)];
      bannerRequests[1].params.supplyId = SUPPLY_ID_2;
      bannerRequests[1].params.region = REGION_2;

      const requests = spec.buildRequests(bannerRequests, BIDDER_REQUEST);
      expect(requests[0]).to.have.property('url', `https://openrtb-${REGION_1}.axonix.com/supply/prebid/${SUPPLY_ID_1}`);
      expect(requests[1]).to.have.property('url', `https://openrtb-${REGION_2}.axonix.com/supply/prebid/${SUPPLY_ID_2}`);
    });

    it('creates ServerRequests pointing to default region if missing', function () {
      const bannerRequest = utils.deepClone(BANNER_REQUEST);
      delete bannerRequest.params.region;

      const requests = spec.buildRequests([bannerRequest], BIDDER_REQUEST);
      expect(requests[0]).to.have.property('url', `https://openrtb-${REGION_1}.axonix.com/supply/prebid/${SUPPLY_ID_1}`);
    });
  });

  describe('buildRequests: can handle video ad requests', function () {
    it('creates ServerRequests with the correct data', function () {
      const [request] = spec.buildRequests([VIDEO_REQUEST], BIDDER_REQUEST);

      expect(request).to.have.property('url', `https://openrtb-${REGION_1}.axonix.com/supply/prebid/${SUPPLY_ID_1}`);
      expect(request).to.have.property('method', 'POST');
      expect(request).to.have.property('data');

      const { data } = request;
      expect(data.app).to.be.undefined;

      expect(data).to.have.property('site');
      expect(data.site).to.have.property('page', 'https://www.prebid.org');

      expect(data).to.have.property('validBidRequest', VIDEO_REQUEST);
      expect(data).to.have.property('connectionType').to.exist;
      expect(data).to.have.property('effectiveType').to.exist;
      expect(data).to.have.property('devicetype', 2);
      expect(data).to.have.property('bidfloor', 0);
      expect(data).to.have.property('dnt', 0);
      expect(data).to.have.property('language').to.be.a('string');
      expect(data).to.have.property('prebidVersion').to.be.a('string');
      expect(data).to.have.property('screenHeight').to.be.a('number');
      expect(data).to.have.property('screenWidth').to.be.a('number');
      expect(data).to.have.property('tmax').to.be.a('number');
      expect(data).to.have.property('ua').to.be.a('string');
    });

    it('creates ServerRequests pointing to the correct region and endpoint if it changes', function () {
      const videoRequests = [utils.deepClone(VIDEO_REQUEST), utils.deepClone(VIDEO_REQUEST)];
      videoRequests[0].params.endpoint = 'https://the.url';
      videoRequests[1].params.endpoint = 'https://the.other.url';

      const requests = spec.buildRequests(videoRequests, BIDDER_REQUEST);

      requests.forEach((request, index) => {
        expect(request).to.have.property('url', videoRequests[index].params.endpoint);
      });
    });

    it('creates ServerRequests pointing to default endpoint if missing', function () {
      const videoRequests = [utils.deepClone(VIDEO_REQUEST), utils.deepClone(VIDEO_REQUEST)];
      videoRequests[1].params.supplyId = SUPPLY_ID_2;
      videoRequests[1].params.region = REGION_2;

      const requests = spec.buildRequests(videoRequests, BIDDER_REQUEST);
      expect(requests[0]).to.have.property('url', `https://openrtb-${REGION_1}.axonix.com/supply/prebid/${SUPPLY_ID_1}`);
      expect(requests[1]).to.have.property('url', `https://openrtb-${REGION_2}.axonix.com/supply/prebid/${SUPPLY_ID_2}`);
    });

    it('creates ServerRequests pointing to default region if missing', function () {
      const videoRequest = utils.deepClone(VIDEO_REQUEST);
      delete videoRequest.params.region;

      const requests = spec.buildRequests([videoRequest], BIDDER_REQUEST);
      expect(requests[0]).to.have.property('url', `https://openrtb-${REGION_1}.axonix.com/supply/prebid/${SUPPLY_ID_1}`);
    });
  });

  describe.skip('buildRequests: can handle native ad requests', function () {
    it('creates ServerRequests pointing to the correct region and endpoint if it changes', function () {
      // loop:
      //   set supply id
      //   set region/endpoint in ssp config
      //   call buildRequests, validate request (url, method, supply id)
      expect.fail('Not implemented');
    });

    it('creates ServerRequests pointing to default endpoint if missing', function () {
      // no endpoint in config means default value openrtb.axonix.com
      expect.fail('Not implemented');
    });

    it('creates ServerRequests pointing to default region if missing', function () {
      // no region in config means default value us-east-1
      expect.fail('Not implemented');
    });
  });

  describe('interpretResponse', function () {
    it('considers corner cases', function() {
      expect(spec.interpretResponse(null)).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse()).to.be.an('array').that.is.empty;
    });

    it('ignores unparseable responses', function() {
      expect(spec.interpretResponse('invalid')).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse(['invalid'])).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: [{ invalid: 'object' }] })).to.be.an('array').that.is.empty;
    });

    it('parses banner responses', function () {
      const response = spec.interpretResponse(BANNER_RESPONSE);

      expect(response).to.be.an('array').that.is.not.empty;
      expect(response[0]).to.equal(BANNER_RESPONSE.body[0]);
    });

    it('parses 1 video responses', function () {
      const response = spec.interpretResponse(VIDEO_RESPONSE);

      expect(response).to.be.an('array').that.is.not.empty;
      expect(response[0]).to.equal(VIDEO_RESPONSE.body[0]);
    });

    it.skip('parses 1 native responses', function () {
      // passing 1 valid native in a response generates an array with 1 correct prebid response
      // examine mediaType:native, native element
      // check nativeBidIsValid from {@link file://./../../../src/native.js}
      expect.fail('Not implemented');
    });
  });

  describe('onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('called once', function () {
      spec.onBidWon(BANNER_RESPONSE.body[0]);
      expect(utils.triggerPixel.calledOnce).to.equal(true);
    });

    it('called false', function () {
      spec.onBidWon({ cpm: '2.21' });
      expect(utils.triggerPixel.called).to.equal(false);
    });

    it('when there is no notification expected server side, none is called', function () {
      var response = spec.onBidWon({});
      expect(utils.triggerPixel.called).to.equal(false);
      expect(response).to.be.an('undefined')
    });
  });

  describe('onTimeout', function () {
    it('banner response', () => {
      spec.onTimeout(spec.interpretResponse(BANNER_RESPONSE));
    });

    it('video response', () => {
      spec.onTimeout(spec.interpretResponse(VIDEO_RESPONSE));
    });
  });
});
