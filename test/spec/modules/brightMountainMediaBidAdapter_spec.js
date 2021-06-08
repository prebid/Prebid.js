import { expect } from 'chai';
import { spec } from '../../../modules/brightMountainMediaBidAdapter.js';

const BIDDER_CODE = 'bmtm';
const ENDPOINT_URL = 'https://one.elitebidder.com/api/hb';
const ENDPOINT_URL_SYNC = 'https://console.brightmountainmedia.com:8443/cookieSync';
const PLACEMENT_ID = 329;

describe('brightMountainMediaBidAdapter_spec', function () {
  let bidBanner = {
    bidId: '2dd581a2b6281d',
    bidder: BIDDER_CODE,
    bidderRequestId: '145e1d6a7837c9',
    params: {
      placement_id: PLACEMENT_ID
    },
    placementCode: 'placementid_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
  };

  let bidVideo = {
    bidId: '2dd581a2b6281d',
    bidder: BIDDER_CODE,
    bidderRequestId: '145e1d6a7837c9',
    params: {
      placement_id: PLACEMENT_ID
    },
    placementCode: 'placementid_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      video: {
        playerSizes: [[300, 250]],
        context: 'outstream',
        skip: 0,
        playbackmethod: [1, 2],
        mimes: ['video/mp4']
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
  };

  let bidderRequest = {
    bidderCode: BIDDER_CODE,
    auctionId: 'fffffff-ffff-ffff-ffff-ffffffffffff',
    bidderRequestId: 'ffffffffffffff',
    start: 1472239426002,
    auctionStart: 1472239426000,
    timeout: 5000,
    uspConsent: '1YN-',
    refererInfo: {
      referer: 'http://www.example.com',
      reachedTop: true,
    }
  };

  describe('isBidRequestValid', function () {
    it('Should return true when  when required params found', function () {
      expect(spec.isBidRequestValid(bidBanner)).to.be.true;
    });
    it('Should return false when required params are not passed', function () {
      bidBanner.params = {}
      expect(spec.isBidRequestValid(bidBanner)).to.be.false;
    });
  });

  function testServerRequestBody(serverRequest) {
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal(ENDPOINT_URL);
    });

    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      expect(placements).to.be.an('array');
    });
  }

  describe('buildRequests', function () {
    bidderRequest['bids'] = [bidBanner];
    let serverRequest = spec.buildRequests([bidBanner], bidderRequest);
    testServerRequestBody(serverRequest);

    it('sends bidfloor param if present', function () {
      bidBanner.getFloor = function () {
        return {
          currency: 'USD',
          floor: 0.5,
        }
      };
      const request = spec.buildRequests([bidBanner], bidderRequest);
      expect(request.data.placements[0].floor['300x250']).to.equal(0.5);
    });

    it('sends gdpr info if exists', function () {
      const gdprConsent = {
        consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==',
        gdprApplies: true
      };

      bidderRequest['gdprConsent'] = gdprConsent;
      const request = spec.buildRequests([bidBanner], bidderRequest);

      expect(request.data.gdpr_require).to.exist.and.to.be.a('number');
      expect(request.data.gdpr_consent).to.exist.and.to.be.a('string');
    });

    it('sends schain info if exists', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'directseller.com',
            sid: '00001',
            rid: 'BidRequest1',
            hp: 1
          }
        ]
      };
      bidBanner.schain = schain;
      const request = spec.buildRequests([bidBanner], bidderRequest);
      expect(request.data.placements[0].schain).to.be.an('object');
    });

    bidderRequest['bids'] = [bidVideo];
    serverRequest = spec.buildRequests([bidVideo], bidderRequest);
    testServerRequestBody(serverRequest);

    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });

  function testServerResponse(serverResponses) {
    it('Returns an array of valid server responses if response object is valid', function () {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');
        expect(dataItem.meta.advertiserDomains[0]).to.be.a('string');
      }
    });
  }

  describe('interpretResponse', function () {
    let resObjectBanner = {
      body: [{
        requestId: '123',
        mediaType: 'banner',
        cpm: 0.3,
        width: 320,
        height: 50,
        ad: '<h1>Hello ad</h1>',
        ttl: 1000,
        creativeId: '123asd',
        netRevenue: true,
        currency: 'USD',
        adomain: ['adomain.com'],
      }]
    };

    let resObjectVideo = {
      body: [{
        requestId: '123',
        mediaType: 'video',
        cpm: 1.5,
        width: 320,
        height: 50,
        ad: '<h1>Hello ad</h1>',
        ttl: 1000,
        creativeId: '123asd',
        netRevenue: true,
        currency: 'USD',
        adomain: ['adomain.com'],
      }]
    };
    let serverResponses = spec.interpretResponse(resObjectBanner);
    testServerResponse(serverResponses);

    serverResponses = spec.interpretResponse(resObjectVideo);
    testServerResponse(serverResponses);

    it('Returns an empty array if invalid response is passed', function () {
      serverResponses = spec.interpretResponse('invalid_response');
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    let syncoptionsIframe = {
      'iframeEnabled': 'true'
    }
    it('should return iframe sync option', function () {
      expect(spec.getUserSyncs(syncoptionsIframe)).to.be.an('array').with.lengthOf(1);
      expect(spec.getUserSyncs(syncoptionsIframe)[0].type).to.exist;
      expect(spec.getUserSyncs(syncoptionsIframe)[0].url).to.exist;
      expect(spec.getUserSyncs(syncoptionsIframe)[0].type).to.equal('iframe')
      expect(spec.getUserSyncs(syncoptionsIframe)[0].url).to.equal(ENDPOINT_URL_SYNC)
    });
  });
});
