
import { expect } from 'chai';
import { spec } from 'modules/cosmosBidAdapter';
import * as utils from 'src/utils';
const constants = require('src/constants.json');

describe('Cosmos adapter', function () {
  let bidRequests;
  let videoBidRequests;
  let bidResponses;
  let bannerBidResponse;
  let videoBidResponse;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'cosmos',
        mediaType: 'video',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        params: {
          publisherId: '1001',
          tagId: 1,
          currency: 'AUD',
          geo: {
            lat: '12.3',
            lon: '23.7',
          }
        },
        sizes: [[300, 250], [300, 600]]
      }
    ];

    videoBidRequests =
      [
        {
          code: 'video1',
          mediaType: 'video',
          mediaTypes: {
            video: {
              playerSize: [640, 480],
              context: 'instream'
            }
          },
          bidder: 'cosmos',
          params: {
            publisherId: 1001,
            tagId: 1,
            video: {
              mimes: ['video/mp4', 'video/x-flv'],
              skippable: true,
              minduration: 5,
              maxduration: 30
            }
          }
        }
      ];

    bidResponses = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'adm': '<div style=\"background-color:#3399ff;\"><p style=\"color:#ff0000;font-size:30px;font-family:Courier, monospace;\">COSMOS<span style=\"color:white;font-style:italic;font-size:20px;\">\"Connecting Advertisers and Publishers directly\"</span></p></div><script src=\"https://track.cosmoshq.com/event?data=%7B%22id%22%3A%2216c8a49b-3f40-4000-870c-0c34c7fc8d00%22%2C%22bid%22%3A%2282DAAE22-FF66-4FAB-84AB-347B0C5CD02C%22%2C%22ts%22%3A%2220190813092302%22%2C%22pid%22%3A1001%2C%22plcid%22%3A1%2C%22aid%22%3A1%2C%22did%22%3A1%2C%22cid%22%3A%2222918%22%2C%22af%22%3A2%2C%22at%22%3A1%2C%22w%22%3A300%2C%22h%22%3A250%2C%22crid%22%3A%22v55jutrh%22%2C%22pp%22%3A1.858309%2C%22cp%22%3A1.858309%2C%22mg%22%3A0%7D&type=1\" type=\"text/javascript\"></script>',
            'adomain': ['amazon.com'],
            'iurl': 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/vgl908z.png',
            'cid': '22918',
            'crid': 'v55jutrh',
            'h': 250,
            'w': 300,
            'ext': {
              'prebid': {
                'type': 'banner'
              }
            }
          }]
        }]
      }
    };

    bannerBidResponse = {
      'body': {
        'id': '16c8a49b-3f40-4000-870c-0c34c7fc8d00',
        'seatbid': [{
          'bid': [{
            'id': '82DAAE22-FF66-4FAB-84AB-347B0C5CD02C',
            'impid': '26e9904919057c',
            'price': 1.858309,
            'adm': '<div style=\"background-color:#3399ff;\"><p style=\"color:#ff0000;font-size:30px;font-family:Courier, monospace;\">COSMOS<span style=\"color:white;font-style:italic;font-size:20px;\">\"Connecting Advertisers and Publishers directly\"</span></p></div><script src=\"https://track.cosmoshq.com/event?data=%7B%22id%22%3A%2216c8a49b-3f40-4000-870c-0c34c7fc8d00%22%2C%22bid%22%3A%2282DAAE22-FF66-4FAB-84AB-347B0C5CD02C%22%2C%22ts%22%3A%2220190813092302%22%2C%22pid%22%3A1001%2C%22plcid%22%3A1%2C%22aid%22%3A1%2C%22did%22%3A1%2C%22cid%22%3A%2222918%22%2C%22af%22%3A2%2C%22at%22%3A1%2C%22w%22%3A300%2C%22h%22%3A250%2C%22crid%22%3A%22v55jutrh%22%2C%22pp%22%3A1.858309%2C%22cp%22%3A1.858309%2C%22mg%22%3A0%7D&type=1\" type=\"text/javascript\"></script>',
            'adid': 'v55jutrh',
            'adomain': ['febreze.com'],
            'iurl': 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/vgl908z.png',
            'cid': '22918',
            'crid': 'v55jutrh',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              }
            }
          }],
          'seat': 'zeta'
        }]
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
            'adm': '<VAST version=\"3.0\"><Ad id=\"601364\"><InLine><AdSystem>Acudeo Compatible</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Impression><![CDATA[http://172.16.4.213/AdServer/AdDisplayTrackerServlet?operId=1&pubId=5890&siteId=47163&adId=1405268&adType=13&adServerId=243&kefact=70.000000&kaxefact=70.000000&kadNetFrequecy=0&kadwidth=0&kadheight=0&kadsizeid=97&kltstamp=1529929473&indirectAdId=0&adServerOptimizerId=2&ranreq=0.1&kpbmtpfact=100.000000&dcId=1&tldId=0&passback=0&svr=MADS1107&ekefact=Ad8wW91TCwCmdG0jlfjXn7Tyzh20hnTVx-m5DoNSep-RXGDr&ekaxefact=Ad8wWwRUCwAGir4Zzl1eF0bKiC-qrCV0D0yp_eE7YizB_BQk&ekpbmtpfact=Ad8wWxRUCwD7qgzwwPE2LnS5-Ou19uO5amJl1YT6-XVFvQ41&imprId=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&oid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&crID=creative-1_1_2&ucrid=160175026529250297&campaignId=17050&creativeId=0&pctr=0.000000&wDSPByrId=511&wDspId=6&wbId=0&wrId=0&wAdvID=3170&isRTB=1&rtbId=EBCA079F-8D7C-45B8-B733-92951F670AA1&pmZoneId=zone1&pageURL=www.yahoo.com&lpu=ae.com]]></Impression><Impression>https://dsptracker.com/{PSPM}</Impression><Error><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&er=[ERRORCODE]]]></Error><Error><![CDATA[https://Errortrack.com?p=1234&er=[ERRORCODE]]]></Error><Creatives><Creative AdID=\"601364\"><Linear skipoffset=\"20%\"><TrackingEvents><Tracking event=\"close\"><![CDATA[https://mytracking.com/linear/close]]></Tracking><Tracking event=\"skip\"><![CDATA[https://mytracking.com/linear/skip]]></Tracking><Tracking event=\"creativeView\"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=1]]></Tracking><Tracking event=\"start\"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=2]]></Tracking><Tracking event=\"midpoint\"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=3]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=4]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=5]]></Tracking><Tracking event=\"complete\"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=6]]></Tracking></TrackingEvents><Duration>00:00:04</Duration><VideoClicks><ClickTracking><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=99]]></ClickTracking><ClickThrough>https://www.cosmos.com</ClickThrough></VideoClicks><MediaFiles><MediaFile delivery=\"progressive\" type=\"video/mp4\" bitrate=\"500\" width=\"400\" height=\"300\" scalable=\"true\" maintainAspectRatio=\"true\"><![CDATA[https://stagingnyc.cosmos.com:8443/video/Shashank/mediaFileHost/media/mp4-sample-2.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
            'h': 250,
            'w': 300,
            'ext': {
              'prebid': {
                'type': 'video'
              }
            }
          }]
        }]
      }
    };
  });

  describe('implementation', function () {
    describe('Bid validations', function () {
      it('valid bid case', function () {
        let validBid = {
            bidder: 'cosmos',
            params: {
              publisherId: 1001,
              tagId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });

      it('invalid bid case: publisherId not passed', function () {
        let validBid = {
            bidder: 'cosmos',
            params: {
              tagId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('invalid bid case: publisherId is not number', function () {
        let validBid = {
            bidder: 'cosmos',
            params: {
              publisherId: '301',
              tagId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('valid bid case: tagId is not passed', function () {
        let validBid = {
            bidder: 'cosmos',
            params: {
              publisherId: 1001
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });
    });

    describe('Request formation', function () {
      it('buildRequests function should not modify original bidRequests object', function () {
        let originalBidRequests = utils.deepClone(bidRequests);
        let request = spec.buildRequests(bidRequests);
        expect(bidRequests).to.deep.equal(originalBidRequests);
      });

      it('Endpoint checking', function () {
        let request = spec.buildRequests(bidRequests);
        expect(request[0].url).to.equal('//bid.cosmoshq.com/openrtb2/bids');
        expect(request[0].method).to.equal('POST');
      });

      it('Request params check', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.imp[0].tagid).to.equal('1'); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
      });

      it('Request params check: without tagId', function () {
        delete bidRequests[0].params.tagId;
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.imp[0].tagid).to.equal(undefined); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
      });

      it('Request params multi size format object check', function () {
        let bidRequests = [
          {
            bidder: 'cosmos',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]],
              }
            },
            params: {
              publisherId: 1001,
              tagId: 1,
              currency: 'AUD'
            },
            sizes: [[300, 250], [300, 600]]
          }
        ];
        /* case 1 - size passed in adslot */
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height

        /* case 2 - size passed in adslot as well as in sizes array */
        bidRequests[0].sizes = [[300, 600], [300, 250]];
        bidRequests[0].mediaTypes = {
          banner: {
            sizes: [[300, 600], [300, 250]]
          }
        };
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request[0].data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(600); // height

        /* case 3 - size passed in sizes but not in adslot */
        bidRequests[0].params.tagId = 1;
        bidRequests[0].sizes = [[300, 250], [300, 600]];
        bidRequests[0].mediaTypes = {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        };
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request[0].data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].banner.format).exist.and.to.be.an('array');
        expect(data.imp[0].banner.format[0]).exist.and.to.be.an('object');
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height
      });

      it('Request params currency check', function () {
        let bidRequest = [
          {
            bidder: 'cosmos',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]],
              }
            },
            params: {
              publisherId: 1001,
              tagId: 1,
              currency: 'AUD'
            },
            sizes: [[300, 250], [300, 600]]
          }
        ];

        /* case 1 -
            currency specified in adunits
            output: imp[0] use currency specified in bidRequests[0].params.currency

        */
        let request = spec.buildRequests(bidRequest);
        let data = JSON.parse(request[0].data);
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);

        /* case 2 -
            currency specified in adunit
            output: imp[0] use default currency - USD

        */
        delete bidRequest[0].params.currency;
        request = spec.buildRequests(bidRequest);
        data = JSON.parse(request[0].data);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('Request params check for video ad', function () {
        let request = spec.buildRequests(videoBidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].tagid).to.equal('1');
        expect(data.imp[0]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['mimes'][0]).to.equal(videoBidRequests[0].params.video['mimes'][0]);
        expect(data.imp[0]['video']['mimes'][1]).to.equal(videoBidRequests[0].params.video['mimes'][1]);
        expect(data.imp[0]['video']['minduration']).to.equal(videoBidRequests[0].params.video['minduration']);
        expect(data.imp[0]['video']['maxduration']).to.equal(videoBidRequests[0].params.video['maxduration']);
        expect(data.imp[0]['video']['w']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.imp[0]['video']['h']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[1]);
      });

      describe('Response checking', function () {
        it('should check for valid response values', function () {
          let request = spec.buildRequests(bidRequests);
          let data = JSON.parse(request[0].data);
          let response = spec.interpretResponse(bidResponses, request[0]);
          expect(response).to.be.an('array').with.length.above(0);
          expect(response[0].requestId).to.equal(bidResponses.body.seatbid[0].bid[0].impid);
          expect(response[0].cpm).to.equal((bidResponses.body.seatbid[0].bid[0].price).toFixed(2));
          expect(response[0].width).to.equal(bidResponses.body.seatbid[0].bid[0].w);
          expect(response[0].height).to.equal(bidResponses.body.seatbid[0].bid[0].h);
          if (bidResponses.body.seatbid[0].bid[0].crid) {
            expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].crid);
          } else {
            expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].id);
          }
          expect(response[0].dealId).to.equal(bidResponses.body.seatbid[0].bid[0].dealid);
          expect(response[0].currency).to.equal('USD');
          expect(response[0].netRevenue).to.equal(false);
          expect(response[0].ttl).to.equal(300);
        });
      });
    });
  });
});
