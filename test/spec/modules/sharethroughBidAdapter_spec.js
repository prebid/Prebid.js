import { expect } from 'chai';
import { sharethroughAdapterSpec, sharethroughInternal } from 'modules/sharethroughBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from '../../../src/utils.js';
import { config } from 'src/config';

const spec = newBidder(sharethroughAdapterSpec).getSpec();
const bidRequests = [
  {
    bidder: 'sharethrough',
    bidId: 'bidId1',
    sizes: [[600, 300]],
    placementCode: 'foo',
    params: {
      pkey: 'aaaa1111'
    },
    userId: {
      tdid: 'fake-tdid',
      pubcid: 'fake-pubcid',
      idl_env: 'fake-identity-link',
      id5id: {
        uid: 'fake-id5id',
        ext: {
          linkType: 2
        }
      },
      sharedid: {
        id: 'fake-sharedid',
        third: 'fake-sharedthird'
      },
      lipb: {
        lipbid: 'fake-lipbid'
      }
    },
    crumbs: {
      pubcid: 'fake-pubcid-in-crumbs-obj'
    }
  },
  {
    bidder: 'sharethrough',
    bidId: 'bidId2',
    sizes: [[700, 400]],
    placementCode: 'bar',
    params: {
      pkey: 'bbbb2222',
      iframe: true
    }
  },
  {
    bidder: 'sharethrough',
    bidId: 'bidId3',
    sizes: [[700, 400]],
    placementCode: 'coconut',
    params: {
      pkey: 'cccc3333',
      iframe: true,
      iframeSize: [500, 500]
    }
  },
  {
    bidder: 'sharethrough',
    bidId: 'bidId4',
    sizes: [[700, 400]],
    placementCode: 'bar',
    params: {
      pkey: 'dddd4444',
      badv: ['domain1.com', 'domain2.com']
    }
  },
  {
    bidder: 'sharethrough',
    bidId: 'bidId5',
    sizes: [[700, 400]],
    placementCode: 'bar',
    params: {
      pkey: 'eeee5555',
      bcat: ['IAB1-1', 'IAB1-2']
    }
  },
];

const prebidRequests = [
  {
    method: 'POST',
    url: 'https://btlr.sharethrough.com/WYu2BXv1/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      skipIframeBusting: false,
      sizes: []
    }
  },
  {
    method: 'POST',
    url: 'https://btlr.sharethrough.com/WYu2BXv1/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      skipIframeBusting: true,
      sizes: [[300, 250], [300, 300], [250, 250], [600, 50]]
    }
  },
  {
    method: 'POST',
    url: 'https://btlr.sharethrough.com/WYu2BXv1/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      skipIframeBusting: true,
      iframeSize: [500, 500],
      sizes: [[300, 250], [300, 300], [250, 250], [600, 50]]
    }
  },
  {
    method: 'POST',
    url: 'https://btlr.sharethrough.com/WYu2BXv1/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      skipIframeBusting: false,
      sizes: [[0, 0]]
    }
  },
  {
    method: 'POST',
    url: 'https://btlr.sharethrough.com/WYu2BXv1/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      skipIframeBusting: false,
      sizes: [[300, 250], [300, 300], [250, 250], [600, 50]]
    }
  }
];

const bidderResponse = {
  body: {
    'adserverRequestId': '40b6afd5-6134-4fbb-850a-bb8972a46994',
    'bidId': 'bidId1',
    'version': 1,
    'creatives': [{
      'auctionWinId': 'b2882d5e-bf8b-44da-a91c-0c11287b8051',
      'cpm': 12.34,
      'creative': {
        'deal_id': 'aDealId',
        'creative_key': 'aCreativeId',
        'title': '✓ à la mode'
      }
    }],
    'stxUserId': ''
  },
  header: { get: (header) => header }
};

const setUserAgent = (uaString) => {
  window.navigator['__defineGetter__']('userAgent', function() {
    return uaString;
  });
};

