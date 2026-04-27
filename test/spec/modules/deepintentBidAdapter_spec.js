import { expect } from 'chai';
import { spec } from 'modules/deepintentBidAdapter.js';
import * as utils from 'src/utils.js';

describe('Deepintent adapter', function () {
  let request, videoBidRequests, bidderRequest;
  let bannerResponse, videoBidResponse, invalidResponse;

  beforeEach(function () {
    bidderRequest = { ortb2: {} };

    request = [
      {
        bidder: 'deepintent',
        bidId: 'a7e92b9b-d9db-4de8-9c3f-f90737335445',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          tagId: '100013',
          w: 728,
          h: 90,
          pos: 1,
          user: {
            id: 'di_testuid',
            buyeruid: 'di_testbuyeruid',
            yob: 2002,
            gender: 'F'
          },
          custom: {
            'position': 'right-box'
          }
        }
      }
    ];
    videoBidRequests = [
      {
        code: 'video1',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        },
        bidder: 'deepintent',
        bidId: '22bddb28db77d',
        params: {
          tagId: '100013',
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            testwrongparam: 3,
            testwrongparam1: 'wrong',
            minduration: 5,
            maxduration: 30,
            startdelay: 5,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            battr: [13, 14],
            minbitrate: 10,
            maxbitrate: 10
          }
        }
      }
    ];
    bannerResponse = {
      'body': {
        'id': '303e1fae-9677-41e2-9a92-15a23445363f',
        'seatbid': [{
          'bid': [{
            'id': '11447bb1-a266-470d-b0d7-8810f5b1b75f',
            'impid': 'a7e92b9b-d9db-4de8-9c3f-f90737335445',
            'price': 0.6,
            'adid': '10001',
            'mtype': 1,
            'adm': "<span id='deepintent_wrapper_a7e92b9b-d9db-4de8-9c3f-f90737335445'></span>",
            'adomain': ['deepintent.com'],
            'cid': '103389',
            'crid': '13665',
            'w': 300,
            'h': 250,
            'dealid': 'dee_12312stdszzsx'
          }],
          'seat': '10000'
        }],
        'bidid': '0b08b09f-aaa1-4c14-b1c8-7debb1a7c1cd'
      }
    };
    invalidResponse = {
      'body': {
        'id': '303e1fae-9677-41e2-9a92-15a23445363f',
        'seatbid': [{
          'bid': [{
            'id': '11447bb1-a266-470d-b0d7-8810f5b1b75f',
            'impid': 'a7e92b9b-d9db-4de8-9c3f-f90737335445',
            'price': 0.6,
            'adid': '10001',
            'adm': 'invalid response',
            'adomain': ['deepintent.com'],
            'cid': '103389',
            'crid': '13665',
            'w': 300,
            'h': 250,
            'dealid': 'dee_12312stdszzsx'
          }],
          'seat': '10000'
        }],
        'bidid': '0b08b09f-aaa1-4c14-b1c8-7debb1a7c1cd'
      }
    };
    videoBidResponse = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'mtype': 2,
            'adm': '<VAST version="3.0"><Ad id="601364"></Ad></VAST>',
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 6
            }
          }]
        }]
      }
    };
  });

  describe('validations', function () {
    it('validBid : tagId is passed', function () {
      const bid = {
        bidder: 'deepintent',
        params: { tagId: '1232' }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('invalidBid : tagId is not passed', function () {
      const bid = {
        bidder: 'deepintent',
        params: { h: 200, w: 300 }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('invalidBid : tagId is not a string', function () {
      const bid = {
        bidder: 'deepintent',
        params: { tagId: 12345 }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should check for context if video is present', function () {
      const bid = {
        bidder: 'deepintent',
        params: { tagId: '12345' },
        mediaTypes: {
          video: { playerSize: [640, 480], context: 'instream' }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should error out if context is not present and is Video', function () {
      const bid = {
        bidder: 'deepintent',
        params: { tagId: '12345' },
        mediaTypes: {
          video: { playerSize: [640, 480] }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('request check', function () {
    it('immutable bid request check', function () {
      const originalRequest = JSON.parse(JSON.stringify(request));
      spec.buildRequests(request, bidderRequest);
      expect(request).to.deep.equal(originalRequest);
    });

    it('bidder connection check', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      expect(bRequest.url).to.equal('https://prebid.deepintent.com/prebid');
      expect(bRequest.method).to.equal('POST');
      expect(bRequest.options.contentType).to.equal('application/json');
    });

    it('bid request check: device comes from ortb2 FPD', function () {
      const bidderReqWithDevice = {
        ortb2: {
          device: { ua: 'test-ua', w: 1024, h: 768, language: 'en' }
        }
      };
      const bRequest = spec.buildRequests(request, bidderReqWithDevice);
      expect(bRequest.data.device.ua).to.equal('test-ua');
      expect(bRequest.data.device.w).to.equal(1024);
      expect(bRequest.data.device.h).to.equal(768);
    });

    it('bid request check: Impression fields', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      const data = bRequest.data;
      expect(data.at).to.equal(1);
      expect(data.imp[0].id).to.equal(request[0].bidId);
      expect(data.imp[0].tagid).to.equal('100013');
      expect(data.imp[0].displaymanager).to.equal('di_prebid');
      expect(data.imp[0].displaymanagerver).to.equal('1.0.0');
    });

    it('bid request check: banner sends full format array', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      const data = bRequest.data;
      expect(data.imp[0].banner).to.be.a('object');
      expect(data.imp[0].banner.format).to.be.an('array').with.length(1);
      expect(data.imp[0].banner.format[0].w).to.equal(300);
      expect(data.imp[0].banner.format[0].h).to.equal(250);
    });

    it('bid request check: banner sends all sizes as format array', function () {
      const multiSizeRequest = [{
        bidder: 'deepintent',
        bidId: 'test-bid-multi',
        mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
        params: { tagId: '100013' }
      }];
      const bRequest = spec.buildRequests(multiSizeRequest, bidderRequest);
      const banner = bRequest.data.imp[0].banner;
      expect(banner.format).to.have.length(2);
      expect(banner.format[0]).to.deep.equal({ w: 300, h: 250 });
      expect(banner.format[1]).to.deep.equal({ w: 728, h: 90 });
    });

    it('bid request check: custom params', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      const data = bRequest.data;
      expect(data.imp[0].ext).to.be.a('object');
      expect(data.imp[0].ext.deepintent.position).to.equal('right-box');
    });

    it('bid request check: position check', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      expect(bRequest.data.imp[0].banner.pos).to.equal(1);
    });

    it('bid request check: displaymanager check', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      expect(bRequest.data.imp[0].displaymanager).to.equal('di_prebid');
      expect(bRequest.data.imp[0].displaymanagerver).to.equal('1.0.0');
    });

    it('bid request check: bidfloor from params when no price floors module', function () {
      const requestClone = JSON.parse(JSON.stringify(request));

      let bRequest = spec.buildRequests(requestClone, bidderRequest);
      expect(bRequest.data.imp[0].bidfloor).to.not.exist;

      requestClone[0].params.bidfloor = 0;
      bRequest = spec.buildRequests(requestClone, bidderRequest);
      expect(bRequest.data.imp[0].bidfloor).to.equal(0);

      requestClone[0].params.bidfloor = 1.2;
      bRequest = spec.buildRequests(requestClone, bidderRequest);
      expect(bRequest.data.imp[0].bidfloor).to.equal(1.2);
    });

    it('bid request check: user object from params', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      const data = bRequest.data;
      expect(data.user).to.be.a('object');
      expect(data.user.id).to.equal('di_testuid');
      expect(data.user.buyeruid).to.equal('di_testbuyeruid');
      expect(data.user.yob).to.equal(2002);
      expect(data.user.gender).to.equal('F');
    });

    it('bid request check: CCPA comes from ortb2.regs', function () {
      const bidderReqWithCCPA = {
        ortb2: { regs: { ext: { us_privacy: '1NYN' } } }
      };
      const bRequest = spec.buildRequests(request, bidderReqWithCCPA);
      expect(bRequest.data.regs.ext.us_privacy).to.equal('1NYN');

      const bRequest2 = spec.buildRequests(request, { ortb2: {} });
      expect(bRequest2.data.regs).to.equal(undefined);
    });

    it('bid request check: GDPR comes from ortb2.regs and ortb2.user', function () {
      const bidderReqWithGDPR = {
        ortb2: {
          regs: { ext: { gdpr: 1 } },
          user: { ext: { consent: 'kjfdnidasd123sadsd' } }
        }
      };
      const bRequest = spec.buildRequests(request, bidderReqWithGDPR);
      expect(bRequest.data.user.ext.consent).to.equal('kjfdnidasd123sadsd');
      expect(bRequest.data.regs.ext.gdpr).to.equal(1);

      const bRequest2 = spec.buildRequests(request, { ortb2: {} });
      expect(bRequest2.data.regs).to.equal(undefined);
      expect(bRequest2.data.user?.ext?.consent).to.be.undefined;
    });

    it('bid request check: Video params check', function () {
      const bRequest = spec.buildRequests(videoBidRequests, bidderRequest);
      const data = bRequest.data;
      expect(data.imp[0].video).to.be.a('object');
      expect(data.imp[0].video.minduration).to.be.a('number');
      expect(data.imp[0].video.maxduration).to.be.a('number');
      expect(data.imp[0].video.startdelay).to.be.a('number');
      expect(data.imp[0].video.playbackmethod).to.be.an('array');
      expect(data.imp[0].video.api).to.be.an('array');
      expect(data.imp[0].video.protocols).to.be.an('array');
      expect(data.imp[0].video.battr).to.be.an('array');
      expect(data.imp[0].video.minbitrate).to.be.a('number');
      expect(data.imp[0].video.maxbitrate).to.be.a('number');
      // w/h come from playerSize via fillVideoImp (FEATURES.VIDEO=on in production);
      // not asserted here as fillVideoImp is disabled in the feature-off test build
    });

    it('bid request param check: invalid video params are excluded', function () {
      const bRequest = spec.buildRequests(videoBidRequests, bidderRequest);
      const data = bRequest.data;
      expect(data.imp[0].video).to.be.a('object');
      expect(data.imp[0].video.testwrongparam).to.equal(undefined);
      expect(data.imp[0].video.testwrongparam1).to.equal(undefined);
    });

    it('bid request check: params.video merged into imp.video', function () {
      const bRequest = spec.buildRequests(videoBidRequests, bidderRequest);
      // mimes comes from params.video (not mediaTypes.video), should be present
      expect(bRequest.data.imp[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
    });
  });

  describe('user sync check', function () {
    it('user sync url check', function () {
      const syncOptions = { iframeEnabled: true };
      const userSync = spec.getUserSyncs(syncOptions);
      expect(userSync).to.be.an('array').with.length.above(0);
      expect(userSync[0].type).to.equal('iframe');
      expect(userSync[0].url).to.equal('https://cdn.deepintent.com/syncpixel.html');
    });
  });

  describe('response check', function () {
    it('bid response check: valid banner bid response', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      const bResponse = spec.interpretResponse(bannerResponse, bRequest);
      expect(bResponse).to.be.an('array').with.length(1);
      expect(bResponse[0].requestId).to.equal(request[0].bidId);
      expect(bResponse[0].width).to.equal(bannerResponse.body.seatbid[0].bid[0].w);
      expect(bResponse[0].height).to.equal(bannerResponse.body.seatbid[0].bid[0].h);
      expect(bResponse[0].currency).to.equal('USD');
      expect(bResponse[0].netRevenue).to.equal(false);
      expect(bResponse[0].mediaType).to.equal('banner');
      expect(bResponse[0].meta.advertiserDomains).to.deep.equal(['deepintent.com']);
      expect(bResponse[0].ttl).to.equal(300);
      expect(bResponse[0].creativeId).to.equal(bannerResponse.body.seatbid[0].bid[0].crid);
      expect(bResponse[0].dealId).to.equal(bannerResponse.body.seatbid[0].bid[0].dealid);
    });

    it('bid response check: valid video bid response has vastXml set', function () {
      const bRequest = spec.buildRequests(videoBidRequests, bidderRequest);
      const response = spec.interpretResponse(videoBidResponse, bRequest);
      expect(response).to.have.length(1);
      expect(response[0].mediaType).to.equal('video');
      expect(response[0].vastXml).to.equal(videoBidResponse.body.seatbid[0].bid[0].adm);
    });

    it('bid response check: response without mtype returns no bids', function () {
      const bRequest = spec.buildRequests(request, bidderRequest);
      const response = spec.interpretResponse(invalidResponse, bRequest);
      expect(response).to.have.length(0);
    });

    it('bid response check: multi-seatbid response returns bids from all seats', function () {
      const secondBidId = 'second-bid-id-9999';
      const multiRequest = [
        { ...request[0] },
        {
          bidder: 'deepintent',
          bidId: secondBidId,
          mediaTypes: { banner: { sizes: [[728, 90]] } },
          params: { tagId: '100014' }
        }
      ];
      const multiSeatResponse = {
        body: {
          id: 'multi-seat-response',
          seatbid: [
            {
              bid: [{ id: 'bid1', impid: request[0].bidId, price: 1.0, mtype: 1, adm: 'ad1', w: 300, h: 250, crid: 'cr1' }],
              seat: 'seat1'
            },
            {
              bid: [{ id: 'bid2', impid: secondBidId, price: 2.0, mtype: 1, adm: 'ad2', w: 728, h: 90, crid: 'cr2' }],
              seat: 'seat2'
            }
          ]
        }
      };
      const bRequest = spec.buildRequests(multiRequest, bidderRequest);
      const bids = spec.interpretResponse(multiSeatResponse, bRequest);
      expect(bids).to.have.length(2);
      expect(bids[0].requestId).to.equal(request[0].bidId);
      expect(bids[1].requestId).to.equal(secondBidId);
    });
  });

  describe('GPP and coppa', function () {
    it('Request params check with GPP Consent from ortb2', function () {
      const bidderReq = {
        ortb2: { regs: { gpp: 'gpp-string-test', gpp_sid: [5] } }
      };
      const bRequest = spec.buildRequests(request, bidderReq);
      expect(bRequest.data.regs.gpp).to.equal('gpp-string-test');
      expect(bRequest.data.regs.gpp_sid[0]).to.equal(5);
    });

    it('should include coppa flag in bid request if coppa is set via ortb2', function () {
      const bidderReq = { ortb2: { regs: { coppa: 1 } } };
      const bRequest = spec.buildRequests(request, bidderReq);
      expect(bRequest.data.regs.coppa).to.equal(1);
    });
  });

  describe('ortb2 blocking (bcat, badv)', function () {
    it('should add bcat and badv to payload when bidderRequest.ortb2 has them', function () {
      const bidderReq = {
        ortb2: {
          bcat: ['IAB1', 'IAB2'],
          badv: ['example.com']
        }
      };
      const bRequest = spec.buildRequests(request, bidderReq);
      expect(bRequest.data.bcat).to.deep.equal(['IAB1', 'IAB2']);
      expect(bRequest.data.badv).to.deep.equal(['example.com']);
    });

    it('should not add bcat or badv when bidderRequest.ortb2 does not have them', function () {
      const bRequest = spec.buildRequests(request, { ortb2: {} });
      expect(bRequest.data.bcat).to.be.undefined;
      expect(bRequest.data.badv).to.be.undefined;
    });

    it('should NOT use params.bcat or params.badv — ortb2 is the correct channel', function () {
      const requestWithParams = [{
        bidder: 'deepintent',
        bidId: 'test-bid-id',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        params: { tagId: '100013', bcat: ['IAB25'], badv: ['blocked-advertiser.com'] }
      }];
      const bRequest = spec.buildRequests(requestWithParams, { ortb2: {} });
      expect(bRequest.data.bcat).to.be.undefined;
      expect(bRequest.data.badv).to.be.undefined;
    });
  });

  describe('video params deprecation and telemetry', function () {
    let warnStub;

    beforeEach(function () {
      warnStub = sinon.stub(utils, 'logWarn');
    });

    afterEach(function () {
      warnStub.restore();
    });

    it('mediaTypes.video only: no deprecation warning and no telemetry flag', function () {
      const videoOnlyRequest = [{
        bidder: 'deepintent',
        bidId: 'video-only-bid',
        mediaTypes: {
          video: { playerSize: [640, 480], context: 'instream', mimes: ['video/mp4'] }
        },
        params: { tagId: '100013' }
      }];
      const bRequest = spec.buildRequests(videoOnlyRequest, bidderRequest);
      // imp.video is populated by fillVideoImp in production (FEATURES.VIDEO=on);
      // not asserted here as fillVideoImp is disabled in the feature-off test build
      expect(bRequest.data.imp[0].ext.di_pvideo).to.be.undefined;
      expect(warnStub.calledWith(sinon.match(/deprecated/))).to.be.false;
    });

    it('non-empty params.video: deprecation warning fires and telemetry flag set', function () {
      const videoWithParamsRequest = [{
        bidder: 'deepintent',
        bidId: 'video-params-bid',
        mediaTypes: {
          video: { playerSize: [640, 480], context: 'instream' }
        },
        params: {
          tagId: '100013',
          video: { mimes: ['video/mp4'] }
        }
      }];
      const bRequest = spec.buildRequests(videoWithParamsRequest, bidderRequest);
      expect(bRequest.data.imp[0].ext.di_pvideo).to.equal(1);
      expect(warnStub.calledWith(sinon.match(/deprecated/))).to.be.true;
    });

    it('empty params.video object: no warning and no telemetry flag', function () {
      const videoEmptyParamsRequest = [{
        bidder: 'deepintent',
        bidId: 'video-empty-params-bid',
        mediaTypes: {
          video: { playerSize: [640, 480], context: 'instream' }
        },
        params: {
          tagId: '100013',
          video: {}
        }
      }];
      const bRequest = spec.buildRequests(videoEmptyParamsRequest, bidderRequest);
      expect(bRequest.data.imp[0].ext.di_pvideo).to.be.undefined;
      expect(warnStub.calledWith(sinon.match(/deprecated/))).to.be.false;
    });

    it('params.video overrides mediaTypes.video on field conflict (backward compat)', function () {
      const videoConflictRequest = [{
        bidder: 'deepintent',
        bidId: 'video-conflict-bid',
        mediaTypes: {
          video: { playerSize: [640, 480], context: 'instream', mimes: ['video/webm'] }
        },
        params: {
          tagId: '100013',
          video: { mimes: ['video/mp4', 'video/x-flv'] }
        }
      }];
      const bRequest = spec.buildRequests(videoConflictRequest, bidderRequest);
      expect(bRequest.data.imp[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
    });
  });

  describe('deals functionality', function () {
    it('should add PMP deals when valid deals array is provided', function () {
      const requestWithDeals = [{
        bidder: 'deepintent',
        bidId: 'test-bid-id',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        params: { tagId: '100013', deals: ['deal1234', 'deal5678'] }
      }];
      const bRequest = spec.buildRequests(requestWithDeals, bidderRequest);
      const data = bRequest.data;
      expect(data.imp[0].pmp).to.be.an('object');
      expect(data.imp[0].pmp.private_auction).to.equal(0);
      expect(data.imp[0].pmp.deals).to.be.an('array').with.length(2);
      expect(data.imp[0].pmp.deals[0].id).to.equal('deal1234');
      expect(data.imp[0].pmp.deals[1].id).to.equal('deal5678');
    });

    it('should filter out invalid deal IDs', function () {
      const requestWithMixedDeals = [{
        bidder: 'deepintent',
        bidId: 'test-bid-id',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        params: { tagId: '100013', deals: ['abc', 'valid_deal', 12345, null, 'xy'] }
      }];
      const bRequest = spec.buildRequests(requestWithMixedDeals, bidderRequest);
      expect(bRequest.data.imp[0].pmp.deals).to.be.an('array').with.length(1);
      expect(bRequest.data.imp[0].pmp.deals[0].id).to.equal('valid_deal');
    });

    it('should not add pmp when deals is not a valid array', function () {
      const requestWithInvalidDeals = [{
        bidder: 'deepintent',
        bidId: 'test-bid-id',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        params: { tagId: '100013', deals: 'not-an-array' }
      }];
      const bRequest = spec.buildRequests(requestWithInvalidDeals, bidderRequest);
      expect(bRequest.data.imp[0].pmp).to.be.undefined;
    });

    it('should add deal custom targeting', function () {
      const requestWithDctr = [{
        bidder: 'deepintent',
        bidId: 'test-bid-id',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        params: { tagId: '100013', dctr: '  key1=val1  |  key2=val2  |  |  key3=val3  ' }
      }];
      const bRequest = spec.buildRequests(requestWithDctr, bidderRequest);
      expect(bRequest.data.imp[0].ext.key_val).to.equal('key1=val1|key2=val2|key3=val3');
    });

    it('should handle both deals and dctr together', function () {
      const requestWithBoth = [{
        bidder: 'deepintent',
        bidId: 'test-bid-id',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        params: { tagId: '100013', deals: ['deal1234'], dctr: 'key1=val1|key2=val2' }
      }];
      const bRequest = spec.buildRequests(requestWithBoth, bidderRequest);
      expect(bRequest.data.imp[0].pmp.deals[0].id).to.equal('deal1234');
      expect(bRequest.data.imp[0].ext.key_val).to.equal('key1=val1|key2=val2');
    });
  });
});
