import { expect } from 'chai';
import { spec } from 'modules/adtargetBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';

const DISPLAY_REQUEST = {
  'bidder': 'adtarget',
  'params': {
    'aid': 12345
  },
  'schain': { ver: 1 },
  'userId': { criteo: 2 },
  'mediaTypes': { 'banner': { 'sizes': [300, 250] } },
  'bidderRequestId': '7101db09af0db2',
  'auctionId': '2e41f65424c87c',
  'adUnitCode': 'adunit-code',
  'bidId': '84ab500420319d',
};

const VIDEO_REQUEST = {
  'bidder': 'adtarget',
  'mediaTypes': {
    'video': {
      'playerSize': [[480, 360], [640, 480]]
    }
  },
  'params': {
    'aid': 12345
  },
  'bidderRequestId': '7101db09af0db2',
  'auctionId': '2e41f65424c87c',
  'adUnitCode': 'adunit-code',
  'bidId': '84ab500420319d'
};

const SERVER_VIDEO_RESPONSE = {
  'source': { 'aid': 12345, 'pubId': 54321 },
  'bids': [{
    'vastUrl': 'https://rtb.adtarget.com/vast/?adid=44F2AEB9BFC881B3',
    'requestId': '2e41f65424c87c',
    'url': '44F2AEB9BFC881B3',
    'creative_id': 342516,
    'durationSeconds': 30,
    'cmpId': 342516,
    'height': 480,
    'cur': 'USD',
    'width': 640,
    'cpm': 0.9
  }]
};
const SERVER_DISPLAY_RESPONSE = {
  'source': { 'aid': 12345, 'pubId': 54321 },
  'bids': [{
    'ad': '<!-- Creative -->',
    'requestId': '2e41f65424c87c',
    'creative_id': 342516,
    'cmpId': 342516,
    'height': 250,
    'cur': 'USD',
    'width': 300,
    'cpm': 0.9
  }],
  'cookieURLs': ['link1', 'link2']
};
const SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS = {
  'source': { 'aid': 12345, 'pubId': 54321 },
  'bids': [{
    'ad': '<!-- Creative -->',
    'requestId': '2e41f65424c87c',
    'creative_id': 342516,
    'cmpId': 342516,
    'height': 250,
    'cur': 'USD',
    'width': 300,
    'cpm': 0.9
  }],
  'cookieURLs': ['link3', 'link4'],
  'cookieURLSTypes': ['image', 'iframe']
};
const videoBidderRequest = {
  bidderCode: 'bidderCode',
  bids: [{ mediaTypes: { video: {} }, bidId: '2e41f65424c87c' }]
};

const displayBidderRequest = {
  bidderCode: 'bidderCode',
  bids: [{ bidId: '2e41f65424c87c' }]
};

const displayBidderRequestWithConsents = {
  bidderCode: 'bidderCode',
  bids: [{ bidId: '2e41f65424c87c' }],
  gdprConsent: {
    gdprApplies: true,
    consentString: 'test'
  },
  uspConsent: 'iHaveIt'
};

const videoEqResponse = [{
  vastUrl: 'https://rtb.adtarget.com/vast/?adid=44F2AEB9BFC881B3',
  requestId: '2e41f65424c87c',
  creativeId: 342516,
  mediaType: 'video',
  netRevenue: true,
  currency: 'USD',
  height: 480,
  width: 640,
  ttl: 300,
  cpm: 0.9
}];

const displayEqResponse = [{
  requestId: '2e41f65424c87c',
  creativeId: 342516,
  mediaType: 'banner',
  netRevenue: true,
  currency: 'USD',
  ad: '<!-- Creative -->',
  height: 250,
  width: 300,
  ttl: 300,
  cpm: 0.9
}];

