import { expect } from 'chai';
import { config } from 'src/config.js';
import { spec } from 'modules/datawrkzBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const BIDDER_CODE = 'datawrkz';
const ENDPOINT_URL = 'https://at.datawrkz.com/exchange/openrtb23/';
const SITE_ID = 'site_id';
const FINAL_URL = ENDPOINT_URL + SITE_ID + '?hb=1';

describe('datawrkzAdapterTests', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': BIDDER_CODE,
      'params': {
        'site_id': SITE_ID,
        'bidfloor': '1.0'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when params not found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required site_id param not found', function () {
      let bid = Object.assign({}, bid);
      bid.params = {'bidfloor': '1.0'}
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when adunit is adpod video', function () {
      let bid = Object.assign({}, bid);
      bid.params = {'bidfloor': '1.0', 'site_id': SITE_ID};
      bid.mediaTypes = {
        'video': {
          'context': 'adpod'
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const consentString = '1YA-';
    const bidderRequest = {
      'bidderCode': 'datawrkz',
      'auctionId': '1d1a030790a475',
      'bidderRequestId': '22edbae2733bf6',
      'timeout': 3000,
      'uspConsent': consentString,
      'gdprConsent': {'gdprApplies': true},
    };
    const bannerBidRequests = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'banner': {'sizes': [[300, 250], [300, 600]]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'sizes': [[300, 250], [300, 600]],
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const bannerBidRequestsSingleArraySlotAndDeals = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00, 'deals': [{id: 'deal_1'}, {id: 'deal_2'}]},
      'mediaTypes': {'banner': {}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'sizes': [300, 250],
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const nativeBidRequests = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'native': {
        'title': {'required': true, 'len': 80},
        'image': {'required': true, 'sizes': [[300, 250]]},
        'icon': {'required': true, 'sizes': [[50, 50]]},
        'sponsoredBy': {'required': true},
        'cta': {'required': true},
        'body': {'required': true, 'len': 100}
      }},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const nativeBidRequestsSingleArraySlotAndDeals = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00, 'deals': [{id: 'deal_1'}, {id: 'deal_2'}]},
      'mediaTypes': {'native': {
        'title': {'len': 80},
        'image': {'sizes': [300, 250]},
        'icon': {'sizes': [50, 50]},
        'sponsoredBy': {},
        'cta': {},
        'body': {'len': 100}
      }},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const instreamVideoBidRequests = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'video': {'context': 'instream', 'playerSize': [[640, 480]]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const instreamVideoBidRequestsSingleArraySlotAndDeals = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00, 'deals': [{id: 'deal_1'}, {id: 'deal_2'}]},
      'mediaTypes': {'video': {'context': 'instream', 'playerSize': [640, 480]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const outstreamVideoBidRequests = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'video': {'context': 'outstream', 'playerSize': [[640, 480]], 'mimes': ['video/mp4', 'video/x-flv']}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const outstreamVideoBidRequestsSingleArraySlotAndDeals = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00, 'deals': [{id: 'deal_1'}, {id: 'deal_2'}]},
      'mediaTypes': {'video': {'context': 'outstream', 'playerSize': [640, 480], 'mimes': ['video/mp4', 'video/x-flv']}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];
    const bidRequestsWithNoMediaType = [{
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
    }];

    it('empty bid requests', function () {
      const requests = spec.buildRequests([], bidderRequest);
      assert.lengthOf(requests, 0);
    });

    it('mediaTypes missing in bid request', function () {
      const requests = spec.buildRequests(bidRequestsWithNoMediaType, bidderRequest);
      assert.lengthOf(requests, 0);
    });

    it('invalid media type in bid request', function () {
      bidRequestsWithNoMediaType[0].mediaTypes = {'test': {}};
      const requests = spec.buildRequests(bidRequestsWithNoMediaType, bidderRequest);
      assert.lengthOf(requests, 0);
    });

    it('size missing in bid request for banner', function () {
      delete bidRequestsWithNoMediaType[0].mediaTypes.test;
      bidRequestsWithNoMediaType[0].mediaTypes.banner = {};
      const requests = spec.buildRequests(bidRequestsWithNoMediaType, bidderRequest);
      assert.lengthOf(requests, 0);
    });

    it('size array empty in bid request for banner', function () {
      bidRequestsWithNoMediaType[0].mediaTypes.banner.sizes = [];
      const requests = spec.buildRequests(bidRequestsWithNoMediaType, bidderRequest);
      assert.lengthOf(requests, 0);
    });

    it('banner bidRequest with slot size as 2 dimensional array', function () {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const requests = spec.buildRequests(bannerBidRequests, bidderRequest);
      config.getConfig.restore();
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload.imp).to.exist;
      expect(payload).to.nested.include({'imp[0].banner.w': 300});
      expect(payload).to.nested.include({'imp[0].banner.h': 250});
      expect(payload).to.nested.include({'regs.ext.us_privacy': consentString});
      expect(payload).to.nested.include({'regs.ext.gdpr': '1'});
      expect(payload).to.nested.include({'regs.coppa': '1'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('banner');
    });

    it('banner bidRequest with deals and slot size as 1 dimensional array', function () {
      const requests = spec.buildRequests(bannerBidRequestsSingleArraySlotAndDeals, bidderRequest);
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload.imp).to.exist;
      expect(payload).to.nested.include({'imp[0].banner.w': 300});
      expect(payload).to.nested.include({'imp[0].banner.h': 250});
      expect(payload).to.nested.include({'imp[0].pmp.deals[0].id': 'deal_1'});
      expect(payload).to.nested.include({'imp[0].pmp.deals[1].id': 'deal_2'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('banner');
    });

    it('native bidRequest fields with slot size as 2 dimensional array', function () {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const requests = spec.buildRequests(nativeBidRequests, bidderRequest);
      config.getConfig.restore();
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload.imp[0].native.request).to.exist;
      expect(payload).to.nested.include({'regs.ext.us_privacy': consentString});
      expect(payload).to.nested.include({'regs.ext.gdpr': '1'});
      expect(payload).to.nested.include({'regs.coppa': '1'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('native');
    });

    it('native bidRequest fields with deals and slot size as 1 dimensional array', function () {
      const requests = spec.buildRequests(nativeBidRequestsSingleArraySlotAndDeals, bidderRequest);
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload.imp).to.exist;
      expect(payload.imp[0].native.request).to.exist;
      expect(payload).to.nested.include({'imp[0].pmp.deals[0].id': 'deal_1'});
      expect(payload).to.nested.include({'imp[0].pmp.deals[1].id': 'deal_2'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('native');
    });

    it('instream video bidRequest fields with slot size as 2 dimensional array', function () {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const requests = spec.buildRequests(instreamVideoBidRequests, bidderRequest);
      config.getConfig.restore();
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload).to.nested.include({'regs.ext.us_privacy': consentString});
      expect(payload).to.nested.include({'regs.ext.gdpr': '1'});
      expect(payload).to.nested.include({'regs.coppa': '1'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('video');
    });

    it('instream video bidRequest with deals and slot size as 1 dimensional array', function () {
      const requests = spec.buildRequests(instreamVideoBidRequestsSingleArraySlotAndDeals, bidderRequest);
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('video');
    });

    it('outstream video bidRequest fields with slot size as 2 dimensional array', function () {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const requests = spec.buildRequests(outstreamVideoBidRequests, bidderRequest);
      config.getConfig.restore();
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload).to.nested.include({'imp[0].video.w': 640});
      expect(payload).to.nested.include({'imp[0].video.h': 480});
      expect(payload).to.nested.include({'regs.ext.us_privacy': consentString});
      expect(payload).to.nested.include({'regs.ext.gdpr': '1'});
      expect(payload).to.nested.include({'regs.coppa': '1'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('video');
    });

    it('outstream video bidRequest fields with deals and slot size as 1 dimensional array', function () {
      const requests = spec.buildRequests(outstreamVideoBidRequestsSingleArraySlotAndDeals, bidderRequest);
      const payload = JSON.parse(requests[0].data);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(FINAL_URL);
      expect(payload).to.nested.include({'imp[0].video.w': 640});
      expect(payload).to.nested.include({'imp[0].video.h': 480});
      expect(payload).to.nested.include({'imp[0].pmp.deals[0].id': 'deal_1'});
      expect(payload).to.nested.include({'imp[0].pmp.deals[1].id': 'deal_2'});
      expect(requests[0].bidRequest).to.exist;
      expect(requests[0].bidRequest.requestedMediaType).to.equal('video');
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'banner': {'sizes': [[300, 250], [300, 600]]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'sizes': [[300, 250], [300, 600]],
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
      'requestedMediaType': 'banner'
    };
    const nativeBidRequest = {
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'native': {
        'title': {'required': true, 'len': 80},
        'image': {'required': true, 'sizes': [300, 250]},
        'icon': {'required': true, 'sizes': [50, 50]},
        'sponsoredBy': {'required': true},
        'cta': {'required': true},
        'body': {'required': true}
      }},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
      'requestedMediaType': 'native',
      'assets': [
        {'id': 1, 'required': 1, 'title': {'len': 80}},
        {'id': 2, 'required': 1, 'img': {'type': 3, 'w': 300, 'h': 250}},
        {'id': 3, 'required': 1, 'img': {'type': 1, 'w': 50, 'h': 50}},
        {'id': 4, 'required': 1, 'data': {'type': 1}},
        {'id': 5, 'required': 1, 'data': {'type': 12}},
        {'id': 6, 'required': 1, 'data': {'type': 2, 'len': 100}}
      ]
    };
    const instreamVideoBidRequest = {
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID, 'bidfloor': 1.00},
      'mediaTypes': {'video': {'context': 'instream', 'playerSize': [640, 480]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
      'requestedMediaType': 'video'
    };
    const outstreamVideoBidRequest = {
      'bidder': BIDDER_CODE,
      'params': {'site_id': SITE_ID,
        'bidfloor': 1.00,
        'outstreamType': 'slider_top_left',
        'outstreamConfig':
          {'ad_unit_audio': 1, 'show_player_close_button_after': 5, 'hide_player_control': 0}},
      'mediaTypes': {'video': {'context': 'outstream', 'playerSize': [640, 480]}},
      'adUnitCode': 'adUnitCode',
      'transactionId': 'transactionId',
      'bidId': 'bidId',
      'bidderRequestId': 'bidderRequestId',
      'auctionId': 'auctionId',
      'requestedMediaType': 'video'
    };
    const request = {
      'method': 'POST',
      'url': FINAL_URL,
      'data': '',
      bidRequest
    };

    it('check empty response', function () {
      const result = spec.interpretResponse({}, request);
      expect(result).to.deep.equal([]);
    });

    it('check if id missing in response', function () {
      const serverResponse = {'body': {'seatbid': [{}]}, 'headers': {}};
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.deep.equal([]);
    });

    it('check if seatbid present in response', function () {
      const serverResponse = {'body': {'id': 'id'}, 'headers': {}};
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.deep.equal([]);
    });

    it('check empty array response seatbid', function () {
      const serverResponse = {'body': {'id': 'id', 'seatbid': []}, 'headers': {}};
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.deep.equal([]);
    });

    it('check bid present in seatbid', function () {
      const serverResponse = {'body': {'id': 'id', 'seatbid': [{}]}, 'headers': {}};
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(0);
    });

    it('check empty array bid in seatbid', function () {
      const serverResponse = {'body': {'id': 'id', 'seatbid': [{'bid': []}]}, 'headers': {}};
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(0);
    });

    it('banner response missing bid price', function () {
      const serverResponse = {'body': {'id': 'id', 'seatbid': [{'bid': [{'id': 1}]}]}, 'headers': {}};
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
    });

    it('banner response', function () {
      const serverResponse = {
        'body': {
          'id': 'id',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'price': 1,
                  'w': 300,
                  'h': 250,
                  'adm': 'test adm',
                  'nurl': 'url'
                }
              ]
            }
          ]
        },
        'headers': {}
      };
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].cpm).to.equal(1);
      expect(result[0].size).to.equal(bidRequest.mediaTypes.banner.sizes);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].ad).to.equal(decodeURIComponent(serverResponse.body.seatbid[0].bid[0].adm + '<img src="' + serverResponse.body.seatbid[0].bid[0].nurl + '" height="0px" width="0px">'));
      expect(result[0].creativeId).to.equal('1');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
      expect(result[0].transactionId).to.equal(request.bidRequest.transactionId);
      expect(result[0].mediaType).to.equal('banner');
    });

    it('native response missing bid price', function () {
      request.bidRequest = nativeBidRequest;
      const serverResponse = {
        'body': {
          'id': 'id',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'w': 300,
                  'h': 250,
                  'adm': '{"native": {"link": {"url": "test_url"}, "imptrackers": [], "assets": [' +
                    '{"id": 1, "title": {"text": "Test title"}},' +
                    '{"id": 2, "img": {"type": 3,"url": "https://test/image", "w": 300, "h": 250}},' +
                    '{"id": 3, "img": {"type": 1, "url": "https://test/icon", "w": 50, "h": 50}},' +
                    '{"id": 4, "data": {"type": 1, "value": "Test sponsored by"}},' +
                    '{"id": 5, "data": {"type": 12, "value": "Test CTA"}},' +
                    '{"id": 6, "data": {"type": 2, "value": "Test body"}}]}}'
                }
              ]
            }
          ]
        },
        'headers': {}
      };
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
    });

    it('native response', function () {
      request.bidRequest = nativeBidRequest;
      const serverResponse = {
        'body': {
          'id': 'id',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'price': 1,
                  'w': 300,
                  'h': 250,
                  'adm': '{"native": {"link": {"url": "test_url"}, "imptrackers": ["tracker1", "tracker2"], "assets": [' +
                    '{"id": 1, "title": {"text": "Test title"}},' +
                    '{"id": 2, "img": {"type": 3,"url": "https://test/image", "w": 300, "h": 250}},' +
                    '{"id": 3, "img": {"type": 1, "url": "https://test/icon", "w": 50, "h": 50}},' +
                    '{"id": 4, "data": {"type": 1, "value": "Test sponsored by"}},' +
                    '{"id": 5, "data": {"type": 12, "value": "Test CTA"}},' +
                    '{"id": 6, "data": {"type": 2, "value": "Test body"}}]}}'
                }
              ]
            }
          ]
        },
        'headers': {}
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].cpm).to.equal(1);
      expect(result[0].native.clickUrl).to.equal('test_url');
      expect(result[0].native.impressionTrackers).to.have.lengthOf(2);
      expect(result[0].native.title).to.equal('Test title');
      expect(result[0].native.image.url).to.equal('https://test/image');
      expect(result[0].native.icon.url).to.equal('https://test/icon');
      expect(result[0].native.sponsored).to.equal('Test sponsored by');
      expect(result[0].native.cta).to.equal('Test CTA');
      expect(result[0].native.desc).to.equal('Test body');
      expect(result[0].creativeId).to.equal('1');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
      expect(result[0].transactionId).to.equal(request.bidRequest.transactionId);
      expect(result[0].mediaType).to.equal('native');
    });

    it('video response missing bid price', function () {
      request.bidRequest = instreamVideoBidRequest;
      const serverResponse = {
        'body': {
          'id': 'id',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'w': 640,
                  'h': 480,
                  'adm': '<VAST></VAST>',
                  'ext': {
                    'vast_url': 'vast_url'
                  }
                }
              ]
            }
          ]
        },
        'headers': {}
      };
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
    });

    it('instream video response', function () {
      request.bidRequest = instreamVideoBidRequest;
      const serverResponse = {
        'body': {
          'id': 'id',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'price': 1,
                  'w': 640,
                  'h': 480,
                  'adm': '<VAST></VAST>',
                  'ext': {
                    'vast_url': 'test_vast_url?kcid=123&kaid=12&protocol=3'
                  }
                }
              ]
            }
          ]
        },
        'headers': {}
      };

      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].cpm).to.equal(1);
      expect(result[0].width).to.equal(640);
      expect(result[0].height).to.equal(480);
      expect(result[0].vastUrl).to.equal('test_vast_url?kcid=123&kaid=12&protocol=3');
      expect(result[0].adserverTargeting.hb_kcid).to.equal('123');
      expect(result[0].adserverTargeting.hb_kaid).to.equal('12');
      expect(result[0].adserverTargeting.hb_protocol).to.equal('3');
      expect(result[0].creativeId).to.equal('1');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
      expect(result[0].transactionId).to.equal(request.bidRequest.transactionId);
      expect(result[0].mediaType).to.equal('video');
    });

    it('outstream video response', function () {
      request.bidRequest = outstreamVideoBidRequest;
      const serverResponse = {
        'body': {
          'id': 'id',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1',
                  'price': 1,
                  'w': 640,
                  'h': 480,
                  'adm': '<VAST></VAST>',
                  'ext': {
                    'vast_url': 'vast_url'
                  }
                }
              ]
            }
          ]
        },
        'headers': {}
      };
      const result = spec.interpretResponse(serverResponse, request);
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bidId');
      expect(result[0].cpm).to.equal(1);
      expect(result[0].width).to.equal(640);
      expect(result[0].height).to.equal(480);
      expect(result[0].outstreamType).to.equal('slider_top_left');
      expect(result[0].ad).to.equal('<VAST></VAST>');
      expect(result[0].renderer).to.exist;
      expect(result[0].creativeId).to.equal('1');
      expect(result[0].bidderCode).to.equal(request.bidRequest.bidder);
      expect(result[0].transactionId).to.equal(request.bidRequest.transactionId);
      expect(result[0].mediaType).to.equal('video');
    });
  });
});
