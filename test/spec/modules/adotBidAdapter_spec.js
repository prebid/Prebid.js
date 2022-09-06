import { expect } from 'chai';
import { spec } from 'modules/adotBidAdapter.js';

const BIDDER_URL = 'https://dsp.adotmob.com/headerbidding/bidrequest';

describe('Adot Adapter', function () {
  describe('isBidRequestValid', function () {
    it('should return false if video and !isValidVideo', function () {
      const bid = { mediaTypes: { video: {} } };
      const isBidRequestValid = spec.isBidRequestValid(bid);
      expect(isBidRequestValid).to.equal(false);
    })

    it('should return true if video and isValidVideo', function () {
      const bid = { mediaTypes: { video: { 'mimes': 1, 'protocols': 1 } } };
      const isBidRequestValid = spec.isBidRequestValid(bid);
      expect(isBidRequestValid).to.equal(true);
    })

    it('should return true if !video', function () {
      const bid = { mediaTypes: { banner: {} } };
      const isBidRequestValid = spec.isBidRequestValid(bid);
      expect(isBidRequestValid).to.equal(true);
    })
  });

  describe('buildRequests', function () {
    it('should build request (banner)', function () {
      const bidderRequestId = 'bidderRequestId';
      const validBidRequests = [{ bidderRequestId, mediaTypes: {} }, { bidderRequestId, bidId: 'bidId', mediaTypes: { banner: { sizes: [[300, 250]] } }, params: { placementId: 'placementId', adUnitCode: 200 } }];
      const bidderRequest = { position: 2, refererInfo: { page: 'http://localhost.com', domain: 'localhost.com' }, gdprConsent: { consentString: 'consentString', gdprApplies: true }, userId: { pubProvidedId: 'userId' }, schain: { ver: '1.0' } };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const buildBidRequestResponse = {
        id: bidderRequestId,
        imp: [{
          id: validBidRequests[1].bidId,
          ext: {
            placementId: validBidRequests[1].params.placementId,
            adUnitCode: validBidRequests[1].adUnitCode,
            container: undefined
          },
          banner: {
            pos: bidderRequest.position,
            format: [{ w: validBidRequests[1].mediaTypes.banner.sizes[0][0], h: validBidRequests[1].mediaTypes.banner.sizes[0][1] }]
          },
          bidfloorcur: 'USD',
          bidfloor: 0
        }],
        site: {
          page: bidderRequest.refererInfo.page,
          domain: 'localhost.com',
          name: 'localhost.com',
          publisher: {
            // id: 'adot'
            id: undefined
          },
          ext: { schain: { ver: '1.0' } }
        },
        device: { ua: navigator.userAgent, language: navigator.language },
        user: { ext: { consent: bidderRequest.gdprConsent.consentString, pubProvidedId: 'userId' } },
        regs: { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies } },
        ext: {
          adot: { adapter_version: 'v2.0.0' },
          should_use_gzip: true
        },
        at: 1
      }

      expect(request).to.deep.equal([{
        method: 'POST',
        url: BIDDER_URL,
        data: buildBidRequestResponse
      }])
    })

    it('should build request (native)', function () {
      const bidderRequestId = 'bidderRequestId';
      const validBidRequests = [{ bidderRequestId, mediaTypes: {} }, { bidderRequestId, bidId: 'bidId', mediaTypes: { native: { title: { required: true, len: 50, sizes: [[300, 250]] }, wrong: {}, image: {} } }, params: { placementId: 'placementId', adUnitCode: 200 } }];
      const bidderRequest = { position: 2, refererInfo: { page: 'http://localhost.com', domain: 'localhost.com' }, gdprConsent: { consentString: 'consentString', gdprApplies: true }, userId: { pubProvidedId: 'userId' }, schain: { ver: '1.0' } };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const buildBidRequestResponse = {
        id: bidderRequestId,
        imp: [{
          id: validBidRequests[1].bidId,
          ext: {
            placementId: validBidRequests[1].params.placementId,
            adUnitCode: validBidRequests[1].adUnitCode,
            container: undefined
          },
          native: {
            request: '{\"assets\":[{\"id\":1,\"required\":true,\"title\":{\"len\":50,\"wmin\":300,\"hmin\":250}},{\"id\":3,\"img\":{\"type\":3}}]}'
          },
          bidfloorcur: 'USD',
          bidfloor: 0
        }],
        site: {
          page: bidderRequest.refererInfo.page,
          domain: 'localhost.com',
          name: 'localhost.com',
          publisher: {
            // id: 'adot'
            id: undefined
          },
          ext: { schain: { ver: '1.0' } }
        },
        device: { ua: navigator.userAgent, language: navigator.language },
        user: { ext: { consent: bidderRequest.gdprConsent.consentString, pubProvidedId: 'userId' } },
        regs: { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies } },
        ext: {
          adot: { adapter_version: 'v2.0.0' },
          should_use_gzip: true
        },
        at: 1
      }

      expect(request).to.deep.equal([{
        method: 'POST',
        url: BIDDER_URL,
        data: buildBidRequestResponse
      }])
    })

    it('should build request (video)', function () {
      const bidderRequestId = 'bidderRequestId';
      const validBidRequests = [{ bidderRequestId, mediaTypes: {} }, { bidderRequestId, bidId: 'bidId', mediaTypes: { video: { playerSize: [[300, 250]], minduration: 1, maxduration: 2, api: 'api', linearity: 'linearity', mimes: [], placement: 'placement', playbackmethod: 'playbackmethod', protocols: 'protocol', startdelay: 'startdelay' } }, params: { placementId: 'placementId', adUnitCode: 200 } }];
      const bidderRequest = { position: 2, refererInfo: { page: 'http://localhost.com', domain: 'localhost.com' }, gdprConsent: { consentString: 'consentString', gdprApplies: true }, userId: { pubProvidedId: 'userId' }, schain: { ver: '1.0' } };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const buildBidRequestResponse = {
        id: bidderRequestId,
        imp: [{
          id: validBidRequests[1].bidId,
          ext: {
            placementId: validBidRequests[1].params.placementId,
            adUnitCode: validBidRequests[1].adUnitCode,
            container: undefined
          },
          video: {
            api: 'api',
            h: 250,
            linearity: 'linearity',
            maxduration: 2,
            mimes: [],
            minduration: 1,
            placement: 'placement',
            playbackmethod: 'playbackmethod',
            pos: 0,
            protocols: 'protocol',
            skip: 0,
            startdelay: 'startdelay',
            w: 300
          },
          bidfloorcur: 'USD',
          bidfloor: 0
        }],
        site: {
          page: bidderRequest.refererInfo.page,
          domain: 'localhost.com',
          name: 'localhost.com',
          publisher: {
            // id: 'adot'
            id: undefined
          },
          ext: { schain: { ver: '1.0' } }
        },
        device: { ua: navigator.userAgent, language: navigator.language },
        user: { ext: { consent: bidderRequest.gdprConsent.consentString, pubProvidedId: 'userId' } },
        regs: { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies } },
        ext: {
          adot: { adapter_version: 'v2.0.0' },
          should_use_gzip: true
        },
        at: 1
      }

      expect(request).to.deep.equal([{
        method: 'POST',
        url: BIDDER_URL,
        data: buildBidRequestResponse
      }])
    })
  });

  describe('interpretResponse', function () {
    it('should return [] if !isValidResponse', function () {
      const serverResponse = 'response';
      const request = 'request';
      const interpretedResponse = spec.interpretResponse(serverResponse, request);
      expect(interpretedResponse).to.deep.equal([]);
    })

    it('should return [] if !isValidRequest', function () {
      const serverResponse = { body: { cur: 'EUR', seatbid: [] } };
      const request = 'request';
      const interpretedResponse = spec.interpretResponse(serverResponse, request);
      expect(interpretedResponse).to.deep.equal([]);
    })

    it('should return bidResponse with random media type', function () {
      const impId = 'impId';
      const bid = { adm: 'adm', impid: impId, price: 2, crid: 'crid', dealid: 'dealid', adomain: 'adomain', ext: { adot: { media_type: 'media_type', size: { w: 300, h: 250 } } } }
      const serverResponse = { body: { cur: 'EUR', seatbid: [{ bid: {} }, { bid: [bid] }] } };
      const request = { data: { imp: [{ id: impId }] } };
      const bidResponse = {
        requestId: impId,
        cpm: bid.price,
        currency: serverResponse.body.cur,
        ttl: 10,
        creativeId: bid.crid,
        netRevenue: true,
        mediaType: bid.ext.adot.media_type,
        dealId: bid.dealid,
        meta: { advertiserDomains: bid.adomain },
        width: bid.ext.adot.size.w,
        height: bid.ext.adot.size.h,
        ad: bid.adm,
        adUrl: null,
        vastXml: null,
        vastUrl: null,
        renderer: null
      }

      const interpretedResponse = spec.interpretResponse(serverResponse, request);
      expect(interpretedResponse).to.deep.equal([bidResponse]);
    })

    it('should return bidResponse with native', function () {
      const impId = 'impId';
      const bid = { adm: '{"native":{"assets":[{"id":1,"title":{"text":"title"}},{"id":3,"img":{"url":"url","w":300,"h":250}}],"link":{"url":"clickUrl","clicktrackers":"clicktrackers"},"imptrackers":["imptracker"],"jstracker":"jstracker"}}', impid: impId, price: 2, crid: 'crid', dealid: 'dealid', adomain: 'adomain', ext: { adot: { media_type: 'native', size: { width: 300, height: 250 } } } }
      const serverResponse = { body: { cur: 'EUR', seatbid: [{ bid: {} }, { bid: [bid] }] } };
      const request = { data: { imp: [{ id: impId }] } };
      const bidResponse = {
        requestId: impId,
        cpm: bid.price,
        currency: serverResponse.body.cur,
        ttl: 10,
        creativeId: bid.crid,
        netRevenue: true,
        mediaType: bid.ext.adot.media_type,
        dealId: bid.dealid,
        meta: { advertiserDomains: bid.adomain },
        native: {
          title: 'title',
          image: { url: 'url', width: 300, height: 250 },
          clickUrl: 'clickUrl',
          clickTrackers: 'clicktrackers',
          impressionTrackers: ['imptracker'],
          javascriptTrackers: ['jstracker']
        }
      }

      const interpretedResponse = spec.interpretResponse(serverResponse, request);
      expect(interpretedResponse).to.deep.equal([bidResponse]);
    })

    it('should return bidResponse with video', function () {
      const impId = 'impId';
      const bid = { nurl: 'nurl', impid: impId, price: 2, crid: 'crid', dealid: 'dealid', adomain: 'adomain', ext: { adot: { media_type: 'video', size: { w: 300, h: 250 }, container: {}, adUnitCode: 20, video: { type: 'outstream' } } } }
      const serverResponse = { body: { cur: 'EUR', seatbid: [{ bid: {} }, { bid: [bid] }] } };
      const request = { data: { imp: [{ id: impId }] } };
      const bidResponse = {
        requestId: impId,
        cpm: bid.price,
        currency: serverResponse.body.cur,
        ttl: 10,
        creativeId: bid.crid,
        netRevenue: true,
        mediaType: bid.ext.adot.media_type,
        dealId: bid.dealid,
        meta: { advertiserDomains: bid.adomain },
        w: bid.ext.adot.size.w,
        h: bid.ext.adot.size.h,
        ad: null,
        adUrl: bid.nurl,
        vastXml: null,
        vastUrl: bid.nurl
      }

      const interpretedResponse = spec.interpretResponse(serverResponse, request);
      expect(interpretedResponse).to.be.an('array').and.to.have.lengthOf(1)
      expect(interpretedResponse[0].requestId).to.deep.equal(bidResponse.requestId);
      expect(interpretedResponse[0].cpm).to.deep.equal(bidResponse.cpm);
      expect(interpretedResponse[0].currency).to.deep.equal(bidResponse.currency);
      expect(interpretedResponse[0].ttl).to.deep.equal(bidResponse.ttl);
      expect(interpretedResponse[0].creativeId).to.deep.equal(bidResponse.creativeId);
      expect(interpretedResponse[0].netRevenue).to.deep.equal(bidResponse.netRevenue);
      expect(interpretedResponse[0].mediaType).to.deep.equal(bidResponse.mediaType);
      expect(interpretedResponse[0].dealId).to.deep.equal(bidResponse.dealId);
      expect(interpretedResponse[0].meta).to.deep.equal(bidResponse.meta);
      expect(interpretedResponse[0].width).to.deep.equal(bidResponse.w);
      expect(interpretedResponse[0].height).to.deep.equal(bidResponse.h);
      expect(interpretedResponse[0].ad).to.deep.equal(bidResponse.ad);
      expect(interpretedResponse[0].adUrl).to.deep.equal(bidResponse.adUrl);
      expect(interpretedResponse[0].vastXml).to.deep.equal(bidResponse.vastXml);
      expect(interpretedResponse[0].vastUrl).to.deep.equal(bidResponse.vastUrl);
      expect(interpretedResponse[0].renderer).to.be.an('object');
    })
  });

  describe('getFloor', function () {
    it('should return 0 if getFloor is not a function', function () {
      const floor = spec.getFloor({ getFloor: 0 });
      expect(floor).to.deep.equal(0);
    })

    it('should return floor result if currency are correct', function () {
      const currency = 'EUR';
      const floorResult = 2;
      const fn = sinon.stub().callsFake(() => ({ currency, floor: floorResult }))
      const adUnit = { getFloor: fn };
      const size = {};
      const mediaType = {};

      const floor = spec.getFloor(adUnit, size, mediaType, currency);
      expect(floor).to.deep.equal(floorResult);
      expect(fn.calledOnce).to.equal(true);
      expect(fn.calledWithExactly({ currency, mediaType, size })).to.equal(true);
    })

    it('should return floor result if currency are not correct', function () {
      const currency = 'EUR';
      const floorResult = 2;
      const fn = sinon.stub().callsFake(() => ({ currency: 'wrong_currency', floor: floorResult }))
      const adUnit = { getFloor: fn };
      const size = {};
      const mediaType = {};

      const floor = spec.getFloor(adUnit, size, mediaType, currency);
      expect(floor).to.deep.equal(0);
      expect(fn.calledOnce).to.equal(true);
      expect(fn.calledWithExactly({ currency, mediaType, size })).to.equal(true);
    })
  });
});
