import { expect } from 'chai';
import {
  _getBidRequests,
  getBidFloor as connatixGetBidFloor,
  spec,
} from '../../../modules/connatixBidAdapter.js';
import * as ajax from '../../../src/ajax.js';
import { ADPOD, BANNER, VIDEO } from '../../../src/mediaTypes.js';

describe('connatixBidAdapter', function () {
  let bid;

  function mockBidRequest() {
    const mediaTypes = {
      banner: {
        sizes: [16, 9],
      }
    };
    return {
      bidId: 'testing',
      bidder: 'connatix',
      params: {
        placementId: '30e91414-545c-4f45-a950-0bec9308ff22'
      },
      mediaTypes
    };
  };

  function addVideoToBidMock(bid) {
    const mediaTypes = {
      video: {
        context: 'instream',
        w: 1280,
        h: 720,
        playerSize: [1280, 720],
        placement: 1,
        plcmt: 1,
        api: [1, 2],
        mimes: ['video/mp4', 'application/javascript'],
        minduration: 30,
        maxduration: 60,
        startdelay: 0,
      }
    }

    bid.mediaTypes = mediaTypes;
  }

  describe('_getBidRequests', function () {
    let bid;

    // Mock a bid request similar to the one already used in connatixBidAdapter tests
    function mockBidRequest() {
      const mediaTypes = {
        banner: {
          sizes: [16, 9],
        }
      };
      return {
        bidId: 'testing',
        bidder: 'connatix',
        params: {
          placementId: '30e91414-545c-4f45-a950-0bec9308ff22',
          viewabilityContainerIdentifier: 'viewabilityId',
        },
        mediaTypes,
        sizes: [300, 250]
      };
    }

    it('should map valid bid requests and include the expected fields', function () {
      bid = mockBidRequest();

      const result = _getBidRequests([bid]);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.have.property('bidId', bid.bidId);
      expect(result[0]).to.have.property('mediaTypes', bid.mediaTypes);
      expect(result[0]).to.have.property('sizes', bid.sizes);
      expect(result[0]).to.have.property('placementId', bid.params.placementId);
      expect(result[0]).to.have.property('hasViewabilityContainerId', true);
    });

    it('should set hasViewabilityContainerId to false when viewabilityContainerIdentifier is absent', function () {
      bid = mockBidRequest();
      delete bid.params.viewabilityContainerIdentifier;

      const result = _getBidRequests([bid]);

      expect(result[0]).to.have.property('hasViewabilityContainerId', false);
    });

    it('should call getBidFloor for each bid and return the correct floor value', function () {
      bid = mockBidRequest();
      const floorValue = 5;

      // Mock getFloor method on bid
      bid.getFloor = function() {
        return { floor: floorValue };
      };

      const result = _getBidRequests([bid]);

      expect(result[0]).to.have.property('floor', floorValue);
    });

    it('should return floor as 0 if getBidFloor throws an error', function () {
      bid = mockBidRequest();

      // Mock getFloor method to throw an error
      bid.getFloor = function() {
        throw new Error('error');
      };

      const result = _getBidRequests([bid]);

      expect(result[0]).to.have.property('floor', 0);
    });
  });

  describe('onTimeout', function () {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(spec, 'triggerEvent')
    })

    afterEach(() => {
      ajaxStub.restore()
    });

    it('call event if bidder is connatix', () => {
      const result = spec.onTimeout([{
        bidder: 'connatix',
        timeout: 500,
      }]);
      expect(ajaxStub.calledOnce).to.equal(true);

      const data = ajaxStub.firstCall.args[0];
      expect(data.type).to.equal('Timeout');
      expect(data.timeout).to.equal(500);
    });

    it('timeout event is not triggered if bidder is not connatix', () => {
      const result = spec.onTimeout([{
        bidder: 'otherBidder',
        timeout: 500,
      }]);
      expect(ajaxStub.notCalled).to.equal(true);
    });
  });

  describe('onBidWon', function () {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(spec, 'triggerEvent');
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('calls triggerEvent with correct data when bidWinData is provided', () => {
      const bidWinData = {
        bidder: 'connatix',
        cpm: 2.5,
        requestId: 'abc123',
        adUnitCode: 'adunit_1',
        timeToRespond: 300,
        auctionId: 'auction_456',
      };

      spec.onBidWon(bidWinData);
      expect(ajaxStub.calledOnce).to.equal(true);

      const eventData = ajaxStub.firstCall.args[0];
      expect(eventData.type).to.equal('BidWon');
      expect(eventData.bestBidBidder).to.equal('connatix');
      expect(eventData.bestBidPrice).to.equal(2.5);
      expect(eventData.requestId).to.equal('abc123');
      expect(eventData.adUnitCode).to.equal('adunit_1');
      expect(eventData.timeToRespond).to.equal(300);
      expect(eventData.auctionId).to.equal('auction_456');
    });

    it('does not call triggerEvent if bidWinData is null', () => {
      spec.onBidWon(null);
      expect(ajaxStub.notCalled).to.equal(true);
    });

    it('does not call triggerEvent if bidWinData is undefined', () => {
      spec.onBidWon(undefined);
      expect(ajaxStub.notCalled).to.equal(true);
    });
  });

  describe('triggerEvent', function () {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax');
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should call ajax with the correct parameters', () => {
      const data = { type: 'BidWon', bestBidBidder: 'bidder1', bestBidPrice: 1.5, requestId: 'req123', adUnitCode: 'ad123', timeToRespond: 250, auctionId: 'auc123', context: {} };
      spec.triggerEvent(data);

      expect(ajaxStub.calledOnce).to.equal(true);
      const [url, _, payload, options] = ajaxStub.firstCall.args;
      expect(url).to.equal('https://capi.connatix.com/tr/am');
      expect(payload).to.equal(JSON.stringify(data));
      expect(options.method).to.equal('POST');
      expect(options.withCredentials).to.equal(false);
    });
  });

  describe('isBidRequestValid', function () {
    this.beforeEach(function () {
      bid = mockBidRequest();
    });

    it('Should return true if all required fileds are present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if bidId is missing', function () {
      delete bid.bidId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if params object is missing', function () {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if placementId is missing from params', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if mediaTypes is missing', function () {
      delete bid.mediaTypes;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if both banner and video are missing from mediaTypes', function () {
      delete bid.mediaTypes.banner;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if sizes is missing from banner object', function () {
      delete bid.mediaTypes.banner.sizes;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if sizes is not an array', function () {
      bid.mediaTypes.banner.sizes = 'test';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false if sizes is an empty array', function () {
      bid.mediaTypes.banner.sizes = [];
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return true if video is set correctly', function () {
      addVideoToBidMock(bid);
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if context is set to adpod on video media type', function() {
      addVideoToBidMock(bid);
      bid.mediaTypes.video.context = ADPOD;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return true if add an extra field was added to the bidRequest', function () {
      bid.params.test = 1;
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('buildRequests', function () {
    let serverRequest;
    let bidderRequest = {
      refererInfo: {
        canonicalUrl: '',
        numIframes: 0,
        reachedTop: true,
        referer: 'http://example.com',
        stack: ['http://example.com']
      },
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: {},
        gdprApplies: true
      },
      uspConsent: '1YYY',
      gppConsent: {
        gppString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        applicableSections: [7]
      },
      ortb2: {
        site: {
          data: {
            pageType: 'article'
          }
        }
      }
    };

    this.beforeEach(function () {
      bid = mockBidRequest();
      serverRequest = spec.buildRequests([bid], bidderRequest);
    })

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
      expect(serverRequest.url).to.equal('https://capi.connatix.com/rtb/hba');
    });
    it('Returns request payload', function () {
      expect(serverRequest.data).to.not.empty;
    });
    it('Validate request payload', function () {
      expect(serverRequest.data.bidRequests[0].bidId).to.equal(bid.bidId);
      expect(serverRequest.data.bidRequests[0].placementId).to.equal(bid.params.placementId);
      expect(serverRequest.data.bidRequests[0].floor).to.equal(0);
      expect(serverRequest.data.bidRequests[0].mediaTypes).to.equal(bid.mediaTypes);
      expect(serverRequest.data.bidRequests[0].sizes).to.equal(bid.mediaTypes.sizes);
      expect(serverRequest.data.refererInfo).to.equal(bidderRequest.refererInfo);
      expect(serverRequest.data.gdprConsent).to.equal(bidderRequest.gdprConsent);
      expect(serverRequest.data.uspConsent).to.equal(bidderRequest.uspConsent);
      expect(serverRequest.data.gppConsent).to.equal(bidderRequest.gppConsent);
      expect(serverRequest.data.ortb2).to.equal(bidderRequest.ortb2);
    });
  });

  describe('interpretResponse', function () {
    const CustomerId = '99f20d18-c4b4-4a28-3d8e-d43e2c8cb4ac';
    const PlayerId = 'e4984e88-9ff4-45a3-8b9d-33aabcad634f';
    const Bid = {Cpm: 0.1, RequestId: '2f897340c4eaa3', Ttl: 86400, CustomerId, PlayerId};

    let serverResponse;
    this.beforeEach(function () {
      serverResponse = {
        body: {
          Bids: [ Bid ]
        },
        headers: function() { }
      };
    });

    it('Should return an empty array if Bids is null', function () {
      serverResponse.body.Bids = null;

      const response = spec.interpretResponse(serverResponse);
      expect(response).to.be.an('array').that.is.empty;
    });

    it('Should return an empty array if Bids is empty array', function () {
      serverResponse.body.Bids = [];
      const response = spec.interpretResponse(serverResponse);
      expect(response).to.be.an('array').that.is.empty;
    });

    it('Should return one bid response for one bid', function() {
      const bidResponses = spec.interpretResponse(serverResponse);
      expect(bidResponses.length).to.equal(1);
    });

    it('Should contains the same values as in the serverResponse', function() {
      const bidResponses = spec.interpretResponse(serverResponse);

      const [ bidResponse ] = bidResponses;
      expect(bidResponse.requestId).to.equal(serverResponse.body.Bids[0].RequestId);
      expect(bidResponse.cpm).to.equal(serverResponse.body.Bids[0].Cpm);
      expect(bidResponse.ttl).to.equal(serverResponse.body.Bids[0].Ttl);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.mediaType).to.equal(BANNER);
      expect(bidResponse.netRevenue).to.be.true;
    });

    it('Should return n bid responses for n bids', function() {
      serverResponse.body.Bids = [ { ...Bid }, { ...Bid } ];

      const firstBidCpm = 4;
      serverResponse.body.Bids[0].Cpm = firstBidCpm;

      const secondBidCpm = 13;
      serverResponse.body.Bids[1].Cpm = secondBidCpm;

      const bidResponses = spec.interpretResponse(serverResponse);
      expect(bidResponses.length).to.equal(2);

      expect(bidResponses[0].cpm).to.equal(firstBidCpm);
      expect(bidResponses[1].cpm).to.equal(secondBidCpm);
    });

    it('Should contain specific values for banner bids', function () {
      const adHtml = 'ad html'
      serverResponse.body.Bids = [ { ...Bid, Ad: adHtml } ];

      const bidResponses = spec.interpretResponse(serverResponse);
      const [ bidResponse ] = bidResponses;

      expect(bidResponse.vastXml).to.be.undefined;
      expect(bidResponse.ad).to.equal(adHtml);
      expect(bidResponse.mediaType).to.equal(BANNER);
    });

    it('Should contain specific values for video bids', function () {
      const adVastXml = 'ad vast xml'
      serverResponse.body.Bids = [ { ...Bid, VastXml: adVastXml } ];

      const bidResponses = spec.interpretResponse(serverResponse);
      const [ bidResponse ] = bidResponses;

      expect(bidResponse.ad).to.be.undefined;
      expect(bidResponse.vastXml).to.equal(adVastXml);
      expect(bidResponse.mediaType).to.equal(VIDEO);
    });
  });

  describe('getUserSyncs', function() {
    const CustomerId = '99f20d18-c4b4-4a28-3d8e-d43e2c8cb4ac';
    const PlayerId = 'e4984e88-9ff4-45a3-8b9d-33aabcad634f';
    const UserSyncEndpoint = 'https://connatix.com/sync'
    const Bid = {Cpm: 0.1, RequestId: '2f897340c4eaa3', Ttl: 86400, CustomerId, PlayerId};

    const serverResponse = {
      body: {
        UserSyncEndpoint,
        Bids: [ Bid ]
      },
      headers: function() { }
    };

    it('Should return an empty array when iframeEnabled: false', function () {
      expect(spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [], {}, {}, {})).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array when serverResponses is emprt array', function () {
      expect(spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [], {}, {}, {})).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array when iframeEnabled: true but serverResponses in an empty array', function () {
      expect(spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [serverResponse], {}, {}, {})).to.be.an('array').that.is.empty;
    });
    it('Should return an empty array when iframeEnabled: true but serverResponses in an not defined or null', function () {
      expect(spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, undefined, {}, {}, {})).to.be.an('array').that.is.empty;
      expect(spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, null, {}, {}, {})).to.be.an('array').that.is.empty;
    });
    it('Should return one user sync object when iframeEnabled is true and serverResponses is not an empry array', function () {
      expect(spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [serverResponse], {}, {}, {})).to.be.an('array').that.is.not.empty;
    });
    it('Should return a list containing a single object having type: iframe and url: syncUrl', function () {
      const userSyncList = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [serverResponse], undefined, undefined, undefined);
      const { type, url } = userSyncList[0];
      expect(type).to.equal('iframe');
      expect(url).to.equal(UserSyncEndpoint);
    });
    it('Should append gdpr: 0 if gdprConsent object is provided but gdprApplies field is not provided', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse],
        {},
        undefined,
        undefined
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpoint}?gdpr=0`);
    });
    it('Should append gdpr having the value of gdprApplied if gdprConsent object is present and have gdprApplies field', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse],
        {gdprApplies: true},
        undefined,
        undefined
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpoint}?gdpr=1`);
    });
    it('Should append gdpr_consent if gdprConsent object is present and have gdprApplies field', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse],
        {gdprApplies: true, consentString: 'alabala'},
        undefined,
        undefined
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpoint}?gdpr=1&gdpr_consent=alabala`);
    });
    it('Should encodeURI gdpr_consent corectly', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse],
        {gdprApplies: true, consentString: 'test&2'},
        undefined,
        undefined
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpoint}?gdpr=1&gdpr_consent=test%262`);
    });
    it('Should append usp_consent to the url if uspConsent is provided', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse],
        {gdprApplies: true, consentString: 'test&2'},
        '1YYYN',
        undefined
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpoint}?gdpr=1&gdpr_consent=test%262&us_privacy=1YYYN`);
    });
    it('Should not modify the sync url if gppConsent param is provided', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse],
        {gdprApplies: true, consentString: 'test&2'},
        '1YYYN',
        {consent: '1'}
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpoint}?gdpr=1&gdpr_consent=test%262&us_privacy=1YYYN`);
    });
  });

  describe('userIdAsEids', function() {
    let validBidRequests;

    this.beforeEach(function () {
      bid = mockBidRequest();
      validBidRequests = [bid];
    })

    it('Connatix adapter reads EIDs from Prebid user models and adds it to Request', function() {
      validBidRequests[0].userIdAsEids = [{
        'source': 'adserver.org',
        'uids': [{
          'id': 'TTD_ID_FROM_USER_ID_MODULE',
          'atype': 1,
          'ext': {
            'stype': 'ppuid',
            'rtiPartner': 'TDID'
          }
        }]
      },
      {
        'source': 'pubserver.org',
        'uids': [{
          'id': 'TDID_FROM_USER_ID_MODULE',
          'atype': 1
        }]
      }];
      let serverRequest = spec.buildRequests(validBidRequests, {});
      expect(serverRequest.data.userIdList).to.deep.equal(validBidRequests[0].userIdAsEids);
    });
  });

  describe('getBidFloor', function () {
    this.beforeEach(function () {
      bid = mockBidRequest();
    });

    it('Should return 0 if both getFloor method and bidfloor param from bid are absent.', function () {
      const floor = connatixGetBidFloor(bid);
      expect(floor).to.equal(0);
    });

    it('Should return the value of the bidfloor parameter if the getFloor method is not defined but the bidfloor parameter is defined', function () {
      const floorValue = 3;
      bid.params.bidfloor = floorValue;

      const floor = connatixGetBidFloor(bid);
      expect(floor).to.equal(floorValue);
    });

    it('Should return the value of the getFloor method if the getFloor method is defined but the bidfloor parameter is not defined', function () {
      const floorValue = 7;
      bid.getFloor = function() {
        return { floor: floorValue };
      };

      const floor = connatixGetBidFloor(bid);
      expect(floor).to.equal(floorValue);
    });

    it('Should return the value of the getFloor method if both getFloor method and bidfloor parameter are defined', function () {
      const floorParamValue = 3;
      bid.params.bidfloor = floorParamValue;

      const floorMethodValue = 7;
      bid.getFloor = function() {
        return { floor: floorMethodValue };
      };

      const floor = connatixGetBidFloor(bid);
      expect(floor).to.equal(floorMethodValue);
    });

    it('Should return 0 if the getFloor method is defined and it crash when call it', function () {
      bid.getFloor = function() {
        throw new Error('error');
      };
      const floor = connatixGetBidFloor(bid);
      expect(floor).to.equal(0);
    });
  });
});
