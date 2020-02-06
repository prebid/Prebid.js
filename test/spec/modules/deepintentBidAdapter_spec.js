import {expect} from 'chai';
import {spec} from 'modules/deepintentBidAdapter';
import * as utils from '../../../src/utils';

describe('Deepintent adapter', function () {
  let request;
  let bannerResponse;

  beforeEach(function () {
    request = [
      {
        bidder: 'deepintent',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          tagId: '100013',
          w: 728,
          h: 90,
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
    bannerResponse = {
      'body': {
        'id': '303e1fae-9677-41e2-9a92-15a23445363f',
        'seatbid': [{
          'bid': [{
            'id': '11447bb1-a266-470d-b0d7-8810f5b1b75f',
            'impid': 'a7e92b9b-d9db-4de8-9c3f-f90737335445',
            'price': 0.6,
            'adid': '10001',
            'adm': "<span id='deepintent_wrapper_a7e92b9b-d9db-4de8-9c3f-f90737335445' onclick=DeepIntentExecuteClicks('%%CLICK_URL_UNESC%%')><span id='deepintent_wrapper_span_9-1bfd-4764-b4cf-0bb1a74e554e'><a href='https://test-beacon.deepintent.com/click?id=11447bb1-a266-470d-b0d7-8810f5b1b75f&ts=1565252378497&r=http%3A%2F%2Ftest.com' target='_blank'><img src='https://storage.googleapis.com/deepintent-test/adv/10001/asset/a640bcb5c0d5416096290d1c1097a1e9.jpg'></img></a></span><noscript class=\"MOAT-deepintentdisplay440800993657?moatClientLevel1=10001&amp;moatClientLevel2=103389&amp;moatClientLevel3=13665&amp;moatClientSlicer1=washingtonpost.com&amp;zMoatBID=11447bb1-a266-470d-b0d7-8810f5b1b75f&amp;zMoatTIME=1565252378495&amp;zMoatCGRP=530\"></noscript>\r\n<script src=\"https://z.moatads.com/deepintentdisplay440800993657/moatad.js#moatClientLevel1=10001&moatClientLevel2=103389&moatClientLevel3=13665&moatClientSlicer1=washingtonpost.com&zMoatBID=11447bb1-a266-470d-b0d7-8810f5b1b75f&zMoatTIME=1565252378495&zMoatCGRP=530\" type=\"text/javascript\"></script><img src='https://tracking.com' height='0px' width='0px' style='display:none'></img></span><script type='text/javascript'>window.DeepIntentExecuteClicks=window.DeepIntentExecuteClicks||function(e){if(e)for(var n=e.split(','),t=0;t<n.length;t++)(new Image).src=n[t]};</script><img src='https://test-beacon.deepintent.com/impression?id=11447bb1-a266-470d-b0d7-8810f5b1b75f&ts=1565252378497&wp=%%WINNING_PRICE%%' height='0px' width='0px' style='display:none'></img><iframe src='https://cdn.deepintent.com/sync/adx.html' width='0' height='0' style='display:none;'></iframe>",
            'adomain': ['deepintent.com'],
            'cid': '103389',
            'crid': '13665',
            'w': 300,
            'h': 250,
            'dealId': 'dee_12312stdszzsx'
          }],
          'seat': '10000'
        }],
        'bidid': '0b08b09f-aaa1-4c14-b1c8-7debb1a7c1cd'
      }
    }
  });

  describe('validations', function () {
    it('validBid : tagId is passed', function () {
      let bid = {
          bidder: 'deepintent',
          params: {
            tagId: '1232'
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(true);
    });
    it('invalidBid : tagId is not passed', function () {
      let bid = {
          bidder: 'deepintent',
          params: {
            h: 200,
            w: 300
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
    it('invalidBid : tagId is not a string', function () {
      let bid = {
          bidder: 'deepintent',
          params: {
            tagId: 12345
          }
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equals(false);
    });
  });
  describe('request check', function () {
    it('unmutaable bid request check', function () {
      let oRequest = utils.deepClone(request),
        bidRequest = spec.buildRequests(request);
      expect(request).to.deep.equal(oRequest);
    });
    it('bidder connection check', function () {
      let bRequest = spec.buildRequests(request);
      expect(bRequest.url).to.equal('https://prebid.deepintent.com/prebid');
      expect(bRequest.method).to.equal('POST');
      expect(bRequest.options.contentType).to.equal('application/json');
    });
    it('bid request check : Device', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.device.ua).to.be.a('string');
      expect(data.device.js).to.equal(1);
      expect(data.device.dnt).to.be.a('number');
      expect(data.device.h).to.be.a('number');
      expect(data.device.w).to.be.a('number');
    });
    it('bid request check : Impression', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.at).to.equal(1); // auction type
      expect(data.imp[0].id).to.equal(request[0].bidId);
      expect(data.imp[0].tagid).to.equal('100013');
    });
    it('bid request check : ad size', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.imp[0].banner).to.be.a('object');
      expect(data.imp[0].banner.w).to.equal(300);
      expect(data.imp[0].banner.h).to.equal(250);
    });
    it('bid request check : custom params', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.imp[0].ext).to.be.a('object');
      expect(data.imp[0].ext.deepintent.position).to.equal('right-box');
    });
    it('bid request check: displaymanager check', function() {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.imp[0].displaymanager).to.equal('di_prebid');
      expect(data.imp[0].displaymanagerver).to.equal('1.0.0');
    });
    it('bid request check: user object check', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.user).to.be.a('object');
      expect(data.user.id).to.equal('di_testuid');
      expect(data.user.buyeruid).to.equal('di_testbuyeruid');
      expect(data.user.yob).to.equal(2002);
      expect(data.user.gender).to.equal('F');
    })
  });
  describe('user sync check', function () {
    it('user sync url check', function () {
      let syncOptions = {
        iframeEnabled: true
      };
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync).to.be.an('array').with.length.above(0);
      expect(userSync[0].type).to.equal('iframe');
      expect(userSync[0].url).to.equal('https://cdn.deepintent.com/syncpixel.html');
    });
  });
  describe('response check', function () {
    it('bid response check: valid bid response', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      let bResponse = spec.interpretResponse(bannerResponse, request);
      expect(bResponse).to.be.an('array').with.length.above(0);
      expect(bResponse[0].requestId).to.equal(bannerResponse.body.seatbid[0].bid[0].impid);
      expect(bResponse[0].width).to.equal(bannerResponse.body.seatbid[0].bid[0].w);
      expect(bResponse[0].height).to.equal(bannerResponse.body.seatbid[0].bid[0].h);
      expect(bResponse[0].currency).to.equal('USD');
      expect(bResponse[0].netRevenue).to.equal(false);
      expect(bResponse[0].ttl).to.equal(300);
      expect(bResponse[0].creativeId).to.equal(bannerResponse.body.seatbid[0].bid[0].crid);
      expect(bResponse[0].dealId).to.equal(bannerResponse.body.seatbid[0].bid[0].dealId);
    });
  })
});
