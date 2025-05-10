import { expect } from 'chai';
import { spec } from '../../../modules/datablocksBidAdapter.js';
import { BotClientTests } from '../../../modules/datablocksBidAdapter.js';
import { getStorageManager } from '../../../src/storageManager.js';
import {deepClone} from '../../../src/utils.js';

const bid = {
  bidId: '2dd581a2b6281d',
  bidder: 'datablocks',
  bidderRequestId: '145e1d6a7837c9',
  params: {
    source_id: 7560,
    host: 'v5demo.datablocks.net'
  },
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  sizes: [
    [300, 250]
  ],
  transactionId: '1ccbee15-f6f6-46ce-8998-58fe5542e8e1'
};

const bid2 = {
  bidId: '2dd581a2b624324g',
  bidder: 'datablocks',
  bidderRequestId: '145e1d6a7837543',
  params: {
    source_id: 7560,
    host: 'v5demo.datablocks.net'
  },
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
  mediaTypes: {
    banner: {
      sizes:
        [728, 90]
    }
  },
  transactionId: '1ccbee15-f6f6-46ce-8998-58fe55425432'
};

const nativeBid = {
  adUnitCode: '/19968336/header-bid-tag-0',
  auctionId: '160c78a4-f808-410f-b682-d8728f3a79ee',
  bidId: '332045ee374a99',
  bidder: 'datablocks',
  bidderRequestId: '15d9012765e36c',
  mediaTypes: {
    native: {
      title: {
        required: true
      },
      body: {
        required: true
      },
      image: {
        required: true
      }
    }
  },
  nativeParams: {
    title: {
      required: true
    },
    body: {
      required: true,
      data: {
        len: 250
      }
    },
    image: {
      required: true,
      sizes: [728, 90]
    }
  },
  params: {
    source_id: 7560,
    host: 'v5demo.datablocks.net'
  },
  transactionId: '0a4e9788-4def-4b94-bc25-564d7cac99f6'
}

const bidderRequest = {
  auctionId: '8bfef1be-d3ac-4d18-8859-754c7b4cf017',
  auctionStart: Date.now(),
  biddeCode: 'datablocks',
  bidderRequestId: '10c47a5fc3c41',
  bids: [bid, bid2, nativeBid],
  refererInfo: {
    numIframes: 0,
    reachedTop: true,
    referer: 'https://7560.v5demo.datablocks.net/test',
    stack: ['https://7560.v5demo.datablocks.net/test']
  },
  start: Date.now(),
  timeout: 10000
};

const res_object = {
  body: {
    'id': '10c47a5fc3c41',
    'bidid': '217868445-30021-19053-0',
    'seatbid': [
      {
        'id': '22621593137287',
        'impid': '1',
        'adm': 'John is great',
        'adomain': ['medianet.com'],
        'price': 0.430000,
        'cid': '2524568',
        'adid': '0',
        'crid': '0',
        'cat': [],
        'w': 300,
        'h': 250,
        'ext': {
          'type': 'CPM',
          'mtype': 'banner'
        }
      },
      {
        'id': '22645215457415',
        'impid': '2',
        'adm': 'john is the best',
        'adomain': ['td.com'],
        'price': 0.580000,
        'cid': '2524574',
        'adid': '0',
        'crid': '0',
        'cat': [],
        'w': 728,
        'h': 90,
        'ext': {
          'type': 'CPM',
          'mtype': 'banner'
        }
      },

      {
        'id': '22645215457416',
        'impid': '3',
        'adm': '{"native":{"ver":"1.2","assets":[{"id":1,"required":1,"title":{"text":"John is amazing"}},{"id":5,"required":1,"data":{"value":"Sponsored by John"}},{"id":3,"required":1,"img":{"url":"https://example.image.com/", "h":"360", "w":"360"}}],"link":{"url":"https://click.example.com/c/264597/?fcid=29699699045816"},"imptrackers":["https://impression.example.com/i/264597/?fcid=29699699045816"]}}',
        'adomain': ['td.com'],
        'price': 10.00,
        'cid': '2524574',
        'adid': '0',
        'crid': '0',
        'cat': [],
        'ext': {
          'type': 'CPM',
          'mtype': 'native'
        }
      }
    ],
    'cur': 'USD',
    'ext': {
      'version': '1.2.93',
      'buyerid': '1234567',
      'syncs': [
        {
          'type': 'iframe',
          'url': 'https://s.0cf.io'
        },
        {
          'type': 'image',
          'url': 'https://us.dblks.net/set_uid/'
        }
      ]
    }
  }
}