describe('sharethrough internal spec', function() {
  let windowStub, windowTopStub;
  let stubbedReturn = [{
    appendChild: () => undefined
  }]
  beforeEach(function() {
    windowStub = sinon.stub(window.document, 'getElementsByTagName');
    windowTopStub = sinon.stub(window.top.document, 'getElementsByTagName');
    windowStub.withArgs('body').returns(stubbedReturn);
    windowTopStub.withArgs('body').returns(stubbedReturn);
  });

  afterEach(function() {
    windowStub.restore();
    windowTopStub.restore();
    window.STR = undefined;
    window.top.STR = undefined;
  });

  describe('we cannot access top level document', function() {
    beforeEach(function() {
      window.lockedInFrame = true;
    });

    afterEach(function() {
      window.lockedInFrame = false;
    });

    it('appends sfp.js to the safeframe', function() {
      sharethroughInternal.handleIframe();
      expect(windowStub.calledOnce).to.be.true;
    });

    it('does not append anything if sfp.js is already loaded in the safeframe', function() {
      window.STR = { Tag: true };
      sharethroughInternal.handleIframe();
      expect(windowStub.notCalled).to.be.true;
      expect(windowTopStub.notCalled).to.be.true;
    });
  });

  describe('we are able to bust out of the iframe', function() {
    it('appends sfp.js to window.top', function() {
      sharethroughInternal.handleIframe();
      expect(windowStub.calledOnce).to.be.true;
      expect(windowTopStub.calledOnce).to.be.true;
    });

    it('only appends sfp-set-targeting.js if sfp.js is already loaded on the page', function() {
      window.top.STR = { Tag: true };
      sharethroughInternal.handleIframe();
      expect(windowStub.calledOnce).to.be.true;
      expect(windowTopStub.notCalled).to.be.true;
    });
  });
});

