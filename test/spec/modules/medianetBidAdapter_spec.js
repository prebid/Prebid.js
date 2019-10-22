import {expect} from 'chai';
import {spec} from 'modules/medianetBidAdapter';
import { config } from 'src/config';

let VALID_BID_REQUEST = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }],
  VALID_BID_REQUEST_INVALID_BIDFLOOR = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'bidfloor': 'abcdef',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }],
  VALID_NATIVE_BID_REQUEST = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1,
    'nativeParams': {
      'image': {
        'required': true,
        'sizes': [
          150,
          50
        ],
        'wmin': 50
      },
      'title': {
        'required': true,
        'len': 80
      },
      'sponsoredBy': {
        'required': true
      },
      'clickUrl': {
        'required': true
      },
      'body': {
        'required': true
      },
      'icon': {
        'required': true,
        'sizes': [
          50,
          50
        ]
      }
    }
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1,
    'nativeParams': {
      'image': {
        'required': true,
        'sizes': [
          150,
          50
        ],
        'wmin': 50
      },
      'title': {
        'required': true,
        'len': 80
      },
      'sponsoredBy': {
        'required': true
      },
      'clickUrl': {
        'required': true
      },
      'body': {
        'required': true
      },
      'icon': {
        'required': true,
        'sizes': [
          50,
          50
        ]
      }
    }
  }],
  VALID_AUCTIONDATA = {
    'timeout': config.getConfig('bidderTimeout'),
  },
  VALID_PAYLOAD_INVALID_BIDFLOOR = {
    'site': {
      'page': 'https://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'https://media.net/prebidtest'
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'screen': {
        'w': 1000,
        'h': 1000
      }
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-0',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 250
      }],
      'all': {
        'cid': 'customer_id',
        'bidfloor': 'abcdef',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }, {
      'id': '3f97ca71b1e5c2',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-123',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 251
      }],
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD_NATIVE = {
    'site': {
      'page': 'https://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'https://media.net/prebidtest'
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'screen': {
        'w': 1000,
        'h': 1000
      }
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-0',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 250
      }],
      'native': '{\"image\":{\"required\":true,\"sizes\":[150,50],\"wmin\":50},\"title\":{\"required\":true,\"len\":80},\"sponsoredBy\":{\"required\":true},\"clickUrl\":{\"required\":true},\"body\":{\"required\":true},\"icon\":{\"required\":true,\"sizes\":[50,50]}}',
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }, {
      'id': '3f97ca71b1e5c2',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-123',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 251
      }],
      'native': '{\"image\":{\"required\":true,\"sizes\":[150,50],\"wmin\":50},\"title\":{\"required\":true,\"len\":80},\"sponsoredBy\":{\"required\":true},\"clickUrl\":{\"required\":true},\"body\":{\"required\":true},\"icon\":{\"required\":true,\"sizes\":[50,50]}}',
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD = {
    'site': {
      'page': 'https://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'https://media.net/prebidtest'
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'screen': {
        'w': 1000,
        'h': 1000
      }
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-0',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 250
      }],
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }, {
      'id': '3f97ca71b1e5c2',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-123',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 251
      }],
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD_PAGE_META = (() => {
    let PAGE_META;
    try {
      PAGE_META = JSON.parse(JSON.stringify(VALID_PAYLOAD));
    } catch (e) {}
    PAGE_META.site = Object.assign(PAGE_META.site, {
      'canonical_url': 'https://localhost:9999/canonical-test',
      'twitter_url': 'https://localhost:9999/twitter-test',
      'og_url': 'https://localhost:9999/fb-test'
    });
    return PAGE_META;
  })(),
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
        'url': 'https://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'https://contextual.media.net/checksync.php?&vsSync=1'
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
        'url': 'https://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'https://contextual.media.net/checksync.php?&vsSync=1'
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
        'url': 'https://cs.media.net/cksync.php'
      }, {
        'type': 'iframe',
        'url': 'https://contextual.media.net/checksync.php?&vsSync=1'
      }]
    }
  },
  BID_REQUEST_SIZE_AS_1DARRAY = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [300, 250],
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'https://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'https://media.net/prebidtest'
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [300, 251],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }],
  VALID_BIDDER_REQUEST_WITH_GDPR = {
    'gdprConsent': {
      'consentString': 'consentString',
      'gdprApplies': true,
    },
    'timeout': 3000
  },
  VALID_PAYLOAD_FOR_GDPR = {
    'site': {
      'domain': 'media.net',
      'page': 'https://media.net/prebidtest',
      'ref': 'https://media.net/prebidtest'
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_consent_string': 'consentString',
      'gdpr_applies': true,
      'screen': {
        'w': 1000,
        'h': 1000
      }
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-0',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 250
      }],
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }, {
      'id': '3f97ca71b1e5c2',
      'ext': {
        'dfp_id': 'div-gpt-ad-1460505748561-123',
        'visibility': 1,
        'viewability': 1,
        'coordinates': {
          'top_left': {
            x: 50,
            y: 50
          },
          'bottom_right': {
            x: 100,
            y: 100
          }
        },
        'display_count': 1
      },
      'banner': [{
        'w': 300,
        'h': 251
      }],
      'all': {
        'cid': 'customer_id',
        'site': {
          'page': 'https://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'https://media.net/prebidtest'
        }
      }
    }],
    'tmax': 3000,
  };