let bid_request = {
  method: 'POST',
  url: 'https://prebid.datablocks.net/openrtb/?sid=2523014',
  options: {
    withCredentials: true
  },
  data: {
	    'id': 'c09c6e47-8bdb-4884-a46d-93165322b368',
	    'imp': [{
	        'id': '1',
	        'tagid': '/19968336/header-bid-tag-0',
	        'placement_id': 0,
	        'secure': true,
	        'banner': {
	            'w': 300,
	            'h': 250,
	            'format': [{
	                'w': 300,
	                'h': 250
	            }, {
	                'w': 300,
	                'h': 600
	            }]
	        }
	    }, {
	        'id': '2',
	        'tagid': '/19968336/header-bid-tag-1',
	        'placement_id': 12345,
	        'secure': true,
	        'banner': {
	            'w': 729,
	            'h': 90,
	            'format': [{
	                'w': 729,
	                'h': 90
	            }, {
	                'w': 970,
	                'h': 250
	            }]
	        }
	    }, {
	        'id': '3',
	        'tagid': '/19968336/prebid_multiformat_test',
	        'placement_id': 0,
	        'secure': true,
	        'native': {
	            'ver': '1.2',
	            'request': {
	                'assets': [{
	                    'required': 1,
	                    'id': 1,
	                    'title': {}
	                }, {
	                    'required': 1,
	                    'id': 3,
	                    'img': {
	                        'type': 3
	                    }
	                }, {
	                    'required': 1,
	                    'id': 5,
	                    'data': {
	                        'type': 1
	                    }
	                }],
	                'context': 1,
	                'plcmttype': 1,
	                'ver': '1.2'
	            }
	        }
	    }],
	    'site': {
	        'domain': 'test.datablocks.net',
	        'page': 'https://test.datablocks.net/index.html',
	        'schain': {},
	        'ext': {
	            'p_domain': 'https://test.datablocks.net',
	            'rt': true,
	            'frames': 0,
	            'stack': ['https://test.datablocks.net/index.html'],
	            'timeout': 3000
	        },
	        'keywords': 'HTML, CSS, JavaScript'
	    },
	    'device': {
	        'ip': 'peer',
	        'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
	        'js': 1,
	        'language': 'en',
	        'buyerid': '1234567',
	        'ext': {
	            'pb_eids': [{
	                'source': 'criteo.com',
	                'uids': [{
	                    'id': 'test',
	                    'atype': 1
	                }]
	            }],
	            'syncs': {
	                '1000': 'db_4044853',
	                '1001': true
	            },
	            'coppa': 0,
	            'gdpr': {},
	            'usp': {},
	            'client_info': {
	                'wiw': 2560,
	                'wih': 1281,
	                'saw': 2560,
	                'sah': 1417,
	                'scd': 24,
	                'sw': 2560,
	                'sh': 1440,
	                'whl': 4,
	                'wxo': 0,
	                'wyo': 0,
	                'wpr': 2,
	                'is_bot': false,
	                'is_hid': false,
	                'vs': 'hidden'
	            },
	            'fpd': {}
	        }
	    }
  }
}