describe('sharethrough adapter spec', function() {
  describe('.code', function() {
    it('should return a bidder code of sharethrough', function() {
      expect(spec.code).to.eql('sharethrough');
    });
  });

  describe('.isBidRequestValid', function() {
    it('should return false if req has no pkey', function() {
      const invalidBidRequest = {
        bidder: 'sharethrough',
        params: {
          notPKey: 'abc123'
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return false if req has wrong bidder code', function() {
      const invalidBidRequest = {
        bidder: 'notSharethrough',
        params: {
          notPKey: 'abc123'
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return true if req is correct', function() {
      expect(spec.isBidRequestValid(bidRequests[0])).to.eq(true);
      expect(spec.isBidRequestValid(bidRequests[1])).to.eq(true);
    });
  });

  describe('.buildRequests', function() {
    it('should return an array of requests', function() {
      const builtBidRequests = spec.buildRequests(bidRequests);

      expect(builtBidRequests[0].url).to.eq('https://btlr.sharethrough.com/WYu2BXv1/v1');
      expect(builtBidRequests[1].url).to.eq('https://btlr.sharethrough.com/WYu2BXv1/v1');
      expect(builtBidRequests[0].method).to.eq('POST');
    });

    it('should set the instant_play_capable parameter correctly based on browser userAgent string', function() {
      setUserAgent('Android Chrome/60');
      let builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0].data.instant_play_capable).to.be.true;

      setUserAgent('iPhone Version/11');
      builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0].data.instant_play_capable).to.be.true;

      setUserAgent('iPhone CriOS/60');
      builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0].data.instant_play_capable).to.be.true;

      setUserAgent('Android Chrome/50');
      builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0].data.instant_play_capable).to.be.false;

      setUserAgent('Android Chrome');
      builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0].data.instant_play_capable).to.be.false;

      setUserAgent(undefined);
      builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0].data.instant_play_capable).to.be.false;
    });

    it('should set the secure parameter to false when the protocol is http', function() {
      const stub = sinon.stub(sharethroughInternal, 'getProtocol').returns('http:');
      const bidRequest = spec.buildRequests(bidRequests, null)[0];
      expect(bidRequest.data.secure).to.be.false;
      stub.restore();
    });

    it('should set the secure parameter to true when the protocol is https', function() {
      const stub = sinon.stub(sharethroughInternal, 'getProtocol').returns('https:');
      const bidRequest = spec.buildRequests(bidRequests, null)[0];
      expect(bidRequest.data.secure).to.be.true;
      stub.restore();
    });

    it('should set the secure parameter to true when the protocol is neither http or https', function() {
      const stub = sinon.stub(sharethroughInternal, 'getProtocol').returns('about:');
      const bidRequest = spec.buildRequests(bidRequests, null)[0];
      expect(bidRequest.data.secure).to.be.true;
      stub.restore();
    });

    it('should add ccpa parameter if uspConsent is present', function() {
      const uspConsent = '1YNN';
      const bidderRequest = { uspConsent: uspConsent };
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(bidRequest.data.us_privacy).to.eq(uspConsent);
    });

    it('should add consent parameters if gdprConsent is present', function() {
      const gdprConsent = { consentString: 'consent_string123', gdprApplies: true };
      const bidderRequest = { gdprConsent: gdprConsent };
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(bidRequest.data.consent_required).to.eq(true);
      expect(bidRequest.data.consent_string).to.eq('consent_string123');
    });

    it('should handle gdprConsent is present but values are undefined case', function() {
      const gdprConsent = { consent_string: undefined, gdprApplies: undefined };
      const bidderRequest = { gdprConsent: gdprConsent };
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(bidRequest.data).to.not.include.any.keys('consent_string');
    });

    it('should add the ttduid parameter if a bid request contains a value for Unified ID from The Trade Desk', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data.ttduid).to.eq('fake-tdid');
    });

    it('should add the pubcid parameter if a bid request contains a value for the Publisher Common ID Module in the' +
      ' userId object of the bidrequest', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data.pubcid).to.eq('fake-pubcid');
    });

    it('should add the pubcid parameter if a bid request contains a value for the Publisher Common ID Module in the' +
      ' crumbs object of the bidrequest', function() {
      const bidData = utils.deepClone(bidRequests);
      delete bidData[0].userId.pubcid;

      const bidRequest = spec.buildRequests(bidData)[0];
      expect(bidRequest.data.pubcid).to.eq('fake-pubcid-in-crumbs-obj');
    });

    it('should add the pubcid parameter if a bid request contains a value for the Publisher Common ID Module in the' +
      ' crumbs object of the bidrequest', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      delete bidRequest.userId;
      expect(bidRequest.data.pubcid).to.eq('fake-pubcid');
    });

    it('should add the idluid parameter if a bid request contains a value for Identity Link from Live Ramp', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data.idluid).to.eq('fake-identity-link');
    });

    it('should add the id5uid parameter if a bid request contains a value for ID5', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data.id5uid.id).to.eq('fake-id5id');
      expect(bidRequest.data.id5uid.linkType).to.eq(2);
    });

    it('should add the shduid parameter if a bid request contains a value for Shared ID', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data.shduid.id).to.eq('fake-sharedid');
      expect(bidRequest.data.shduid.third).to.eq('fake-sharedthird');
    });

    it('should add the liuid parameter if a bid request contains a value for LiveIntent ID', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data.liuid).to.eq('fake-lipbid');
    });

    it('should add Sharethrough specific parameters', function() {
      const builtBidRequests = spec.buildRequests(bidRequests);
      expect(builtBidRequests[0]).to.deep.include({
        strData: {
          skipIframeBusting: undefined,
          iframeSize: undefined,
          sizes: [[600, 300]]
        }
      });
    });

    it('should add a supply chain parameter if schain is present', function() {
      // shallow copy of the first bidRequest obj, so we don't mutate
      const bidRequest = Object.assign({}, bidRequests[0]);
      bidRequest['schain'] = {
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

      const builtBidRequest = spec.buildRequests([bidRequest])[0];
      expect(builtBidRequest.data.schain).to.eq(JSON.stringify(bidRequest.schain));
    });

    it('should add badv if provided', () => {
      const builtBidRequest = spec.buildRequests([bidRequests[3]])[0];

      expect(builtBidRequest.data.badv).to.have.members(['domain1.com', 'domain2.com'])
    });

    it('should add bcat if provided', () => {
      const builtBidRequest = spec.buildRequests([bidRequests[4]])[0];

      expect(builtBidRequest.data.bcat).to.have.members(['IAB1-1', 'IAB1-2'])
    });

    it('should not add a supply chain parameter if schain is missing', function() {
      const bidRequest = spec.buildRequests(bidRequests)[0];
      expect(bidRequest.data).to.not.include.any.keys('schain');
    });

    it('should include the bidfloor parameter if it is present in the bid request', function() {
      const bidRequest = Object.assign({}, bidRequests[0]);
      bidRequest['bidfloor'] = 0.50;
      const builtBidRequest = spec.buildRequests([bidRequest])[0];
      expect(builtBidRequest.data.bidfloor).to.eq(0.5);
    });

    it('should not include the bidfloor parameter if it is missing in the bid request', function() {
      const bidRequest = Object.assign({}, bidRequests[0]);
      const builtBidRequest = spec.buildRequests([bidRequest])[0];
      expect(builtBidRequest.data).to.not.include.any.keys('bidfloor');
    });

    describe('coppa', function() {
      it('should add coppa to request if enabled', function() {
        config.setConfig({coppa: true});
        const bidRequest = Object.assign({}, bidRequests[0]);
        const builtBidRequest = spec.buildRequests([bidRequest])[0];
        expect(builtBidRequest.data.coppa).to.eq(true);
      });

      it('should not add coppa to request if disabled', function() {
        config.setConfig({coppa: false});
        const bidRequest = Object.assign({}, bidRequests[0]);
        const builtBidRequest = spec.buildRequests([bidRequest])[0];
        expect(builtBidRequest.data.coppa).to.be.undefined;
      });

      it('should not add coppa to request if unknown value', function() {
        config.setConfig({coppa: 'something'});
        const bidRequest = Object.assign({}, bidRequests[0]);
        const builtBidRequest = spec.buildRequests([bidRequest])[0];
        expect(builtBidRequest.data.coppa).to.be.undefined;
      });
    });
  });

  describe('.interpretResponse', function() {
    it('returns a correctly parsed out response', function() {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[0])[0]).to.include(
        {
          width: 1,
          height: 1,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360
        });
    });

    it('returns a correctly parsed out response with largest size when strData.skipIframeBusting is true', function() {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[1])[0]).to.include(
        {
          width: 300,
          height: 300,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360
        });
    });

    it('returns a correctly parsed out response with explicitly defined size when strData.skipIframeBusting is true and strData.iframeSize is provided', function() {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[2])[0]).to.include(
        {
          width: 500,
          height: 500,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360
        });
    });

    it('returns a correctly parsed out response with explicitly defined size when strData.skipIframeBusting is false and strData.sizes contains [0, 0] only', function() {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[3])[0]).to.include(
        {
          width: 0,
          height: 0,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360
        });
    });

    it('returns a correctly parsed out response with explicitly defined size when strData.skipIframeBusting is false and strData.sizes contains multiple sizes', function() {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[4])[0]).to.include(
        {
          width: 300,
          height: 300,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360
        });
    });

    it('returns a blank array if there are no creatives', function() {
      const bidResponse = { body: { creatives: [] } };
      expect(spec.interpretResponse(bidResponse, prebidRequests[0])).to.be.an('array').that.is.empty;
    });

    it('returns a blank array if body object is empty', function() {
      const bidResponse = { body: {} };
      expect(spec.interpretResponse(bidResponse, prebidRequests[0])).to.be.an('array').that.is.empty;
    });

    it('returns a blank array if body is null', function() {
      const bidResponse = { body: null };
      expect(spec.interpretResponse(bidResponse, prebidRequests[0])).to.be.an('array').that.is.empty;
    });

    it('correctly generates ad markup when skipIframeBusting is false', function() {
      const adMarkup = spec.interpretResponse(bidderResponse, prebidRequests[0])[0].ad;
      let resp = null;

      expect(() => btoa(JSON.stringify(bidderResponse))).to.throw();
      expect(() => resp = sharethroughInternal.b64EncodeUnicode(JSON.stringify(bidderResponse))).not.to.throw();
      expect(adMarkup).to.match(
        /data-str-native-key="pKey" data-stx-response-name="str_response_bidId"/);
      expect(!!adMarkup.indexOf(resp)).to.eql(true);

      // insert functionality to autodetect whether or not in safeframe, and handle JS insertion
      expect(adMarkup).to.match(/isLockedInFrame/);
      expect(adMarkup).to.match(/handleIframe/);
    });

    it('correctly generates ad markup when skipIframeBusting is true', function() {
      const adMarkup = spec.interpretResponse(bidderResponse, prebidRequests[1])[0].ad;
      let resp = null;

      expect(() => btoa(JSON.stringify(bidderResponse))).to.throw();
      expect(() => resp = sharethroughInternal.b64EncodeUnicode(JSON.stringify(bidderResponse))).not.to.throw();
      expect(adMarkup).to.match(
        /data-str-native-key="pKey" data-stx-response-name="str_response_bidId"/);
      expect(!!adMarkup.indexOf(resp)).to.eql(true);
      expect(adMarkup).to.match(
        /<script src="https:\/\/native.sharethrough.com\/assets\/sfp.js"><\/script>/);
    });
  });

  describe('.getUserSyncs', function() {
    const cookieSyncs = ['cookieUrl1', 'cookieUrl2', 'cookieUrl3'];
    const serverResponses = [{ body: { cookieSyncUrls: cookieSyncs } }];

    it('returns an array of correctly formatted user syncs', function() {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, null, 'fake-privacy-signal');
      expect(syncArray).to.deep.equal([
        { type: 'image', url: 'cookieUrl1&us_privacy=fake-privacy-signal' },
        { type: 'image', url: 'cookieUrl2&us_privacy=fake-privacy-signal' },
        { type: 'image', url: 'cookieUrl3&us_privacy=fake-privacy-signal' }]
      );
    });

    it('returns an empty array if serverResponses is empty', function() {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, []);
      expect(syncArray).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if the body is null', function() {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: null }]);
      expect(syncArray).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if the body.cookieSyncUrls is missing', function() {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: { creatives: ['creative'] } }]);
      expect(syncArray).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if pixels are not enabled', function() {
      const syncArray = spec.getUserSyncs({ pixelEnabled: false }, serverResponses);
      expect(syncArray).to.be.an('array').that.is.empty;
    });
  });
});
