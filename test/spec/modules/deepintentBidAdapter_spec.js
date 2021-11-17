import {expect} from 'chai';
import {spec} from 'modules/deepintentBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('Deepintent adapter', function () {
  let request, videoBidRequests;
  let bannerResponse, videoBidResponse, invalidResponse;

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
    videoBidRequests =
    [
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
            'dealId': 'dee_12312stdszzsx'
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
            'adm': '<VAST version="3.0"><Ad id="601364"><InLine><AdSystem>Acudeo Compatible</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Impression><![CDATA[http://172.16.4.213/AdServer/AdDisplayTrackerServlet?operId=1&pubId=5890&siteId=47163&adId=1405268&adType=13&adServerId=243&kefact=70.000000&kaxefact=70.000000&kadNetFrequecy=0&kadwidth=0&kadheight=0&kadsizeid=97&kltstamp=1529929473&indirectAdId=0&adServerOptimizerId=2&ranreq=0.1&kpbmtpfact=100.000000&dcId=1&tldId=0&passback=0&svr=MADS1107&ekefact=Ad8wW91TCwCmdG0jlfjXn7Tyzh20hnTVx-m5DoNSep-RXGDr&ekaxefact=Ad8wWwRUCwAGir4Zzl1eF0bKiC-qrCV0D0yp_eE7YizB_BQk&ekpbmtpfact=Ad8wWxRUCwD7qgzwwPE2LnS5-Ou19uO5amJl1YT6-XVFvQ41&imprId=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&oid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&crID=creative-1_1_2&ucrid=160175026529250297&campaignId=17050&creativeId=0&pctr=0.000000&wDSPByrId=511&wDspId=6&wbId=0&wrId=0&wAdvID=3170&isRTB=1&rtbId=EBCA079F-8D7C-45B8-B733-92951F670AA1&pmZoneId=zone1&pageURL=www.yahoo.com&lpu=ae.com]]></Impression><Impression>https://dsptracker.com/{PSPM}</Impression><Error><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&er=[ERRORCODE]]]></Error><Error><![CDATA[https://Errortrack.com?p=1234&er=[ERRORCODE]]]></Error><Creatives><Creative AdID="601364"><Linear skipoffset="20%"><TrackingEvents><Tracking event="close"><![CDATA[https://mytracking.com/linear/close]]></Tracking><Tracking event="skip"><![CDATA[https://mytracking.com/linear/skip]]></Tracking><Tracking event="creativeView"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=1]]></Tracking><Tracking event="start"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=2]]></Tracking><Tracking event="midpoint"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=4]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=5]]></Tracking><Tracking event="complete"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=6]]></Tracking></TrackingEvents><Duration>00:00:04</Duration><VideoClicks><ClickTracking><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=99]]></ClickTracking><ClickThrough>https://www.deepintent.com</ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="500" width="400" height="300" scalable="true" maintainAspectRatio="true"><![CDATA[https://staging.deepintent.com:8443/video/Shashank/mediaFileHost/media/mp4-sample-2.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
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
    it('should check for context if video is present', function() {
      let bid = {
          bidder: 'deepintent',
          params: {
            tagId: '12345',
            video: {
              mimes: ['video/mp4', 'video/x-flv'],
              skippable: true,
            }
          },
          mediaTypes: {
            video: {
              playerSize: [640, 480],
              context: 'instream'
            }
          },
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });
    it('should error out if context is not present and is Video', function() {
      let bid = {
          bidder: 'deepintent',
          params: {
            tagId: '12345',
            video: {
              mimes: ['video/mp4', 'video/x-flv'],
              skippable: true,
            }
          },
          mediaTypes: {
            video: {
              playerSize: [640, 480]
            }
          },
        },
        isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    })
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
    it('bid request check: position check', function () {
      let bRequest = spec.buildRequests(request);
      let data = JSON.parse(bRequest.data);
      expect(data.imp[0].banner.pos).to.equal(1);
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
    });
    it('bid request check: CCPA Check', function () {
      let bidRequest = {
        uspConsent: '1NYN'
      };
      let bRequest = spec.buildRequests(request, bidRequest);
      let data = JSON.parse(bRequest.data);
      expect(data.regs.ext.us_privacy).to.equal('1NYN');
      let bidRequest2 = {};
      let bRequest2 = spec.buildRequests(request, bidRequest2);
      let data2 = JSON.parse(bRequest2.data);
      expect(data2.regs).to.equal(undefined);
    });
    it('bid Request check: GDPR Check', function () {
      let bidRequest = {
        gdprConsent: {
          consentString: 'kjfdnidasd123sadsd',
          gdprApplies: true
        }
      };
      let bRequest = spec.buildRequests(request, bidRequest);
      let data = JSON.parse(bRequest.data);
      expect(data.user.ext.consent).to.equal('kjfdnidasd123sadsd');
      expect(data.regs.ext.gdpr).to.equal(1);
      let bidRequest2 = {};
      let bRequest2 = spec.buildRequests(request, bidRequest2);
      let data2 = JSON.parse(bRequest2.data);
      expect(data2.regs).to.equal(undefined);
      expect(data2.user.ext).to.equal(undefined);
    });
    it('bid request check: Video params check ', function() {
      let bRequest = spec.buildRequests(videoBidRequests);
      let data = JSON.parse(bRequest.data);
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
      expect(data.imp[0].video.w).to.be.a('number');
    });
    it('bid request param check : invalid video params', function() {
      let bRequest = spec.buildRequests(videoBidRequests);
      let data = JSON.parse(bRequest.data);
      expect(data.imp[0].video).to.be.a('object');
      expect(data.imp[0].video.testwrongparam).to.equal(undefined);
      expect(data.imp[0].video.testwrongparam1).to.equal(undefined);
    });
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
      expect(bResponse[0].mediaType).to.equal('banner');
      expect(bResponse[0].meta.advertiserDomains).to.deep.equal(['deepintent.com']);
      expect(bResponse[0].ttl).to.equal(300);
      expect(bResponse[0].creativeId).to.equal(bannerResponse.body.seatbid[0].bid[0].crid);
      expect(bResponse[0].dealId).to.equal(bannerResponse.body.seatbid[0].bid[0].dealId);
    });
    it('bid response check: valid video bid response', function() {
      let request = spec.buildRequests(videoBidRequests);
      let response = spec.interpretResponse(videoBidResponse, request);
      expect(response[0].mediaType).to.equal('video');
      expect(response[0].vastXml).to.not.equal(undefined);
    });
    it('invalid bid response check ', function() {
      let bRequest = spec.buildRequests(request);
      let response = spec.interpretResponse(invalidResponse, bRequest);
      expect(response[0].mediaType).to.equal(undefined);
    });
    it('invalid bid response check ', function() {
      let bRequest = spec.buildRequests(videoBidRequests);
      let response = spec.interpretResponse(invalidResponse, bRequest);
      expect(response[0].mediaType).to.equal(undefined);
    });
  })
});