describe('DatablocksAdapter', function() {
  before(() => {
    // stub out queue metric to avoid it polluting the global xhr mock during other tests
    sinon.stub(spec, 'queue_metric').callsFake(() => null);
  });

  after(() => {
    spec.queue_metric.restore();
  });

  describe('All needed functions are available', function() {
    it(`isBidRequestValid is present and type function`, function () {
      expect(spec.isBidRequestValid).to.exist.and.to.be.a('function')
    });

    it(`buildRequests is present and type function`, function () {
      expect(spec.buildRequests).to.exist.and.to.be.a('function')
    });

    it(`getUserSyncs is present and type function`, function () {
      expect(spec.getUserSyncs).to.exist.and.to.be.a('function')
    });

    it(`onBidWon is present and type function`, function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function')
    });

    it(`onSetTargeting is present and type function`, function () {
      expect(spec.onSetTargeting).to.exist.and.to.be.a('function')
    });

    it(`interpretResponse is present and type function`, function () {
      expect(spec.interpretResponse).to.exist.and.to.be.a('function')
    });

    it(`store_dbid is present and type function`, function () {
      expect(spec.store_dbid).to.exist.and.to.be.a('function')
    });

    it(`get_dbid is present and type function`, function () {
      expect(spec.get_dbid).to.exist.and.to.be.a('function')
    });

    it(`store_syncs is present and type function`, function () {
      expect(spec.store_syncs).to.exist.and.to.be.a('function')
    });

    it(`get_syncs is present and type function`, function () {
      expect(spec.get_syncs).to.exist.and.to.be.a('function')
    });

    it(`queue_metric is present and type function`, function () {
      expect(spec.queue_metric).to.exist.and.to.be.a('function')
    });

    it(`send_metrics is present and type function`, function () {
      expect(spec.send_metrics).to.exist.and.to.be.a('function')
    });

    it(`get_client_info is present and type function`, function () {
      expect(spec.get_client_info).to.exist.and.to.be.a('function')
    });

    it(`get_viewability is present and type function`, function () {
      expect(spec.get_viewability).to.exist.and.to.be.a('function')
    });
  });

  describe('get / store dbid', function() {
    it('Should return true / undefined', function() {
      expect(spec.store_dbid('12345')).to.be.true;
      expect(spec.get_dbid()).to.be.a('string');
    });
  })

  describe('get / store syncs', function() {
    it('Should return true / array', function() {
      expect(spec.store_syncs([{id: 1, uid: 'test'}])).to.be.true;
      expect(spec.get_syncs()).to.be.a('object');
    });
  })

  describe('get_viewability', function() {
    it('Should return undefined', function() {
      expect(spec.get_viewability()).to.equal(undefined);
    });
  })

  describe('get client info', function() {
    it('Should return object', function() {
      let client_info = spec.get_client_info()
      expect(client_info).to.be.a('object');
      expect(client_info).to.have.all.keys('wiw', 'wih', 'saw', 'sah', 'scd', 'sw', 'sh', 'whl', 'wxo', 'wyo', 'wpr', 'is_bot', 'is_hid', 'vs');
    });

    it('bot test should return boolean', function() {
      let bot_test = new BotClientTests();
      expect(bot_test.doTests()).to.be.a('boolean');
    });
  })

  describe('isBidRequestValid', function() {
    it('Should return true when source_id and Host are set', function() {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when host/source_id is not set', function() {
      let moddedBid = deepClone(bid);
      delete moddedBid.params.source_id;
      expect(spec.isBidRequestValid(moddedBid)).to.be.false;
    });

    it('Should return true when viewability reporting is opted out', function() {
      let moddedBid = Object.assign({}, bid);
      moddedBid.params.vis_optout = true;
      spec.isBidRequestValid(moddedBid);
      expect(spec.db_obj.vis_optout).to.be.true;
    });
  })

  describe('getUserSyncs', function() {
    it('Should return array of syncs', function() {
      expect(spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [res_object], {gdprApplies: true, gdpr: 1, gdpr_consent: 'consent_string'}, {})).to.be.an('array');
    });
  });

  describe('onSetTargeting', function() {
    it('Should return undefined', function() {
      expect(spec.onSetTargeting()).to.equal(undefined);
    });
  });

  describe('onBidWon', function() {
    it('Should return undefined', function() {
      let won_bid = {params: [{source_id: 1}], requestId: 1, adUnitCode: 'unit', auctionId: 1, size: '300x250', cpm: 10, adserverTargeting: {hb_pb: 10}, timeToRespond: 10, ttl: 10};
      expect(spec.onBidWon(won_bid)).to.equal(undefined);
    });
  });

  describe('buildRequests', function() {
    let request;
    before(() => {
      request = spec.buildRequests([bid, bid2, nativeBid], bidderRequest);
      expect(request).to.exist;
    })

    it('Returns POST method', function() {
      expect(request.method).to.exist;
      expect(request.method).to.equal('POST');
    });

    it('Returns valid URL', function() {
      expect(request.url).to.exist;
      expect(request.url).to.equal('https://v5demo.datablocks.net/openrtb/?sid=7560');
    });

    it('Creates an array of request objects', function() {
      expect(request.data.imp).to.be.an('array').that.is.not.empty;
    });

    it('Should be a valid openRTB request', function() {
      let data = request.data;

      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('device', 'imp', 'site', 'id');
      expect(data.id).to.be.a('string');
      expect(data.imp).to.be.a('array');
      expect(data.device.ip).to.equal('peer');

      let imps = data['imp'];
      imps.forEach((imp, index) => {
        let curBid = bidderRequest.bids[index];
        if (imp.banner) {
          expect(imp.banner).to.be.a('object');
          expect(imp).to.have.all.keys('banner', 'id', 'secure', 'tagid', 'placement_id', 'ortb2', 'floor');
        } else if (imp.native) {
          expect(imp).to.have.all.keys('native', 'id', 'secure', 'tagid', 'placement_id', 'ortb2', 'floor');
          expect(imp.native).to.have.all.keys('request', 'ver');
          expect(imp.native.request).to.be.a('object');
        } else {
          expect(true).to.equal(false);
        }

        expect(imp.id).to.be.a('string');
        expect(imp.id).to.equal(curBid.bidId);
        expect(imp.tagid).to.be.a('string');
        expect(imp.tagid).to.equal(curBid.adUnitCode);
        expect(imp.secure).to.equal(false);
      })
    });

    it('Returns empty data if no valid requests are passed', function() {
      let test_request = spec.buildRequests([]);
      expect(test_request).to.be.an('array').that.is.empty;
    });
  });

  describe('interpretResponse', function() {
    let response = spec.interpretResponse(res_object, bid_request);

    it('Returns an array of valid server responses if response object is valid', function() {
      expect(response).to.be.an('array').that.is.not.empty;

      response.forEach(bid => {
        expect(parseInt(bid.requestId)).to.be.a('number').greaterThan(0);
        expect(bid.cpm).to.be.a('number');
        expect(bid.creativeId).to.be.a('string');
        expect(bid.currency).to.be.a('string');
        expect(bid.netRevenue).to.be.a('boolean');
        expect(bid.ttl).to.be.a('number');
        expect(bid.mediaType).to.be.a('string');

        if (bid.mediaType == 'banner') {
          expect(bid.width).to.be.a('number');
          expect(bid.height).to.be.a('number');
          expect(bid.ad).to.be.a('string');
        } else if (bid.mediaType == 'native') {
          expect(bid.native).to.be.a('object');
        }
      })

      it('Returns an empty array if invalid response is passed', function() {
        serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });
});
