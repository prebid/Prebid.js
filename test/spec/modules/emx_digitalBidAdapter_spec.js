import { expect } from 'chai';
import { spec } from 'modules/emx_digitalBidAdapter.js';
import * as utils from 'src/utils.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('emx_digital Adapter', function () {
  describe('callBids', function () {
    const adapter = newBidder(spec);
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    describe('banner request validity', function () {
      let bid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let badBid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {
          }
        },
        'adUnitCode': 'adunit-code',
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let noBid = {};
      let otherBid = {
        'bidder': 'emxdigital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let noMediaSizeBid = {
        'bidder': 'emxdigital',
        'params': {
          'tagid': '25251'
        },
        'mediaTypes': {
          'banner': {}
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };

      it('should return true when required params found', function () {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
        expect(spec.isBidRequestValid(badBid)).to.equal(false);
        expect(spec.isBidRequestValid(noBid)).to.equal(false);
        expect(spec.isBidRequestValid(otherBid)).to.equal(false);
        expect(spec.isBidRequestValid(noMediaSizeBid)).to.equal(false);
      });
    });

    describe('video request validity', function () {
      let bid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251',
          'video': {}
        },
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [640, 480]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };
      let noInstreamBid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251',
          'video': {
            'protocols': [1, 7]
          }
        },
        'mediaTypes': {
          'video': {
            'context': 'something_random'
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };

      let outstreamBid = {
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251',
          'video': {}
        },
        'mediaTypes': {
          'video': {
            'context': 'outstream',
            'playerSize': [640, 480]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'bidderRequestId': '22edbae3120bf6',
        'auctionId': '1d1a01234a475'
      };

      it('should return true when required params found', function () {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
        expect(spec.isBidRequestValid(noInstreamBid)).to.equal(false);
        expect(spec.isBidRequestValid(outstreamBid)).to.equal(true);
      });

      it('should contain tagid param', function () {
        expect(spec.isBidRequestValid({
          bidder: 'emx_digital',
          params: {},
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        })).to.equal(false);
        expect(spec.isBidRequestValid({
          bidder: 'emx_digital',
          params: {
            tagid: ''
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        })).to.equal(false);
        expect(spec.isBidRequestValid({
          bidder: 'emx_digital',
          params: {
            tagid: '123'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        })).to.equal(true);
      });
    });
  });

  describe('buildRequests', function () {
    let bidderRequest = {
      'bidderCode': 'emx_digital',
      'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
      'bidderRequestId': '22edbae3120bf6',
      'timeout': 1500,
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'page': 'https://example.com/index.html?pbjs_debug=true',
        'domain': 'example.com',
        'ref': 'https://referrer.com'
      },
      'bids': [{
        'bidder': 'emx_digital',
        'params': {
          'tagid': '25251'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250],
              [300, 600]
            ]
          }
        },
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c2501de1e',
        'auctionId': 'e19f1eff-8b27-42a6-888d-9674e5a6130c',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      }]
    };
    let request = spec.buildRequests(bidderRequest.bids, bidderRequest);

    it('sends bid request to ENDPOINT via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('contains the correct options', function () {
      expect(request.options.withCredentials).to.equal(true);
    });

    it('contains a properly formatted endpoint url', function () {
      const url = request.url.split('?');
      const queryParams = url[1].split('&');
      expect(queryParams[0]).to.match(new RegExp('^t=\d*', 'g'));
      expect(queryParams[1]).to.match(new RegExp('^ts=\d*', 'g'));
    });

    it('builds bidfloor value from bid param when getFloor function does not exist', function () {
      const bidRequestWithFloor = utils.deepClone(bidderRequest.bids);
      bidRequestWithFloor[0].params.bidfloor = 1;
      const requestWithFloor = spec.buildRequests(bidRequestWithFloor, bidderRequest);
      const data = JSON.parse(requestWithFloor.data);
      expect(data.imp[0].bidfloor).to.equal(bidRequestWithFloor[0].params.bidfloor);
    });

    it('builds bidfloor value from getFloor function when it exists', function () {
      const floorResponse = { currency: 'USD', floor: 3 };
      const bidRequestWithGetFloor = utils.deepClone(bidderRequest.bids);
      bidRequestWithGetFloor[0].getFloor = () => floorResponse;
      const requestWithGetFloor = spec.buildRequests(bidRequestWithGetFloor, bidderRequest);
      const data = JSON.parse(requestWithGetFloor.data);
      expect(data.imp[0].bidfloor).to.equal(3);
    });

    it('builds bidfloor value from getFloor when both floor and getFloor function exists', function () {
      const floorResponse = { currency: 'USD', floor: 3 };
      const bidRequestWithBothFloors = utils.deepClone(bidderRequest.bids);
      bidRequestWithBothFloors[0].params.bidfloor = 1;
      bidRequestWithBothFloors[0].getFloor = () => floorResponse;
      const requestWithBothFloors = spec.buildRequests(bidRequestWithBothFloors, bidderRequest);
      const data = JSON.parse(requestWithBothFloors.data);
      expect(data.imp[0].bidfloor).to.equal(3);
    });

    it('empty bidfloor value when floor and getFloor is not defined', function () {
      const bidRequestWithoutFloor = utils.deepClone(bidderRequest.bids);
      const requestWithoutFloor = spec.buildRequests(bidRequestWithoutFloor, bidderRequest);
      const data = JSON.parse(requestWithoutFloor.data);
      expect(data.imp[0].bidfloor).to.not.exist;
    });

    it('builds request properly', function () {
      const data = JSON.parse(request.data);
      expect(Array.isArray(data.imp)).to.equal(true);
      expect(data.id).to.equal(bidderRequest.auctionId);
      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].id).to.equal('30b31c2501de1e');
      expect(data.imp[0].tid).to.equal('d7b773de-ceaa-484d-89ca-d9f51b8d61ec');
      expect(data.imp[0].tagid).to.equal('25251');
      expect(data.imp[0].secure).to.equal(0);
      expect(data.imp[0].vastXml).to.equal(undefined);
    });

    it('properly sends site information and protocol', function () {
      request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      request = JSON.parse(request.data);
      expect(request.site).to.have.property('domain', 'example.com');
      expect(request.site).to.have.property('page', 'https://example.com/index.html?pbjs_debug=true');
      expect(request.site).to.have.property('ref', 'https://referrer.com');
    });

    it('builds correctly formatted request banner object', function () {
      let bidRequestWithBanner = utils.deepClone(bidderRequest.bids);
      let request = spec.buildRequests(bidRequestWithBanner, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].video).to.equal(undefined);
      expect(data.imp[0].banner).to.exist.and.to.be.a('object');
      expect(data.imp[0].banner.w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][0]);
      expect(data.imp[0].banner.h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][1]);
      expect(data.imp[0].banner.format[0].w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][0]);
      expect(data.imp[0].banner.format[0].h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[0][1]);
      expect(data.imp[0].banner.format[1].w).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[1][0]);
      expect(data.imp[0].banner.format[1].h).to.equal(bidRequestWithBanner[0].mediaTypes.banner.sizes[1][1]);
    });

    it('builds correctly formatted request video object for instream', function () {
      let bidRequestWithVideo = utils.deepClone(bidderRequest.bids);
      bidRequestWithVideo[0].mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [[640, 480]]
        },
      };
      bidRequestWithVideo[0].params.video = {};
      let request = spec.buildRequests(bidRequestWithVideo, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].video).to.exist.and.to.be.a('object');
      expect(data.imp[0].video.w).to.equal(bidRequestWithVideo[0].mediaTypes.video.playerSize[0][0]);
      expect(data.imp[0].video.h).to.equal(bidRequestWithVideo[0].mediaTypes.video.playerSize[0][1]);
    });

    it('builds correctly formatted request video object for outstream', function () {
      let bidRequestWithOutstreamVideo = utils.deepClone(bidderRequest.bids);
      bidRequestWithOutstreamVideo[0].mediaTypes = {
        video: {
          context: 'outstream',
          playerSize: [[640, 480]]
        },
      };
      bidRequestWithOutstreamVideo[0].params.video = {};
      let request = spec.buildRequests(bidRequestWithOutstreamVideo, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].video).to.exist.and.to.be.a('object');
      expect(data.imp[0].video.w).to.equal(bidRequestWithOutstreamVideo[0].mediaTypes.video.playerSize[0][0]);
      expect(data.imp[0].video.h).to.equal(bidRequestWithOutstreamVideo[0].mediaTypes.video.playerSize[0][1]);
    });

    it('shouldn\'t contain a user obj without GDPR information', function () {
      let request = spec.buildRequests(bidderRequest.bids, bidderRequest)
      request = JSON.parse(request.data)
      expect(request).to.not.have.property('user');
    });

    it('should have the right gdpr info when enabled', function () {
      let consentString = 'OIJSZsOAFsABAB8EMXZZZZZ+A==';
      const gdprBidderRequest = utils.deepClone(bidderRequest);
      gdprBidderRequest.gdprConsent = {
        'consentString': consentString,
        'gdprApplies': true
      };
      let request = spec.buildRequests(gdprBidderRequest.bids, gdprBidderRequest);

      request = JSON.parse(request.data)
      expect(request.regs.ext).to.have.property('gdpr', 1);
      expect(request.user.ext).to.have.property('consent', consentString);
    });

    it('should\'t contain consent string if gdpr isn\'t applied', function () {
      const nonGdprBidderRequest = utils.deepClone(bidderRequest);
      nonGdprBidderRequest.gdprConsent = {
        'gdprApplies': false
      };
      let request = spec.buildRequests(nonGdprBidderRequest.bids, nonGdprBidderRequest);
      request = JSON.parse(request.data)
      expect(request.regs.ext).to.have.property('gdpr', 0);
      expect(request).to.not.have.property('user');
    });

    it('should add us privacy info to request', function() {
      const uspBidderRequest = utils.deepClone(bidderRequest);
      let consentString = '1YNN';
      uspBidderRequest.uspConsent = consentString;
      let request = spec.buildRequests(uspBidderRequest.bids, uspBidderRequest);
      request = JSON.parse(request.data);
      expect(request.us_privacy).to.exist;
      expect(request.us_privacy).to.exist.and.to.equal(consentString);
    });

    it('should add schain object to request', function() {
      const schainBidderRequest = utils.deepClone(bidderRequest);
      schainBidderRequest.bids[0].schain = {
        'complete': 1,
        'ver': '1.0',
        'nodes': [
          {
            'asi': 'testing.com',
            'sid': 'abc',
            'hp': 1
          }
        ]
      };
      let request = spec.buildRequests(schainBidderRequest.bids, schainBidderRequest);
      request = JSON.parse(request.data);
      expect(request.source.ext.schain).to.exist;
      expect(request.source.ext.schain).to.have.property('complete', 1);
      expect(request.source.ext.schain).to.have.property('ver', '1.0');
      expect(request.source.ext.schain.nodes[0].asi).to.equal(schainBidderRequest.bids[0].schain.nodes[0].asi);
    });

    it('should add liveramp identitylink id to request', () => {
      const idl_env = '123';
      const bidRequestWithID = utils.deepClone(bidderRequest);
      bidRequestWithID.userId = { idl_env };
      let requestWithID = spec.buildRequests(bidRequestWithID.bids, bidRequestWithID);
      requestWithID = JSON.parse(requestWithID.data);
      expect(requestWithID.user.ext.eids[0]).to.deep.equal({
        source: 'liveramp.com',
        uids: [{
          id: idl_env,
          ext: {
            rtiPartner: 'idl'
          }
        }]
      });
    });

    it('should add gpid to request if present', () => {
      const gpid = '/12345/my-gpt-tag-0';
      let bid = utils.deepClone(bidderRequest.bids[0]);
      bid.ortb2Imp = { ext: { data: { adserver: { adslot: gpid } } } };
      bid.ortb2Imp = { ext: { data: { pbadslot: gpid } } };
      let requestWithGPID = spec.buildRequests([bid], bidderRequest);
      requestWithGPID = JSON.parse(requestWithGPID.data);
      expect(requestWithGPID.imp[0].ext.gpid).to.exist.and.equal(gpid);
    });

    it('should add UID 2.0 to request', () => {
      const uid2 = { id: '456' };
      const bidRequestWithUID = utils.deepClone(bidderRequest);
      bidRequestWithUID.userId = { uid2 };
      let requestWithUID = spec.buildRequests(bidRequestWithUID.bids, bidRequestWithUID);
      requestWithUID = JSON.parse(requestWithUID.data);
      expect(requestWithUID.user.ext.eids[0]).to.deep.equal({
        source: 'uidapi.com',
        uids: [{
          id: uid2.id,
          ext: {
            rtiPartner: 'UID2'
          }
        }]
      });
    });
  });

  describe('interpretResponse', function () {
    let bid = {
      'bidder': 'emx_digital',
      'params': {
        'tagid': '25251',
        'video': {}
      },
      'mediaTypes': {
        'video': {
          'context': 'instream',
          'playerSize': [640, 480]
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250],
        [300, 600]
      ],
      'bidId': '30b31c2501de1e',
      'bidderRequestId': '22edbae3120bf6',
      'auctionId': '1d1a01234a475'
    };

    const bid_outstream = {
      'bidderRequest': {
        'bids': [{
          'bidder': 'emx_digital',
          'params': {
            'tagid': '25251',
            'video': {}
          },
          'mediaTypes': {
            'video': {
              'context': 'outstream',
              'playerSize': [640, 480]
            }
          },
          'adUnitCode': 'adunit-code',
          'sizes': [
            [300, 250],
            [300, 600]
          ],
          'bidId': '987654321cba',
          'bidderRequestId': '22edbae3120bf6',
          'auctionId': '1d1a01234a475'
        }, {
          'bidder': 'emx_digital',
          'params': {
            'tagid': '25252',
            'video': {}
          },
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': [640, 480]
            }
          },
          'adUnitCode': 'adunit-code',
          'sizes': [
            [300, 250],
            [300, 600]
          ],
          'bidId': '987654321dcb',
          'bidderRequestId': '22edbae3120bf6',
          'auctionId': '1d1a01234a475'
        }]
      }
    };

    const serverResponse = {
      'id': '12819a18-56e1-4256-b836-b69a10202668',
      'seatbid': [{
        'bid': [{
          'adid': '123456abcde',
          'adm': '<!-- Creative -->',
          'crid': '3434abab34',
          'h': 250,
          'id': '987654321cba',
          'price': 0.5,
          'ttl': 300,
          'w': 300,
          'adomain': ['example.com']
        }],
        'seat': '1356'
      }, {
        'bid': [{
          'adid': '123456abcdf',
          'adm': '<!-- Creative -->',
          'crid': '3434abab35',
          'h': 600,
          'id': '987654321dcb',
          'price': 0.5,
          'ttl': 300,
          'w': 300
        }]
      }]
    };

    const expectedResponse = [{
      'requestId': '12819a18-56e1-4256-b836-b69a10202668',
      'cpm': 0.5,
      'width': 300,
      'height': 250,
      'creativeId': '3434abab34',
      'dealId': null,
      'currency': 'USD',
      'netRevneue': true,
      'mediaType': 'banner',
      'ad': '<!-- Creative -->',
      'ttl': 300,
      'meta': {
        'advertiserDomains': ['example.com']
      }
    }, {
      'requestId': '12819a18-56e1-4256-b836-b69a10202668',
      'cpm': 0.7,
      'width': 300,
      'height': 600,
      'creativeId': '3434abab35',
      'dealId': null,
      'currency': 'USD',
      'netRevneue': true,
      'mediaType': 'banner',
      'ad': '<!-- Creative -->',
      'ttl': 300
    }];

    it('should properly format bid response', function () {
      let result = spec.interpretResponse({
        body: serverResponse
      });
      expect(Object.keys(result[0]).length).to.equal(Object.keys(expectedResponse[0]).length);
      expect(Object.keys(result[0]).requestId).to.equal(Object.keys(expectedResponse[0]).requestId);
      expect(Object.keys(result[0]).bidderCode).to.equal(Object.keys(expectedResponse[0]).bidderCode);
      expect(Object.keys(result[0]).cpm).to.equal(Object.keys(expectedResponse[0]).cpm);
      expect(Object.keys(result[0]).creativeId).to.equal(Object.keys(expectedResponse[0]).creativeId);
      expect(Object.keys(result[0]).width).to.equal(Object.keys(expectedResponse[0]).width);
      expect(Object.keys(result[0]).height).to.equal(Object.keys(expectedResponse[0]).height);
      expect(Object.keys(result[0]).ttl).to.equal(Object.keys(expectedResponse[0]).ttl);
      expect(Object.keys(result[0]).adId).to.equal(Object.keys(expectedResponse[0]).adId);
      expect(Object.keys(result[0]).currency).to.equal(Object.keys(expectedResponse[0]).currency);
      expect(Object.keys(result[0]).netRevenue).to.equal(Object.keys(expectedResponse[0]).netRevenue);
      expect(Object.keys(result[0]).ad).to.equal(Object.keys(expectedResponse[0]).ad);
    });

    it('should return multiple bids', function () {
      let result = spec.interpretResponse({
        body: serverResponse
      });
      expect(Array.isArray(result.seatbid))

      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.ad).to.equal(serverResponse.seatbid[0].bid[0].adm);
      expect(ad0.cpm).to.equal(serverResponse.seatbid[0].bid[0].price);
      expect(ad0.creativeId).to.equal(serverResponse.seatbid[0].bid[0].crid);
      expect(ad0.currency).to.equal('USD');
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.requestId).to.equal(serverResponse.seatbid[0].bid[0].id);
      expect(ad0.ttl).to.equal(300);

      expect(ad1.ad).to.equal(serverResponse.seatbid[1].bid[0].adm);
      expect(ad1.cpm).to.equal(serverResponse.seatbid[1].bid[0].price);
      expect(ad1.creativeId).to.equal(serverResponse.seatbid[1].bid[0].crid);
      expect(ad1.currency).to.equal('USD');
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.requestId).to.equal(serverResponse.seatbid[1].bid[0].id);
      expect(ad1.ttl).to.equal(300);
    });

    it('returns a banner bid for non-xml creatives', function () {
      let result = spec.interpretResponse({
        body: serverResponse
      }, { bidRequest: bid }
      );
      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.mediaType).to.equal('banner');
      expect(ad0.ad.indexOf('<?xml version') === -1).to.equal(true);
      expect(ad0.vastXml).to.equal(undefined);
      expect(ad0.height).to.equal(serverResponse.seatbid[0].bid[0].h);
      expect(ad0.width).to.equal(serverResponse.seatbid[0].bid[0].w);

      expect(ad1.mediaType).to.equal('banner');
      expect(ad1.ad.indexOf('<?xml version') === -1).to.equal(true);
      expect(ad1.vastXml).to.equal(undefined);
      expect(ad1.width).to.equal(serverResponse.seatbid[1].bid[0].w);
      expect(ad1.height).to.equal(serverResponse.seatbid[1].bid[0].h);
    });

    it('returns a vastXml kvp for video creatives', function () {
      const vastServerResponse = utils.deepClone(serverResponse);
      vastServerResponse.seatbid[0].bid[0].adm = '<?xml version=><VAST></VAST></xml>';
      vastServerResponse.seatbid[1].bid[0].adm = '<?xml version=><VAST></VAST></xml>';

      let result = spec.interpretResponse({
        body: vastServerResponse
      }, { bidRequest: bid }
      );
      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.mediaType).to.equal('video');
      expect(ad0.ad.indexOf('<?xml version') > -1).to.equal(true);
      expect(ad0.vastXml).to.equal(vastServerResponse.seatbid[0].bid[0].adm);
      expect(ad0.ad).to.exist.and.to.be.a('string');
      expect(ad1.mediaType).to.equal('video');
      expect(ad1.ad.indexOf('<?xml version') > -1).to.equal(true);
      expect(ad1.vastXml).to.equal(vastServerResponse.seatbid[1].bid[0].adm);
      expect(ad1.ad).to.exist.and.to.be.a('string');
    });

    it('returns a renderer for outstream video creatives', function () {
      const vastServerResponse = utils.deepClone(serverResponse);
      vastServerResponse.seatbid[0].bid[0].adm = '<?xml version=><VAST></VAST></xml>';
      vastServerResponse.seatbid[1].bid[0].adm = '<?xml version=><VAST></VAST></xml>';
      let result = spec.interpretResponse({body: vastServerResponse}, bid_outstream);
      const ad0 = result[0];
      const ad1 = result[1];
      expect(ad0.renderer).to.exist.and.to.be.a('object');
      expect(ad0.renderer.url).to.equal('https://js.brealtime.com/outstream/1.30.0/bundle.js');
      expect(ad0.renderer.id).to.equal('987654321cba');
      expect(ad1.renderer).to.equal(undefined);
    });

    it('handles nobid responses', function () {
      let serverResponse = {
        'bids': []
      };

      let result = spec.interpretResponse({
        body: serverResponse
      });
      expect(result.length).to.equal(0);
    });

    it('should not throw an error when decoding an improperly encoded adm', function () {
      const badAdmServerResponse = utils.deepClone(serverResponse);
      badAdmServerResponse.seatbid[0].bid[0].adm = '<script\\ src\\=\\\"https\\:\\/\\/nym1\\-ib\\.adnxs\\.com\\/ab\\?an_audit\\=0\\&referrer=https%3A%2F%2Fwww.emxdigital.com%3Ftest%3DhAiE3%VVl%26prebid%3D%25123%25\\&e\\=wqT_3QLPCfBDzwQAAAMA1gAFAQj2iaPtBRCdw\\-qeto72gkEYlNWN2smGoJhTKjYJzGJi83G9KkARzGJi83G9KkAZAAAAgD0KEkAhzGIJGwApESTIMQAAAGBmZu4_MMvWgAc4zApAzApIAlDo\\-YEUWNbsR2AAaIrFCnjOpQWAAQGKAQNVU0SSBQbwQJgB2AWgAVqoAQGwAQC4AQLAAQTIAQLQAQnYAQDgAQDwAQCKAjp1ZignYScsIDI4OTEwMSwgMTU3MTM0MTU1OCk7ARwscicsIDQxOTc1MDE2Nh4A9DQBkgLhAiE3VVlCWndpQmpwOEpFT2o1Z1JRWUFDRFc3RWN3QURnQVFBUkl6QXBReTlhQUIxZ0FZTHdFYUFCd0NuZ0FnQUZFaUFFQWtBRUFtQUVBb0FFQnFBRURzQUVBdVFGS1I2cF9jYjBxUU1FQlNrZXFmM0c5S2tESkFaR1JfRy1UVnRNXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFJQUNBSWdDcVlMWEJaQUNBWmdDQUtBQ0FLZ0NBTFVDQUFBQUFMMENBQUFBQU9BQ0FPZ0NBUGdDQUlBREFaZ0RBYWdEZ1k2ZkNib0RDVTVaVFRJNk5ESTRNdUFEOHhQNEE0NnV2Z3lJQkFDUUJBQ1lCQUd5QkFvSXFZTFhCUkNPcnI0TXdRUUFBQUFBQUFBQUFNa0VBQUFBBXgMQURSQgkJLEF3Q0ZBMkFRQThRUQ0SYEFBQVBnRUFJZ0Z1aUUumgKJASE2eElrelE2ZQGgMXV4SElBUW9BREU5Q3RlamNMMHFRRG9KVGxsTk1qbzBNamd5UVBNVFMRWAxQQV9VEQwMQUFBVx0MAFkdDABhHQwAYw0MAaXwi2VBQS7YAqwD4AK30UbqAlxodHRwczovL3d3dy5jZWxlYnV6ei5jb20vZy90YXlsb3Itc3dpZnQtZGVidXRzLXJlZC1oYWlyLWluLXN1Z2FybGFuZC12aWRlby8_YmlkZHJfZGVidWc9dHJ1ZfICEwoPQ1VTVE9NX01PREVMX0lEEgDyAhoKFkNVU1RPERY8TEVBRl9OQU1FEgDyAh4KGjYdAPQqAUFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDlCHgAwDoAwD4AwOABACSBAkvb3BlbnJ0YjKYBACiBA8xNDQuMTIxLjIzMy4yMzeoBIkWsgQMCAAQABgAIAAwADgAuAQAwAQAyASxgoIB0gQOMTM1NiNOWU0yOjQyODLaBAIIAeAEAPAE6PmBFPoEEgkAAAAAZqdHQBEAAAAgWpRewIgFAZgFAKAF____________AaoFFjQ5MTgxNTcxMzQxNTU2NTI2OTQ5ZTHABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AXW7gr6BQQIABAAkAYAmAYAuAYAwQYAAAAAAADwP8gGANAGwgTaBhYKEAAAAAAAAAAAAAAABQpQEAAYAOAGAfIGAggAgAcBiAcAoAcB\\&s\\=630dbbd55f593c7bfd9e7bccc4dbaa28203daaed\\&pp\\=\\$\\{EMX_MACRO\\}\\\"\\>\\<\\/script\\>';
      badAdmServerResponse.seatbid[1].bid[0].adm = '%3F%%3Demx%3C3prebid';

      assert.doesNotThrow(() => spec.interpretResponse({
        body: badAdmServerResponse
      }));
    });

    it('returns valid advertiser domain', function () {
      const bidResponse = utils.deepClone(serverResponse);
      let result = spec.interpretResponse({body: bidResponse});
      expect(result[0].meta.advertiserDomains).to.deep.equal(expectedResponse[0].meta.advertiserDomains);
      // case where adomains are not in request
      expect(result[1].meta).to.not.exist;
    });
  });

  describe('getUserSyncs', function () {
    it('should register the iframe sync url', function () {
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('should pass gdpr params', function () {
      let syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {
        gdprApplies: false, consentString: 'test'
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.contains('gdpr=0');
    });
  });
});
