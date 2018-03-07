import {expect} from 'chai';
import {spec} from 'modules/medianetBidAdapter';

let VALID_BID_REQUEST = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d'
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d'
  }],
  VALID_BID_REQUEST_INVALID_BIDFLOOR = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'bidfloor': 'abcdef',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d'
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d'
  }],
  VALID_PAYLOAD = {
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest'
    },
    'ext': {
      'customer_id': 'customer_id'
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-0'
      },
      'banner': [{
        'w': 300,
        'h': 250
      }]
    }, {
      'id': '3f97ca71b1e5c2',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-123'
      },
      'banner': [{
        'w': 300,
        'h': 251
      }]
    }]
  },
  VALID_PARAMS = {
    bidder: 'medianet',
    params: {
      cid: '8CUV090'
    }
  },
  PARAMS_WITHOUT_CID = {
    bidder: 'medianet',
    params: {}
  },
  PARAMS_WITH_INTEGER_CID = {
    bidder: 'medianet',
    params: {
      cid: 8867587
    }
  },
  PARAMS_WITH_EMPTY_CID = {
    bidder: 'medianet',
    params: {
      cid: ''
    }
  },
  SYNC_OPTIONS_BOTH_ENABLED = {
    iframeEnabled: true,
    pixelEnabled: true,
  },
  SYNC_OPTIONS_PIXEL_ENABLED = {
    iframeEnabled: false,
    pixelEnabled: true,
  },
  SYNC_OPTIONS_IFRAME_ENABLED = {
    iframeEnabled: true,
    pixelEnabled: false,
  },
  SERVER_CSYNC_RESPONSE = [{
    body: {
      ext: {
        csUrl: [{
          type: 'iframe',
          url: 'iframe-url'
        }, {
          type: 'image',
          url: 'pixel-url'
        }]
      }
    }
  }],
  ENABLED_SYNC_IFRAME = [{
    type: 'iframe',
    url: 'iframe-url'
  }],
  ENABLED_SYNC_PIXEL = [{
    type: 'image',
    url: 'pixel-url'
  }],
  SERVER_RESPONSE_CPM_MISSING = {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': false,
      'requestId': '27210feac00e96',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': '375068987',
      'netRevenue': true
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  },
  SERVER_RESPONSE_CPM_ZERO = {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': false,
      'requestId': '27210feac00e96',
      'ad': 'ad',
      'width': 300,
      'height': 250,
      'creativeId': '375068987',
      'netRevenue': true,
      'cpm': 0.0
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  },
  SERVER_RESPONSE_NOBID = {
    'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
    'bidList': [{
      'no_bid': true,
      'requestId': '3a62cf7a853f84',
      'width': 0,
      'height': 0,
      'ttl': 0,
      'netRevenue': false
    }],
    'ext': {
      'csUrl': [{
        'type': 'image',
        'url': 'http://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  },
  BID_REQUEST_SIZE_AS_1DARRAY = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [300, 250],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d'
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [300, 251],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d'
  }];

describe('Media.net bid adapter', () => {
  describe('isBidRequestValid', () => {
    it('should accept valid bid params', () => {
      let isValid = spec.isBidRequestValid(VALID_PARAMS);
      expect(isValid).to.equal(true);
    });

    it('should reject bid if cid is not present', () => {
      let isValid = spec.isBidRequestValid(PARAMS_WITHOUT_CID);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is not a string', () => {
      let isValid = spec.isBidRequestValid(PARAMS_WITH_INTEGER_CID);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is a empty string', () => {
      let isValid = spec.isBidRequestValid(PARAMS_WITH_EMPTY_CID);
      expect(isValid).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('should build valid payload on bid', () => {
      let requestObj = spec.buildRequests(VALID_BID_REQUEST);
      expect(JSON.parse(requestObj.data)).to.deep.equal(VALID_PAYLOAD);
    });

    it('should accept size as a one dimensional array', () => {
      let bidReq = spec.buildRequests(BID_REQUEST_SIZE_AS_1DARRAY);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD);
    });

    it('should ignore bidfloor if not a valid number', () => {
      let bidReq = spec.buildRequests(VALID_BID_REQUEST_INVALID_BIDFLOOR);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD);
    });
  });

  describe('getUserSyncs', () => {
    it('should exclude iframe syncs if iframe is disabled', () => {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_PIXEL_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_PIXEL);
    });

    it('should exclude pixel syncs if pixel is disabled', () => {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_IFRAME_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_IFRAME);
    });

    it('should choose iframe sync urls if both sync options are enabled', () => {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_BOTH_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_IFRAME);
    });
  });

  describe('interpretResponse', () => {
    it('should not push bid response if cpm missing', () => {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_CPM_MISSING, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should not push bid response if cpm 0', () => {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_CPM_ZERO, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should not push response if no-bid', () => {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_NOBID, []);
      expect(bids).to.deep.equal(validBids)
    });
  });
});