describe('Media.net bid adapter', function () {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should accept valid bid params', function () {
      let isValid = spec.isBidRequestValid(VALID_PARAMS);
      expect(isValid).to.equal(true);
    });

    it('should reject bid if cid is not present', function () {
      let isValid = spec.isBidRequestValid(PARAMS_WITHOUT_CID);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is not a string', function () {
      let isValid = spec.isBidRequestValid(PARAMS_WITH_INTEGER_CID);
      expect(isValid).to.equal(false);
    });

    it('should reject bid if cid is a empty string', function () {
      let isValid = spec.isBidRequestValid(PARAMS_WITH_EMPTY_CID);
      expect(isValid).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      let documentStub = sandbox.stub(document, 'getElementById');
      let boundingRect = {
        top: 50,
        left: 50,
        bottom: 100,
        right: 100
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      let windowSizeStub = sandbox.stub(spec, 'getWindowSize');
      windowSizeStub.returns({
        w: 1000,
        h: 1000
      });
    });

    it('should build valid payload on bid', function () {
      let requestObj = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      expect(JSON.parse(requestObj.data)).to.deep.equal(VALID_PAYLOAD);
    });

    it('should accept size as a one dimensional array', function () {
      let bidReq = spec.buildRequests(BID_REQUEST_SIZE_AS_1DARRAY, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD);
    });

    it('should ignore bidfloor if not a valid number', function () {
      let bidReq = spec.buildRequests(VALID_BID_REQUEST_INVALID_BIDFLOOR, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_INVALID_BIDFLOOR);
    });

    it('should add gdpr to response ext', function () {
      let bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_BIDDER_REQUEST_WITH_GDPR);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_FOR_GDPR);
    });

    it('should parse params for native request', function () {
      let bidReq = spec.buildRequests(VALID_NATIVE_BID_REQUEST, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_NATIVE);
    });

    describe('build requests: when page meta-data is available', () => {
      beforeEach(() => {
        spec.clearMnData();
      });
      it('should pass canonical, twitter and fb paramters if available', () => {
        let documentStub = sandbox.stub(window.top.document, 'querySelector');
        documentStub.withArgs('link[rel="canonical"]').returns({
          href: 'https://localhost:9999/canonical-test'
        });
        documentStub.withArgs('meta[property="og:url"]').returns({
          content: 'https://localhost:9999/fb-test'
        });
        documentStub.withArgs('meta[name="twitter:url"]').returns({
          content: 'https://localhost:9999/twitter-test'
        });
        let bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
        expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_PAGE_META);
      });
    });
  });

  describe('slot visibility', function () {
    let documentStub;
    beforeEach(function () {
      let windowSizeStub = sandbox.stub(spec, 'getWindowSize');
      windowSizeStub.returns({
        w: 1000,
        h: 1000
      });
      documentStub = sandbox.stub(document, 'getElementById');
    });
    it('slot visibility should be 2 and ratio 0 when ad unit is BTF', function () {
      let boundingRect = {
        top: 1010,
        left: 1010,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });

      let bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      let data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(2);
      expect(data.imp[0].ext.viewability).to.equal(0);
    });
    it('slot visibility should be 2 and ratio < 0.5 when ad unit is partially inside viewport', function () {
      let boundingRect = {
        top: 990,
        left: 990,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      let bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      let data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(2);
      expect(data.imp[0].ext.viewability).to.equal(100 / 75000);
    });
    it('slot visibility should be 1 and ratio > 0.5 when ad unit mostly in viewport', function () {
      let boundingRect = {
        top: 800,
        left: 800,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-0').returns({
        getBoundingClientRect: () => boundingRect
      });
      let bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      let data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(1);
      expect(data.imp[0].ext.viewability).to.equal(40000 / 75000);
    });
    it('co-ordinates should not be sent and slot visibility should be 0 when ad unit is not present', function () {
      let bidReq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      let data = JSON.parse(bidReq.data);
      expect(data.imp[1].ext).to.not.have.ownPropertyDescriptor('viewability');
      expect(data.imp[1].ext.visibility).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('should exclude iframe syncs if iframe is disabled', function () {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_PIXEL_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_PIXEL);
    });

    it('should exclude pixel syncs if pixel is disabled', function () {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_IFRAME_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_IFRAME);
    });

    it('should choose iframe sync urls if both sync options are enabled', function () {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_BOTH_ENABLED, SERVER_CSYNC_RESPONSE);
      expect(userSyncs).to.deep.equal(ENABLED_SYNC_IFRAME);
    });
  });

  describe('interpretResponse', function () {
    it('should not push bid response if cpm missing', function () {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_CPM_MISSING, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should not push bid response if cpm 0', function () {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_CPM_ZERO, []);
      expect(bids).to.deep.equal(validBids);
    });

    it('should not push response if no-bid', function () {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_NOBID, []);
      expect(bids).to.deep.equal(validBids);
    });
  });
});
