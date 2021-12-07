// import or require modules necessary for the test, e.g.:
import { expect } from 'chai'; // may prefer 'assert' in place of 'expect'
import { spec } from '../../../modules/pilotxBidAdapter.js';

describe('pilotxAdapter', function () {
  describe('isBidRequestValid', function () {
    let banner;
    beforeEach(function () {
      banner = {
        bidder: 'pilotx',
        adUnitCode: 'adunit-test',
        mediaTypes: { banner: {} },
        sizes: [[300, 250], [468, 60]],
        bidId: '2de8c82e30665a',
        params: {
          placementId: '1'
        }
      };
    });

    it('should return false if sizes is empty', function () {
      banner.sizes = []
      expect(spec.isBidRequestValid(banner)).to.equal(false);
    });
    it('should return true if all is valid/ is not empty', function () {
      expect(spec.isBidRequestValid(banner)).to.equal(true);
    });
    it('should return false if there is no placement id found', function () {
      banner.params = {}
      expect(spec.isBidRequestValid(banner)).to.equal(false);
    });
    it('should return false if sizes is empty', function () {
      banner.sizes = []
      expect(spec.isBidRequestValid(banner)).to.equal(false);
    });
    it('should return false for no size and empty params', function() {
      const emptySizes = {
        bidder: 'pilotx',
        adUnitCode: 'adunit-test',
        mediaTypes: { banner: {} },
        bidId: '2de8c82e30665a',
        params: {
          placementId: '1',
          sizes: []
        }
      };
      expect(spec.isBidRequestValid(emptySizes)).to.equal(false);
    })
    it('should return true for no size and valid size params', function() {
      const emptySizes = {
        bidder: 'pilotx',
        adUnitCode: 'adunit-test',
        mediaTypes: { banner: {} },
        bidId: '2de8c82e30665a',
        params: {
          placementId: '1',
          sizes: [[300, 250], [468, 60]]
        }
      };
      expect(spec.isBidRequestValid(emptySizes)).to.equal(true);
    })
    it('should return false for no size items', function() {
      const emptySizes = {
        bidder: 'pilotx',
        adUnitCode: 'adunit-test',
        mediaTypes: { banner: {} },
        bidId: '2de8c82e30665a',
        params: {
          placementId: '1'
        }
      };
      expect(spec.isBidRequestValid(emptySizes)).to.equal(false);
    })
  });

  describe('buildRequests', function () {
    const mockRequest = { refererInfo: {} };
    const mockRequestGDPR = {
      refererInfo: {},
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        gdprApplies: true
      }

    }
    const mockVideo1 = [{
      adUnitCode: 'video1',
      auctionId: '01618029-7ae9-4e98-a73a-1ed0c817f414',
      bidId: '2a59588c0114fa',
      bidRequestsCount: 1,
      bidder: 'pilotx',
      bidderRequestId: '1f6b4ba2039726',
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      crumbs: { pubcid: 'de5240ef-ff80-4b55-8837-26a11cfbf64c' },
      mediaTypes: {
        video: {
          context: 'instream',
          mimes: ['video/mp4'],
          playbackmethod: [2],
          playerSize: [[640, 480]],
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          skip: 1
        }
      },
      ortb2Imp: {
        ext: {
          data: {
            pbadslot: 'video1'
          }
        }
      },
      params: { placementId: '379' },
      sizes: [[640, 480]],
      src: 'client',
      transactionId: 'fec9f2ff-da13-4921-8437-8d679c2be7fe',
    }];
    const mockVideo2 = [{
      adUnitCode: 'video1',
      auctionId: '01618029-7ae9-4e98-a73a-1ed0c817f414',
      bidId: '2a59588c0114fa',
      bidRequestsCount: 1,
      bidder: 'pilotx',
      bidderRequestId: '1f6b4ba2039726',
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      crumbs: { pubcid: 'de5240ef-ff80-4b55-8837-26a11cfbf64c' },
      mediaTypes: {
        video: {
          context: 'instream',
          mimes: ['video/mp4'],
          playbackmethod: [2],
          playerSize: [[640, 480]],
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          skip: 1
        }
      },
      ortb2Imp: {
        ext: {
          data: {
            pbadslot: 'video1'
          }
        }
      },
      params: { placementId: '379' },
      sizes: [640, 480],
      src: 'client',
      transactionId: 'fec9f2ff-da13-4921-8437-8d679c2be7fe',
    }];
    it('should return correct response', function () {
      const builtRequest = spec.buildRequests(mockVideo1, mockRequest)
      let builtRequestData = builtRequest.data
      let data = JSON.parse(builtRequestData)
      expect(data['379'].bidId).to.equal(mockVideo1[0].bidId)
    });
    it('should return correct response for only array of size', function () {
      const builtRequest = spec.buildRequests(mockVideo2, mockRequest)
      let builtRequestData = builtRequest.data
      let data = JSON.parse(builtRequestData)
      expect(data['379'].sizes[0][0]).to.equal(mockVideo2[0].sizes[0])
      expect(data['379'].sizes[0][1]).to.equal(mockVideo2[0].sizes[1])
    });
    it('should be valid and pass gdpr items correctly', function () {
      const builtRequest = spec.buildRequests(mockVideo2, mockRequestGDPR)
      let builtRequestData = builtRequest.data
      let data = JSON.parse(builtRequestData)
      expect(data['379'].gdprConsentString).to.equal(mockRequestGDPR.gdprConsent.consentString)
      expect(data['379'].gdprConsentRequired).to.equal(mockRequestGDPR.gdprConsent.gdprApplies)
    });
  });
  describe('interpretResponse', function () {
    const bidRequest = {}
    const serverResponse = {
      cpm: 2.5,
      creativeId: 'V9060',
      currency: 'US',
      height: 480,
      mediaType: 'video',
      netRevenue: false,
      requestId: '273b39c74069cb',
      ttl: 3000,
      vastUrl: 'http://testadserver.com/ads?&k=60cd901ad8ab70c9cedf373cb17b93b8&pid=379&tid=91342717',
      width: 640
    }
    const serverResponseVideo = {
      body: serverResponse
    }
    const serverResponse2 = {
      cpm: 2.5,
      creativeId: 'V9060',
      currency: 'US',
      height: 480,
      mediaType: 'banner',
      netRevenue: false,
      requestId: '273b39c74069cb',
      ttl: 3000,
      vastUrl: 'http://testadserver.com/ads?&k=60cd901ad8ab70c9cedf373cb17b93b8&pid=379&tid=91342717',
      width: 640
    }
    const serverResponseBanner = {
      body: serverResponse2
    }
    it('should be valid from bidRequest for video', function () {
      const bidResponses = spec.interpretResponse(serverResponseVideo, bidRequest)
      expect(bidResponses[0].requestId).to.equal(serverResponse.requestId)
      expect(bidResponses[0].cpm).to.equal(serverResponse.cpm)
      expect(bidResponses[0].width).to.equal(serverResponse.width)
      expect(bidResponses[0].height).to.equal(serverResponse.height)
      expect(bidResponses[0].creativeId).to.equal(serverResponse.creativeId)
      expect(bidResponses[0].currency).to.equal(serverResponse.currency)
      expect(bidResponses[0].netRevenue).to.equal(serverResponse.netRevenue)
      expect(bidResponses[0].ttl).to.equal(serverResponse.ttl)
      expect(bidResponses[0].vastUrl).to.equal(serverResponse.vastUrl)
      expect(bidResponses[0].mediaType).to.equal(serverResponse.mediaType)
      expect(bidResponses[0].meta.mediaType).to.equal(serverResponse.mediaType)
    });
    it('should be valid from bidRequest for banner', function () {
      const bidResponses = spec.interpretResponse(serverResponseBanner, bidRequest)
      expect(bidResponses[0].requestId).to.equal(serverResponse2.requestId)
      expect(bidResponses[0].cpm).to.equal(serverResponse2.cpm)
      expect(bidResponses[0].width).to.equal(serverResponse2.width)
      expect(bidResponses[0].height).to.equal(serverResponse2.height)
      expect(bidResponses[0].creativeId).to.equal(serverResponse2.creativeId)
      expect(bidResponses[0].currency).to.equal(serverResponse2.currency)
      expect(bidResponses[0].netRevenue).to.equal(serverResponse2.netRevenue)
      expect(bidResponses[0].ttl).to.equal(serverResponse2.ttl)
      expect(bidResponses[0].ad).to.equal(serverResponse2.ad)
      expect(bidResponses[0].mediaType).to.equal(serverResponse2.mediaType)
      expect(bidResponses[0].meta.mediaType).to.equal(serverResponse2.mediaType)
    });
  });
  describe('setPlacementID', function () {
    const multiplePlacementIds = ['380', '381']
    it('should be valid with an array of placement ids passed', function () {
      const placementID = spec.setPlacementID(multiplePlacementIds)
      expect(placementID).to.equal('380#381')
    });
    it('should be valid with single placement ID passed', function () {
      const placementID = spec.setPlacementID('381')
      expect(placementID).to.equal('381')
    });
  });
  // Add other `describe` or `it` blocks as necessary
});