describe('adtargetBidAdapter', () => {
  const adapter = newBidder(spec);
  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('user syncs', () => {
    describe('as image', () => {
      it('should be returned if pixel enabled', () => {
        const syncs = spec.getUserSyncs({ pixelEnabled: true }, [{ body: SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS }]);

        expect(syncs.map(s => s.url)).to.deep.equal([SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS.cookieURLs[0]]);
        expect(syncs.map(s => s.type)).to.deep.equal(['image']);
      })
    })

    describe('as iframe', () => {
      it('should be returned if iframe enabled', () => {
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, [{ body: SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS }]);

        expect(syncs.map(s => s.url)).to.deep.equal([SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS.cookieURLs[1]]);
        expect(syncs.map(s => s.type)).to.deep.equal(['iframe']);
      })
    })

    describe('user sync', () => {
      it('should not  be returned if passed syncs where already used', () => {
        const syncs = spec.getUserSyncs({
          iframeEnabled: true,
          pixelEnabled: true
        }, [{ body: SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS }]);

        expect(syncs).to.deep.equal([]);
      })

      it('should not be returned if pixel not set', () => {
        const syncs = spec.getUserSyncs({}, [{ body: SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS }]);

        expect(syncs).to.be.empty;
      });
    });
    describe('user syncs with both types', () => {
      it('should be returned if pixel and iframe enabled', () => {
        const mockedServerResponse = Object.assign({}, SERVER_DISPLAY_RESPONSE_WITH_MIXED_SYNCS, { 'cookieURLs': ['link5', 'link6'] });
        const syncs = spec.getUserSyncs({
          iframeEnabled: true,
          pixelEnabled: true
        }, [{ body: mockedServerResponse }]);

        expect(syncs.map(s => s.url)).to.deep.equal(mockedServerResponse.cookieURLs);
        expect(syncs.map(s => s.type)).to.deep.equal(mockedServerResponse.cookieURLSTypes);
      });
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(VIDEO_REQUEST)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, VIDEO_REQUEST);
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let videoBidRequests = [VIDEO_REQUEST];
    let displayBidRequests = [DISPLAY_REQUEST];
    let videoAndDisplayBidRequests = [DISPLAY_REQUEST, VIDEO_REQUEST];
    const displayRequest = spec.buildRequests(displayBidRequests, {});
    const videoRequest = spec.buildRequests(videoBidRequests, {});
    const videoAndDisplayRequests = spec.buildRequests(videoAndDisplayBidRequests, {});

    it('building requests as arrays', () => {
      expect(videoRequest).to.be.a('array');
      expect(displayRequest).to.be.a('array');
      expect(videoAndDisplayRequests).to.be.a('array');
    })

    it('sending as POST', () => {
      const postActionMethod = 'POST'
      const comparator = br => br.method === postActionMethod;
      expect(videoRequest.every(comparator)).to.be.true;
      expect(displayRequest.every(comparator)).to.be.true;
      expect(videoAndDisplayRequests.every(comparator)).to.be.true;
    });

    it('sends correct video bid parameters', () => {
      const data = videoRequest[0].data;

      const eq = {
        CallbackId: '84ab500420319d',
        AdType: 'video',
        Aid: 12345,
        Sizes: '480x360,640x480'
      };
      expect(data.BidRequests[0]).to.deep.equal(eq);
    });

    it('sends correct display bid parameters', () => {
      const data = displayRequest[0].data;

      const eq = {
        CallbackId: '84ab500420319d',
        AdType: 'display',
        Aid: 12345,
        Sizes: '300x250'
      };

      expect(data.BidRequests[0]).to.deep.equal(eq);
    });

    it('sends correct video and display bid parameters', () => {
      const bidRequests = videoAndDisplayRequests[0].data;
      const expectedBidReqs = [{
        CallbackId: '84ab500420319d',
        AdType: 'display',
        Aid: 12345,
        Sizes: '300x250'
      }, {
        CallbackId: '84ab500420319d',
        AdType: 'video',
        Aid: 12345,
        Sizes: '480x360,640x480'
      }]

      expect(bidRequests.BidRequests).to.deep.equal(expectedBidReqs);
    });

    describe('publisher environment', () => {
      const sandbox = sinon.sandbox.create();
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        const config = {
          'coppa': true
        };
        return config[key];
      });
      const bidRequestWithPubSettingsData = spec.buildRequests([DISPLAY_REQUEST], displayBidderRequestWithConsents)[0].data;
      sandbox.restore();
      it('sets GDPR', () => {
        expect(bidRequestWithPubSettingsData.GDPR).to.be.equal(1);
        expect(bidRequestWithPubSettingsData.GDPRConsent).to.be.equal(displayBidderRequestWithConsents.gdprConsent.consentString);
      });
      it('sets USP', () => {
        expect(bidRequestWithPubSettingsData.USP).to.be.equal(displayBidderRequestWithConsents.uspConsent);
      })
      it('sets Coppa', () => {
        expect(bidRequestWithPubSettingsData.Coppa).to.be.equal(1);
      })
      it('sets Schain', () => {
        expect(bidRequestWithPubSettingsData.Schain).to.be.deep.equal(DISPLAY_REQUEST.schain);
      })
      it('sets UserId\'s', () => {
        expect(bidRequestWithPubSettingsData.UserIds).to.be.deep.equal(DISPLAY_REQUEST.userId);
      })
    })
  });

  describe('interpretResponse', () => {
    let serverResponse;
    let adapterRequest;
    let eqResponse;

    afterEach(() => {
      serverResponse = null;
      adapterRequest = null;
      eqResponse = null;
    });

    it('should get correct video bid response', () => {
      serverResponse = SERVER_VIDEO_RESPONSE;
      adapterRequest = videoBidderRequest;
      eqResponse = videoEqResponse;

      bidServerResponseCheck();
    });

    it('should get correct display bid response', () => {
      serverResponse = SERVER_DISPLAY_RESPONSE;
      adapterRequest = displayBidderRequest;
      eqResponse = displayEqResponse;

      bidServerResponseCheck();
    });

    function bidServerResponseCheck() {
      const result = spec.interpretResponse({ body: serverResponse }, { adapterRequest });

      expect(result).to.deep.equal(eqResponse);
    }

    function nobidServerResponseCheck() {
      const noBidServerResponse = { bids: [] };
      const noBidResult = spec.interpretResponse({ body: noBidServerResponse }, { adapterRequest });

      expect(noBidResult.length).to.equal(0);
    }

    it('handles video nobid responses', () => {
      adapterRequest = videoBidderRequest;
      nobidServerResponseCheck();
    });

    it('handles display nobid responses', () => {
      adapterRequest = displayBidderRequest;
      nobidServerResponseCheck();
    });
  });
});
