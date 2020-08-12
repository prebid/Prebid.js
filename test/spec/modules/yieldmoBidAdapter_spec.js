import { expect } from 'chai';
import { spec } from 'modules/yieldmoBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

describe('YieldmoAdapter', function () {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://ads.yieldmo.com/exchange/prebid';

  let tdid = '8d146286-91d4-4958-aff4-7e489dd1abd6';
  let criteoId = 'aff4';

  let bid = {
    bidder: 'yieldmo',
    params: {
      bidFloor: 0.1,
    },
    adUnitCode: 'adunit-code',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    crumbs: {
      pubcid: 'c604130c-0144-4b63-9bf2-c2bd8c8d86da',
    },
    userId: {
      tdid,
    },
  };
  let bidArray = [bid];
  let bidderRequest = {
    bidderCode: 'yieldmo',
    auctionId: 'e3a336ad-2761-4a1c-b421-ecc7c5294a34',
    bidderRequestId: '14c4ede8c693f',
    bids: bidArray,
    auctionStart: 1520001292880,
    timeout: 3000,
    start: 1520001292884,
    doneCbCallCount: 0,
    refererInfo: {
      numIframes: 1,
      reachedTop: true,
      referer: 'yieldmo.com',
    },
  };

  describe('isBidRequestValid', function () {
    it('should return true when necessary information is found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when necessary information is not found', function () {
      // empty bid
      expect(spec.isBidRequestValid({})).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty adUnitCode
      bid.bidId = '30b31c1838de1e';
      bid.adUnitCode = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      bid.adUnitCode = 'adunit-code';
    });
  });

  describe('buildRequests', function () {
    it('should attempt to send bid requests to the endpoint via GET', function () {
      const request = spec.buildRequests(bidArray, bidderRequest);
      expect(request.method).to.equal('GET');
      expect(request.url).to.be.equal(ENDPOINT);
    });

    it('should not blow up if crumbs is undefined', function () {
      let bidArray = [{ ...bid, crumbs: undefined }];
      expect(function () {
        spec.buildRequests(bidArray, bidderRequest);
      }).not.to.throw();
    });

    it('should place bid information into the p parameter of data', function () {
      let placementInfo = spec.buildRequests(bidArray, bidderRequest).data.p;
      expect(placementInfo).to.equal(
        encodeURIComponent('[{"placement_id":"adunit-code","callback_id":"30b31c1838de1e","sizes":[[300,250],[300,600]],"bidFloor":0.1}]')
      );
      bidArray.push({
        bidder: 'yieldmo',
        params: {
          bidFloor: 0.2,
        },
        adUnitCode: 'adunit-code-1',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidId: '123456789',
        bidderRequestId: '987654321',
        auctionId: '0246810',
        crumbs: {
          pubcid: 'c604130c-0144-4b63-9bf2-c2bd8c8d86da',
        },
      });

      // multiple placements
      placementInfo = spec.buildRequests(bidArray, bidderRequest).data.p;
      expect(placementInfo).to.equal(
        encodeURIComponent('[{"placement_id":"adunit-code","callback_id":"30b31c1838de1e","sizes":[[300,250],[300,600]],"bidFloor":0.1},{"placement_id":"adunit-code-1","callback_id":"123456789","sizes":[[300,250],[300,600]],"bidFloor":0.2}]')
      );
    });

    it('should add placement id if given', function () {
      bidArray[0].params.placementId = 'ym_1293871298';
      let placementInfo = spec.buildRequests(bidArray, bidderRequest).data.p;
      expect(placementInfo).to.include(encodeURIComponent('"ym_placement_id":"ym_1293871298"'));
      expect(placementInfo).not.to.include(encodeURIComponent('"ym_placement_id":"ym_0987654321"'));

      bidArray[1].params.placementId = 'ym_0987654321';
      placementInfo = spec.buildRequests(bidArray, bidderRequest).data.p;
      expect(placementInfo).to.include(encodeURIComponent('"ym_placement_id":"ym_1293871298"'));
      expect(placementInfo).to.include(encodeURIComponent('"ym_placement_id":"ym_0987654321"'));
    });

    it('should add additional information to data parameter of request', function () {
      const data = spec.buildRequests(bidArray, bidderRequest).data;
      expect(data.hasOwnProperty('page_url')).to.be.true;
      expect(data.hasOwnProperty('bust')).to.be.true;
      expect(data.hasOwnProperty('pr')).to.be.true;
      expect(data.hasOwnProperty('scrd')).to.be.true;
      expect(data.dnt).to.be.false;
      expect(data.e).to.equal(90);
      expect(data.hasOwnProperty('description')).to.be.true;
      expect(data.hasOwnProperty('title')).to.be.true;
      expect(data.hasOwnProperty('h')).to.be.true;
      expect(data.hasOwnProperty('w')).to.be.true;
      expect(data.hasOwnProperty('pubcid')).to.be.true;
    });

    it('should add pubcid as parameter of request', function () {
      const pubcidBid = {
        bidder: 'yieldmo',
        params: {},
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        userId: {
          pubcid: 'c604130c-0144-4b63-9bf2-c2bd8c8d86da2',
        },
      };
      const data = spec.buildRequests([pubcidBid], bidderRequest).data;
      expect(data.pubcid).to.deep.equal(
        'c604130c-0144-4b63-9bf2-c2bd8c8d86da2'
      );
    });

    it('should add unified id as parameter of request', function () {
      const unifiedIdBid = {
        bidder: 'yieldmo',
        params: {},
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        userId: {
          tdid,
        },
      };
      const data = spec.buildRequests([unifiedIdBid], bidderRequest).data;
      expect(data.tdid).to.deep.equal(tdid);
    });

    it('should add CRITEO RTUS id as parameter of request', function () {
      const criteoIdBid = {
        bidder: 'yieldmo',
        params: {},
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        userId: {
          criteoId,
        },
      };
      const data = spec.buildRequests([criteoIdBid], bidderRequest).data;
      expect(data.cri_prebid).to.deep.equal(criteoId);
    });

    it('should add gdpr information to request if available', () => {
      bidderRequest.gdprConsent = {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: { blerp: 1 },
        gdprApplies: true,
      };
      const data = spec.buildRequests(bidArray, bidderRequest).data;
      expect(data.userConsent).equal(
        encodeURIComponent(JSON.stringify({
          gdprApplies: true,
          cmp: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        }))
      );
    });

    it('should add ccpa information to request if available', () => {
      const privacy = '1YNY';
      bidderRequest.uspConsent = privacy;
      const data = spec.buildRequests(bidArray, bidderRequest).data;
      expect(data.us_privacy).equal(privacy);
    });

    it('should add schain if it is in the bidRequest', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'indirectseller.com', sid: '00001', hp: 1 }],
      };
      bidArray[0].schain = schain;
      const request = spec.buildRequests([bidArray[0]], bidderRequest);
      expect(request.data.schain).equal(encodeURIComponent(JSON.stringify(schain)));
    });
  });

  describe('interpretResponse', function () {
    let serverResponse;

    beforeEach(function () {
      serverResponse = {
        body: [
          {
            callback_id: '21989fdbef550a',
            cpm: 3.45455,
            width: 300,
            height: 250,
            ad:
              '<html><head></head><body><script>//GEX ad object</script><div id="ym_123" class="ym"></div><script>//js code</script></body></html>',
            creative_id: '9874652394875',
          },
        ],
        header: 'header?',
      };
    });

    it('should correctly reorder the server response', function () {
      const newResponse = spec.interpretResponse(serverResponse);
      expect(newResponse.length).to.be.equal(1);
      expect(newResponse[0]).to.deep.equal({
        requestId: '21989fdbef550a',
        cpm: 3.45455,
        width: 300,
        height: 250,
        creativeId: '9874652394875',
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        ad:
          '<html><head></head><body><script>//GEX ad object</script><div id="ym_123" class="ym"></div><script>//js code</script></body></html>',
      });
    });

    it('should not add responses if the cpm is 0 or null', function () {
      serverResponse.body[0].cpm = 0;
      let response = spec.interpretResponse(serverResponse);
      expect(response).to.deep.equal([]);

      serverResponse.body[0].cpm = null;
      response = spec.interpretResponse(serverResponse);
      expect(response).to.deep.equal([]);
    });
  });

  describe('getUserSync', function () {
    it('should return a tracker with type and url as parameters', function () {
      expect(spec.getUserSyncs()).to.deep.equal([]);
    });
  });
});
