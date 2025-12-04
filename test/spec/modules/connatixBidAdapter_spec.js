import { expect } from 'chai';
import sinon from 'sinon';
import {
  _getBidRequests,
  _canSelectViewabilityContainer as connatixCanSelectViewabilityContainer,
  detectViewability as connatixDetectViewability,
  getBidFloor as connatixGetBidFloor,
  _getMinSize as connatixGetMinSize,
  _getViewability as connatixGetViewability,
  hasQueryParams as connatixHasQueryParams,
  _isViewabilityMeasurable as connatixIsViewabilityMeasurable,
  readFromAllStorages as connatixReadFromAllStorages,
  saveOnAllStorages as connatixSaveOnAllStorages,
  spec,
  storage
} from '../../../modules/connatixBidAdapter.js';
import adapterManager from '../../../src/adapterManager.js';
import * as ajax from '../../../src/ajax.js';
import { ADPOD, BANNER, VIDEO } from '../../../src/mediaTypes.js';
import * as utils from '../../../src/utils.js';
import * as winDimensions from '../../../src/utils/winDimensions.js';

const BIDDER_CODE = 'connatix';

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

  describe('connatixGetMinSize', () => {
    it('should return the smallest size based on area', () => {
      const sizes = [
        { w: 300, h: 250 },
        { w: 728, h: 90 },
        { w: 160, h: 600 }
      ];
      const result = connatixGetMinSize(sizes);
      expect(result).to.deep.equal({ w: 728, h: 90 });
    });

    it('should handle an array with one size', () => {
      const sizes = [{ w: 300, h: 250 }];
      const result = connatixGetMinSize(sizes);
      expect(result).to.deep.equal({ w: 300, h: 250 });
    });

    it('should handle empty array', () => {
      const sizes = [];
      const result = connatixGetMinSize(sizes);
      expect(result).to.be.undefined;
    });
  });

  describe('_isIframe', () => {
    let querySelectorStub;

    beforeEach(() => {
      querySelectorStub = sinon.stub(window.top.document, 'querySelector');
    });

    afterEach(() => {
      querySelectorStub.restore();
    });

    it('should return true when window.top.document.querySelector does not throw an error', () => {
      querySelectorStub.returns({});
      expect(connatixCanSelectViewabilityContainer()).to.be.true;
    });

    it('should return false when window.top.document.querySelector throws an error', () => {
      querySelectorStub.throws(new Error('test error'));
      expect(connatixCanSelectViewabilityContainer()).to.be.false;
    });
  });

  describe('_isViewabilityMeasurable', () => {
    let querySelectorStub;

    beforeEach(() => {
      querySelectorStub = sinon.stub(window.top.document, 'querySelector');
    });

    afterEach(() => {
      querySelectorStub.restore();
    });

    it('should return false if the element is null or undefined', () => {
      expect(connatixIsViewabilityMeasurable(null)).to.be.false;
      expect(connatixIsViewabilityMeasurable(undefined)).to.be.false;
    });

    it('should return false if _isIframe returns true', () => {
      querySelectorStub.throws(new Error('test error'));

      const element = document.createElement('div');
      expect(connatixIsViewabilityMeasurable(element)).to.be.false;
    });

    it('should return true if _isIframe returns false', () => {
      querySelectorStub.returns(document.createElement('div'))

      const element = document.createElement('div');
      expect(connatixIsViewabilityMeasurable(element)).to.be.true;
    });
  });

  describe('_getViewability', () => {
    let element;
    let getBoundingClientRectStub;
    let topWinMock;

    beforeEach(() => {
      element = document.createElement('div');
      getBoundingClientRectStub = sinon.stub(element, 'getBoundingClientRect');

      topWinMock = {
        document: {
          visibilityState: 'visible'
        },
        innerWidth: 800,
        innerHeight: 600
      };
    });

    afterEach(() => {
      getBoundingClientRectStub.restore();
    });

    it('should return 0 if the document is not visible', () => {
      topWinMock.document.visibilityState = 'hidden';

      const viewability = connatixGetViewability(element, topWinMock);

      expect(viewability).to.equal(0);
    });

    it('should return 100% if the element is fully in view', () => {
      const boundingBox = { left: 100, top: 100, right: 300, bottom: 300, width: 200, height: 200 };
      getBoundingClientRectStub.returns(boundingBox);

      const viewability = connatixGetViewability(element, topWinMock);

      expect(viewability).to.equal(100);
    });

    it('should return the correct percentage if the element is partially in view', () => {
      const boundingBox = { left: 700, top: 500, right: 900, bottom: 700, width: 200, height: 200 };
      getBoundingClientRectStub.returns(boundingBox);
      const getWinDimensionsStub = sinon.stub(winDimensions, 'getWinDimensions');
      getWinDimensionsStub.returns({ innerWidth: topWinMock.innerWidth, innerHeight: topWinMock.innerHeight});

      const viewability = connatixGetViewability(element, topWinMock);

      expect(viewability).to.equal(25); // 100x100 / 200x200 = 0.25 -> 25%
      getWinDimensionsStub.restore();
    });

    it('should return 0% if the element is not in view', () => {
      const getWinDimensionsStub = sinon.stub(winDimensions, 'getWinDimensions');
      getWinDimensionsStub.returns({ innerWidth: topWinMock.innerWidth, innerHeight: topWinMock.innerHeight});
      const boundingBox = { left: 900, top: 700, right: 1100, bottom: 900, width: 200, height: 200 };
      getBoundingClientRectStub.returns(boundingBox);

      const viewability = connatixGetViewability(element, topWinMock);

      expect(viewability).to.equal(0);
      getWinDimensionsStub.restore();
    });

    it('should use provided width and height if element dimensions are zero', () => {
      const boundingBox = { left: 100, top: 100, right: 100, bottom: 100, width: 0, height: 0 };
      getBoundingClientRectStub.returns(boundingBox);

      const dimensions = { w: 200, h: 200 };
      const viewability = connatixGetViewability(element, topWinMock, dimensions);

      expect(viewability).to.equal(100); // Element fully in view with provided dimensions
    });
  });

  describe('detectViewability', () => {
    let element;
    let getBoundingClientRectStub;
    let topWinMock;
    let querySelectorStub;
    let getElementByIdStub;

    beforeEach(() => {
      element = document.createElement('div');
      getBoundingClientRectStub = sinon.stub(element, 'getBoundingClientRect');

      topWinMock = {
        document: {
          visibilityState: 'visible'
        },
        innerWidth: 800,
        innerHeight: 600
      };

      querySelectorStub = sinon.stub(window.top.document, 'querySelector');
      getElementByIdStub = sinon.stub(document, 'getElementById');
    });

    afterEach(() => {
      getBoundingClientRectStub.restore();
      querySelectorStub.restore();
      getElementByIdStub.restore();
    });

    it('should return 100% viewability when the element is fully within view and has a valid viewabilityContainerIdentifier', () => {
      const bid = {
        params: { viewabilityContainerIdentifier: '#validElement' },
        adUnitCode: 'adUnitCode123',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]]
      };

      getBoundingClientRectStub.returns({
        left: 100,
        top: 100,
        right: 400,
        bottom: 350,
        width: 300,
        height: 250
      });

      querySelectorStub.withArgs('#validElement').returns(element);
      getElementByIdStub.returns(null);

      const result = connatixDetectViewability(bid);

      // Expected calculation: the element is fully in view, so 100% viewability
      expect(result).to.equal(100);
    });

    it('should fall back to using bid sizes and adUnitCode when the viewabilityContainerIdentifier is invalid or was not provided', () => {
      const bid = {
        params: { viewabilityContainerIdentifier: '#invalidElement' },
        adUnitCode: 'adUnitCode123',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]]
      };

      getBoundingClientRectStub.returns({
        left: 200,
        top: 100,
        right: 500,
        bottom: 350,
        width: 300,
        height: 250
      });

      querySelectorStub.withArgs('#invalidElement').returns(null);
      getElementByIdStub.withArgs('adUnitCode123').returns(element);

      const result = connatixDetectViewability(bid);

      expect(result).to.equal(100); // Full viewability
    });

    it('should use the adUnitCode as a fallback when querying an element fails due to a browser error, and return 100% viewability because adUnitCode container is fully in view', () => {
      const bid = {
        params: { viewabilityContainerIdentifier: '#invalidElement' },
        adUnitCode: 'adUnitCode123',
        sizes: [[300, 250]]
      };

      // Simulate an error when querying the element
      querySelectorStub.withArgs('#invalidElement').throws(new Error('Query failed'));

      getBoundingClientRectStub.returns({
        left: 100,
        top: 100,
        right: 400,
        bottom: 350,
        width: 300,
        height: 250
      });

      // The fallback should use the adUnitCode to find the element
      getElementByIdStub.withArgs('adUnitCode123').returns(element);

      const result = connatixDetectViewability(bid);

      expect(result).to.equal(100); // Expect the fallback to work and return 100% viewability
    });

    it('should return null when querying the element by the provided identifier fails and the adUnitCode viewability container is unavailable', () => {
      const bid = {
        params: { viewabilityContainerIdentifier: '#invalidElement' },
        adUnitCode: 'adUnitCode123',
        sizes: [[300, 250]]
      };

      // Simulate an error when querying the element
      querySelectorStub.withArgs('#invalidElement').throws(new Error('Query failed'));

      getBoundingClientRectStub.returns({
        left: 100,
        top: 100,
        right: 400,
        bottom: 350,
        width: 300,
        height: 250
      });

      const result = connatixDetectViewability(bid);

      expect(result).to.equal(null);
    });
  });

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
        bidId: 'dasdas-dsawda-dwaddw-dwdwd',
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
      expect(eventData.bidId).to.equal('dasdas-dsawda-dwaddw-dwdwd');
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
    let setCookieStub, setDataInLocalStorageStub;
    const bidderRequest = {
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
      const mockIdentityProviderData = { mockKey: 'mockValue' };
      const CNX_IDS_EXPIRY = 24 * 30 * 60 * 60 * 1000;
      setCookieStub = sinon.stub(storage, 'setCookie');
      setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
      connatixSaveOnAllStorages('test_ids_cnx', mockIdentityProviderData, CNX_IDS_EXPIRY);

      bid = mockBidRequest();
      serverRequest = spec.buildRequests([bid], bidderRequest);
    })

    this.afterEach(function() {
      setCookieStub.restore();
      setDataInLocalStorageStub.restore();
    });

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
      expect(serverRequest.data.identityProviderData).to.deep.equal({ mockKey: 'mockValue' });
    });
  });

  describe('interpretResponse', function () {
    const CustomerId = '99f20d18-c4b4-4a28-3d8e-d43e2c8cb4ac';
    const PlayerId = 'e4984e88-9ff4-45a3-8b9d-33aabcad634f';
    const Bid = {Cpm: 0.1, RequestId: '2f897340c4eaa3', Ttl: 86400, CustomerId, PlayerId, Lurl: 'test-lurl'};

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
      expect(bidResponse.lurl).to.equal('test-lurl');
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
    const UserSyncEndpointWithParams = 'https://connatix.com/sync?param1=value1'
    const Bid = {Cpm: 0.1, RequestId: '2f897340c4eaa3', Ttl: 86400, CustomerId, PlayerId};

    const serverResponse = {
      body: {
        UserSyncEndpoint,
        Bids: [ Bid ]
      },
      headers: function() { }
    };
    const serverResponse2 = {
      body: {
        UserSyncEndpoint: UserSyncEndpointWithParams,
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
    it('Should correctly append all consents to the sync url if the url contains query params', function () {
      const userSyncList = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [serverResponse2],
        {gdprApplies: true, consentString: 'test&2'},
        '1YYYN',
        {consent: '1'}
      );
      const { url } = userSyncList[0];
      expect(url).to.equal(`${UserSyncEndpointWithParams}&gdpr=1&gdpr_consent=test%262&us_privacy=1YYYN`);
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
      const serverRequest = spec.buildRequests(validBidRequests, {});
      expect(serverRequest.data.userIdList).to.deep.equal(validBidRequests[0].userIdAsEids);
    });
  });

  describe('isConnatix', function () {
    let aliasRegistryStub;

    beforeEach(() => {
      aliasRegistryStub = sinon.stub(adapterManager, 'aliasRegistry').value({});
    });

    afterEach(() => {
      aliasRegistryStub.restore();
    });

    it('should return false if aliasName is undefined or null', () => {
      expect(spec.isConnatix(undefined)).to.be.false;
      expect(spec.isConnatix(null)).to.be.false;
    });

    it('should return true if aliasName matches BIDDER_CODE', () => {
      const aliasName = BIDDER_CODE;
      expect(spec.isConnatix(aliasName)).to.be.true;
    });

    it('should return true if aliasName is mapped to BIDDER_CODE in aliasRegistry', () => {
      const aliasName = 'connatixAlias';
      aliasRegistryStub.value({ 'connatixAlias': BIDDER_CODE });
      expect(spec.isConnatix(aliasName)).to.be.true;
    });

    it('should return false if aliasName does not match BIDDER_CODE', () => {
      const aliasName = 'otherBidder';
      expect(spec.isConnatix(aliasName)).to.be.false;
    });

    it('should return false if aliasName is mapped to a different bidder in aliasRegistry', () => {
      const aliasName = 'someOtherAlias';
      aliasRegistryStub.value({ 'someOtherAlias': 'otherBidder' });
      expect(spec.isConnatix(aliasName)).to.be.false;
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
  describe('getUserSyncs with message event listener', function() {
    const CNX_IDS_EXPIRY = 24 * 30 * 60 * 60 * 1000;
    const CNX_IDS_LOCAL_STORAGE_COOKIES_KEY = 'cnx_user_ids';
    const ALL_PROVIDERS_RESOLVED_EVENT = 'cnx_all_identity_providers_resolved';

    const mockData = {
      data: {
        supplementalEids: [{ provider: 2, group: 1, eidsList: ['123', '456'] }]
      }
    };

    function messageHandler(event) {
      if (!event.data || event.origin !== 'https://cds.connatix.com' || !event.data.cnx) {
        return;
      }

      const { message, data } = event.data.cnx;

      if (message === ALL_PROVIDERS_RESOLVED_EVENT) {
        window.removeEventListener('message', messageHandler);
        event.stopImmediatePropagation();
      }

      if (message === ALL_PROVIDERS_RESOLVED_EVENT || message === IDENTITY_PROVIDER_COLLECTION_UPDATED_EVENT) {
        if (data) {
          connatixSaveOnAllStorages(CNX_IDS_LOCAL_STORAGE_COOKIES_KEY, data, CNX_IDS_EXPIRY);
        }
      }
    }

    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(storage, 'setCookie');
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(window, 'removeEventListener');
      sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getCookie');
      sandbox.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('Should set a cookie and save to local storage when a valid message is received', () => {
      const fakeEvent = {
        data: { cnx: { message: 'cnx_all_identity_providers_resolved', data: mockData } },
        origin: 'https://cds.connatix.com',
        stopImmediatePropagation: sinon.spy()
      };

      messageHandler(fakeEvent);

      expect(fakeEvent.stopImmediatePropagation.calledOnce).to.be.true;
      expect(window.removeEventListener.calledWith('message', messageHandler)).to.be.true;
      expect(storage.setCookie.calledWith(CNX_IDS_LOCAL_STORAGE_COOKIES_KEY, JSON.stringify(mockData), sinon.match.string)).to.be.true;
      expect(storage.setDataInLocalStorage.calledWith(CNX_IDS_LOCAL_STORAGE_COOKIES_KEY, JSON.stringify(mockData))).to.be.true;

      storage.getCookie.returns(JSON.stringify(mockData));
      storage.getDataFromLocalStorage.returns(JSON.stringify(mockData));

      const retrievedData = connatixReadFromAllStorages(CNX_IDS_LOCAL_STORAGE_COOKIES_KEY);
      expect(retrievedData).to.deep.equal(mockData);
    });

    it('Should not do anything when there is no data in the payload', () => {
      const fakeEvent = {
        data: null,
        origin: 'https://cds.connatix.com',
        stopImmediatePropagation: sinon.spy()
      };

      messageHandler(fakeEvent);

      expect(fakeEvent.stopImmediatePropagation.notCalled).to.be.true;
      expect(window.removeEventListener.notCalled).to.be.true;
      expect(storage.setCookie.notCalled).to.be.true;
      expect(storage.setDataInLocalStorage.notCalled).to.be.true;
    });

    it('Should not do anything when the origin is invalid', () => {
      const fakeEvent = {
        data: { cnx: { message: 'cnx_all_identity_providers_resolved', data: mockData } },
        origin: 'https://notConnatix.com',
        stopImmediatePropagation: sinon.spy()
      };

      messageHandler(fakeEvent);

      expect(fakeEvent.stopImmediatePropagation.notCalled).to.be.true;
      expect(window.removeEventListener.notCalled).to.be.true;
      expect(storage.setCookie.notCalled).to.be.true;
      expect(storage.setDataInLocalStorage.notCalled).to.be.true;
    });
  });
  describe('connatixHasQueryParams', () => {
    it('Should return false if there is no query param in the url', () => {
      const url = 'http://example.com'
      const result = connatixHasQueryParams(url);
      expect(result).to.equal(false);
    });

    it('Should return true if there is one query param in the url', () => {
      const url = 'http://example.com?query1=value1'
      const result = connatixHasQueryParams(url);
      expect(result).to.equal(true);
    });

    it('Should return true if there is multiple query params in the url', () => {
      const url = 'http://example.com?query1=value1&query2=value2'
      const result = connatixHasQueryParams(url);
      expect(result).to.equal(true);
    });

    it('Should return false if the url is invalid', () => {
      const url = 'example'
      const result = connatixHasQueryParams(url);
      expect(result).to.equal(false);
    });
  });
});
