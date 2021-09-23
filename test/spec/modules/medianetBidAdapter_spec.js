import {expect, assert} from 'chai';
import {spec} from 'modules/medianetBidAdapter.js';
import { makeSlot } from '../integration/faker/googletag.js';
import { config } from 'src/config.js';

$$PREBID_GLOBAL$$.version = $$PREBID_GLOBAL$$.version || 'version';
let VALID_BID_REQUEST = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }],

  VALID_BID_REQUEST_WITH_CRID = [{
    'bidder': 'medianet',
    'params': {
      'crid': 'crid',
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'crid': 'crid',
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }],
  VALID_BID_REQUEST_WITH_ORTB2 = [{
    'bidder': 'medianet',
    'params': {
      'crid': 'crid',
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'ortb2Imp': { 'ext': { 'data': { 'pbadslot': '/12345/my-gpt-tag-0' } } },
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'crid': 'crid',
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
    'sizes': [[300, 251]],
    'bidId': '3f97ca71b1e5c2',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'ortb2Imp': { 'ext': { 'data': { 'pbadslot': '/12345/my-gpt-tag-0' } } },
    'bidRequestsCount': 1
  }],
  VALID_BID_REQUEST_WITH_USERID = [{
    'bidder': 'medianet',
    'params': {
      'crid': 'crid',
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    userId: {
      britepoolid: '82efd5e1-816b-4f87-97f8-044f407e2911'
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'crid': 'crid',
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
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
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
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
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [[300, 250]],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
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
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [[300, 251]],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
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
    'refererInfo': {
      referer: 'http://media.net/prebidtest',
      stack: ['http://media.net/prebidtest'],
      reachedTop: true
    }
  },
  VALID_PAYLOAD_INVALID_BIDFLOOR = {
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'usp_applies': false,
      'coppa_applies': false,
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD_NATIVE = {
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'usp_applies': false,
      'coppa_applies': false,
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD = {
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'usp_applies': false,
      'coppa_applies': false,
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD_WITH_USERID = {
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'user_id': {
        britepoolid: '82efd5e1-816b-4f87-97f8-044f407e2911'
      },
      'usp_applies': false,
      'coppa_applies': false,
      'screen': {
        'w': 1000,
        'h': 1000
      }
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'tagid': 'crid',
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
        'crid': 'crid',
        'site': {
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }, {
      'id': '3f97ca71b1e5c2',
      'tagid': 'crid',
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
        'crid': 'crid',
        'site': {
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },
  VALID_PAYLOAD_WITH_CRID = {
    'site': {
      'page': 'http://media.net/prebidtest',
      'domain': 'media.net',
      'ref': 'http://media.net/prebidtest',
      'isTop': true
    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_applies': false,
      'usp_applies': false,
      'coppa_applies': true,
      'screen': {
        'w': 1000,
        'h': 1000
      }
    },
    'id': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'imp': [{
      'id': '28f8f8130a583e',
      'tagid': 'crid',
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
        'crid': 'crid',
        'site': {
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }, {
      'id': '3f97ca71b1e5c2',
      'tagid': 'crid',
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
        'crid': 'crid',
        'site': {
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
        }
      }
    }],
    'tmax': config.getConfig('bidderTimeout')
  },

  VALID_VIDEO_BID_REQUEST = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'video': {
        'skipppable': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'mediaTypes': {
      'video': {
        'context': 'instream',
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }],

  VALID_PAYLOAD_PAGE_META = (() => {
    let PAGE_META;
    try {
      PAGE_META = JSON.parse(JSON.stringify(VALID_PAYLOAD));
    } catch (e) {}
    PAGE_META.site = Object.assign(PAGE_META.site, {
      'canonical_url': 'http://localhost:9999/canonical-test',
      'twitter_url': 'http://localhost:9999/twitter-test',
      'og_url': 'http://localhost:9999/fb-test'
    });
    return PAGE_META;
  })(),
  VALID_PARAMS = {
    bidder: 'medianet',
    params: {
      cid: '8CUV090'
    }
  },
  PARAMS_MISSING = {
    bidder: 'medianet',
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
    body: {
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
    }
  },
  SERVER_RESPONSE_CPM_ZERO = {
    body: {
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
    }
  },
  SERVER_RESPONSE_NOBID = {
    body: {
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
    }
  },
  SERVER_RESPONSE_NOBODY = {

  },
  SERVER_RESPONSE_EMPTY_BIDLIST = {
    body: {
      'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
      'bidList': 'bid',
      'ext': {
        'csUrl': [{
          'type': 'image',
          'url': 'http://cs.media.net/cksync.php'
        }, {
          'type': 'iframe',
          'url': 'http://contextual.media.net/checksync.php?&vsSync=1'
        }]
      }
    }

  },
  SERVER_RESPONSE_VALID_BID = {
    body: {
      'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
      'bidList': [{
        'no_bid': false,
        'requestId': '27210feac00e96',
        'ad': 'ad',
        'width': 300,
        'height': 250,
        'creativeId': '375068987',
        'netRevenue': true,
        'cpm': 0.1
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
    }
  },
  SERVER_VIDEO_OUTSTREAM_RESPONSE_VALID_BID = {
    body: {
      'id': 'd90ca32f-3877-424a-b2f2-6a68988df57a',
      'bidList': [{
        'no_bid': false,
        'requestId': '27210feac00e96',
        'cpm': 12.00,
        'width': 640,
        'height': 480,
        'ttl': 180,
        'creativeId': '370637746',
        'netRevenue': true,
        'vastXml': '',
        'currency': 'USD',
        'dfp_id': 'video1',
        'mediaType': 'video',
        'vto': 5000,
        'mavtr': 10,
        'avp': true,
        'ap': true,
        'pl': true,
        'mt': true,
        'jslt': 3000,
        'context': 'outstream'
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
    }
  },
  SERVER_VALID_BIDS = [{
    'no_bid': false,
    'requestId': '27210feac00e96',
    'ad': 'ad',
    'width': 300,
    'height': 250,
    'creativeId': '375068987',
    'netRevenue': true,
    'cpm': 0.1
  }],
  BID_REQUEST_SIZE_AS_1DARRAY = [{
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '277b631f-92f5-4844-8b19-ea13c095d3f1',
    'sizes': [300, 250],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]],
      }
    },
    'bidId': '28f8f8130a583e',
    'bidderRequestId': '1e9b1f07797c1c',
    'auctionId': 'aafabfd0-28c0-4ac0-aa09-99689e88b81d',
    'bidRequestsCount': 1
  }, {
    'bidder': 'medianet',
    'params': {
      'cid': 'customer_id',
      'site': {
        'page': 'http://media.net/prebidtest',
        'domain': 'media.net',
        'ref': 'http://media.net/prebidtest',
        'isTop': true
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-123',
    'transactionId': 'c52a5c62-3c2b-4b90-9ff8-ec1487754822',
    'sizes': [300, 251],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 251]],
      }
    },
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
    'uspConsent': '1NYN',
    'timeout': 3000,
    refererInfo: {
      referer: 'http://media.net/prebidtest',
      stack: ['http://media.net/prebidtest'],
      reachedTop: true
    }
  },
  VALID_PAYLOAD_FOR_GDPR = {
    'site': {
      'domain': 'media.net',
      'page': 'http://media.net/prebidtest',
      'ref': 'http://media.net/prebidtest',
      'isTop': true

    },
    'ext': {
      'customer_id': 'customer_id',
      'prebid_version': $$PREBID_GLOBAL$$.version,
      'gdpr_consent_string': 'consentString',
      'gdpr_applies': true,
      'usp_applies': true,
      'coppa_applies': false,
      'usp_consent_string': '1NYN',
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
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
          'page': 'http://media.net/prebidtest',
          'domain': 'media.net',
          'ref': 'http://media.net/prebidtest',
          'isTop': true
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

    it('should have missing params', function () {
      let isValid = spec.isBidRequestValid(PARAMS_MISSING);
      expect(isValid).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      $$PREBID_GLOBAL$$.medianetGlobals = {};

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

    it('should parse params for video request', function () {
      let bidReq = spec.buildRequests(VALID_VIDEO_BID_REQUEST, VALID_AUCTIONDATA);
      expect(JSON.stringify(bidReq.data)).to.include('instream');
    });

    it('should have valid crid present in bid request', function() {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        const config = {
          'coppa': true
        };
        return config[key];
      });
      let bidreq = spec.buildRequests(VALID_BID_REQUEST_WITH_CRID, VALID_AUCTIONDATA);
      expect(JSON.parse(bidreq.data)).to.deep.equal(VALID_PAYLOAD_WITH_CRID);
    });

    it('should have valid ortb2Imp param present in bid request', function() {
      let bidreq = spec.buildRequests(VALID_BID_REQUEST_WITH_ORTB2, VALID_AUCTIONDATA);
      let actual = JSON.parse(bidreq.data).imp[0].ortb2Imp;
      const expected = VALID_BID_REQUEST_WITH_ORTB2[0].ortb2Imp
      assert.equal(JSON.stringify(actual), JSON.stringify(expected))

      bidreq = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      actual = JSON.parse(bidreq.data).imp[0].ortb2Imp;
      assert.equal(actual, undefined)
    });

    it('should have userid in bid request', function () {
      let bidReq = spec.buildRequests(VALID_BID_REQUEST_WITH_USERID, VALID_AUCTIONDATA);
      expect(JSON.parse(bidReq.data)).to.deep.equal(VALID_PAYLOAD_WITH_USERID);
    });

    describe('build requests: when page meta-data is available', () => {
      beforeEach(() => {
        spec.clearMnData();
      });
      it('should pass canonical, twitter and fb paramters if available', () => {
        let documentStub = sandbox.stub(window.top.document, 'querySelector');
        documentStub.withArgs('link[rel="canonical"]').returns({
          href: 'http://localhost:9999/canonical-test'
        });
        documentStub.withArgs('meta[property="og:url"]').returns({
          content: 'http://localhost:9999/fb-test'
        });
        documentStub.withArgs('meta[name="twitter:url"]').returns({
          content: 'http://localhost:9999/twitter-test'
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
    it('slot visibility should be calculable even in case of adUnitPath', function () {
      const code = '/19968336/header-bid-tag-0';
      const divId = 'div-gpt-ad-1460505748561-0';
      window.googletag.pubads().setSlots([makeSlot({ code, divId })]);

      let boundingRect = {
        top: 1010,
        left: 1010,
        bottom: 1050,
        right: 1050
      };
      documentStub.withArgs(divId).returns({
        getBoundingClientRect: () => boundingRect
      });
      documentStub.withArgs('div-gpt-ad-1460505748561-123').returns({
        getBoundingClientRect: () => boundingRect
      });

      const bidRequest = [{...VALID_BID_REQUEST[0], adUnitCode: code}]
      const bidReq = spec.buildRequests(bidRequest, VALID_AUCTIONDATA);
      const data = JSON.parse(bidReq.data);
      expect(data.imp[0].ext.visibility).to.equal(2);
      expect(data.imp[0].ext.viewability).to.equal(0);
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

    it('should have empty user sync array', function() {
      let userSyncs = spec.getUserSyncs(SYNC_OPTIONS_IFRAME_ENABLED, {});
      expect(userSyncs).to.deep.equal([]);
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

    it('should have empty bid response', function() {
      let bids = spec.interpretResponse(SERVER_RESPONSE_NOBODY, []);
      expect(bids).to.deep.equal([]);
    });

    it('should have valid bids', function () {
      let bids = spec.interpretResponse(SERVER_RESPONSE_VALID_BID, []);
      expect(bids).to.deep.equal(SERVER_VALID_BIDS);
    });

    it('should have empty bid list', function() {
      let validBids = [];
      let bids = spec.interpretResponse(SERVER_RESPONSE_EMPTY_BIDLIST, []);
      expect(bids).to.deep.equal(validBids);
    });
  });

  describe('onTimeout', function () {
    it('should have valid timeout data', function() {
      let response = spec.onTimeout({});
      expect(response).to.deep.equal(undefined);
    });
  });

  describe('onBidWon', function () {
    it('should have valid bid data', function() {
      let response = spec.onBidWon(undefined);
      expect(response).to.deep.equal(undefined);
    });
  });

  it('context should be outstream', function () {
    let bids = spec.interpretResponse(SERVER_VIDEO_OUTSTREAM_RESPONSE_VALID_BID, []);
    expect(bids[0].context).to.equal('outstream');
  });
  describe('buildRequests floor tests', function () {
    let floor;
    let getFloor = function(req) {
      return floor[req.mediaType];
    };
    beforeEach(function () {
      floor = {
        'banner': {
          'currency': 'USD',
          'floor': 1
        }
      };
      $$PREBID_GLOBAL$$.medianetGlobals = {};

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
      VALID_BID_REQUEST[0].getFloor = getFloor;
    });

    it('should build valid payload with floor', function () {
      let requestObj = spec.buildRequests(VALID_BID_REQUEST, VALID_AUCTIONDATA);
      requestObj = JSON.parse(requestObj.data);
      expect(requestObj.imp[0].hasOwnProperty('bidfloors')).to.equal(true);
    });
  });
});
