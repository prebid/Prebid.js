import { expect } from 'chai';
import { spec } from 'modules/lemmaDigitalBidAdapter.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
const constants = require('src/constants.js');

describe('lemmaDigitalBidAdapter', function () {
  let bidRequests;
  let videoBidRequests;
  let bidResponses;
  let videoBidResponse;
  let schainConfig;
  beforeEach(function () {
    schainConfig = {
      'complete': 0,
      'nodes': [
        {
          'asi': 'mobupps.com',
          'sid': 'c74d97b01eae257e44aa9d5bade97baf5149',
          'rid': '79c25703ad5935b0b23b66d210dad1f3',
          'hp': 1
        },
        {
          'asi': 'lemmatechnologies.com',
          'sid': '975',
          'rid': 'a455157a-a1fb-11ed-a0e4-d08e79f7ace0',
          'hp': 1
        }
      ]
    };
    bidRequests = [{
      bidder: 'lemmadigital',
      bidId: '22bddb28db77d',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600]
          ],
        }
      },
      params: {
        pubId: 1001,
        adunitId: 1,
        currency: 'AUD',
        bidFloor: 1.3,
        geo: {
          lat: '12.3',
          lon: '23.7',
        },
        banner: {
          w: 300,
          h: 250,
        },
        tmax: 300,
        bcat: ['IAB-26']
      },
      sizes: [
        [300, 250],
        [300, 600]
      ],
      schain: schainConfig
    }];
    videoBidRequests = [{
      code: 'video1',
      mediaTypes: {
        video: {
          playerSize: [640, 480],
          context: 'instream'
        }
      },
      bidder: 'lemmadigital',
      bidId: '22bddb28db77d',
      params: {
        pubId: 1001,
        adunitId: 1,
        bidFloor: 1.3,
        tmax: 300,
        bcat: ['IAB-26'],
        video: {
          mimes: ['video/mp4', 'video/x-flv'],
          skippable: true,
          minduration: 5,
          maxduration: 30
        }
      },
      schain: schainConfig
    }];
    bidResponses = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'adm': '<div style="background-color:#3399ff;"><p style="color:#ff0000;font-size:30px;font-family:Courier, monospace;">lemma<span style="color:white;font-style:italic;font-size:20px;">"Connecting Advertisers and Publishers directly"</span></p></div><script src="https://track.lemmahq.com/event?data=%7B%22id%22%3A%2216c8a49b-3f40-4000-870c-0c34c7fc8d00%22%2C%22bid%22%3A%2282DAAE22-FF66-4FAB-84AB-347B0C5CD02C%22%2C%22ts%22%3A%2220190813092302%22%2C%22pid%22%3A1001%2C%22plcid%22%3A1%2C%22aid%22%3A1%2C%22did%22%3A1%2C%22cid%22%3A%2222918%22%2C%22af%22%3A2%2C%22at%22%3A1%2C%22w%22%3A300%2C%22h%22%3A250%2C%22crid%22%3A%22v55jutrh%22%2C%22pp%22%3A1.858309%2C%22cp%22%3A1.858309%2C%22mg%22%3A0%7D&type=1" type="text/javascript"></script>',
            'adomain': ['amazon.com'],
            'iurl': 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/vgl908z.png',
            'cid': '22918',
            'crid': 'v55jutrh',
            'dealid': 'ASEA-MS-KLY-TTD-DESKTOP-ID-VID-6S-030420',
            'h': 250,
            'w': 300,
            'ext': {}
          }]
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
            'adm': '<VAST version="3.0"><Ad id="601364"><InLine><AdSystem>Acudeo Compatible</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Creatives><Creative AdID="601364"><Linear skipoffset="20% "><TrackingEvents><Tracking event="close"><![CDATA[https://mytracking.com/linear/close]]></Tracking><Tracking event="skip"><![CDATA[https://mytracking.com/linear/skip]]></Tracking><MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="500" width="400" height="300" scalable="true" maintainAspectRatio="true"><![CDATA[https://localhost/lemma.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
            'adomain': ['amazon.com'],
            'iurl': 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/vgl908z.png',
            'cid': '22918',
            'crid': 'v55jutrh',
            'dealid': 'ASEA-MS-KLY-TTD-DESKTOP-ID-VID-6S-030420',
            'h': 250,
            'w': 300,
            'ext': {}
          }]
        }]
      }
    };
  });
  describe('implementation', function () {
    describe('Bid validations', function () {
      it('valid bid case', function () {
        let validBid = {
            bidder: 'lemmadigital',
            params: {
              pubId: 1001,
              adunitId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });
      it('invalid bid case', function () {
        let isValid = spec.isBidRequestValid();
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: pubId not passed', function () {
        let validBid = {
            bidder: 'lemmadigital',
            params: {
              adunitId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: pubId is not number', function () {
        let validBid = {
            bidder: 'lemmadigital',
            params: {
              pubId: '301',
              adunitId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: adunitId is not passed', function () {
        let validBid = {
            bidder: 'lemmadigital',
            params: {
              pubId: 1001
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: video bid request mimes is not passed', function () {
        let validBid = {
            bidder: 'lemmadigital',
            params: {
              pubId: 1001,
              adunitId: 1,
              video: {
                skippable: true,
                minduration: 5,
                maxduration: 30
              }
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
        validBid.params.video.mimes = [];
        isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
    });
    describe('Request formation', function () {
      it('bidRequest check empty', function () {
        let bidRequests = [];
        let request = spec.buildRequests(bidRequests);
        expect(request).to.equal(undefined);
      });
      it('buildRequests function should not modify original bidRequests object', function () {
        let originalBidRequests = utils.deepClone(bidRequests);
        let request = spec.buildRequests(bidRequests);
        expect(bidRequests).to.deep.equal(originalBidRequests);
      });
      it('bidRequest imp array check empty', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        data.imp = [];
        expect(data.imp.length).to.equal(0);
      });
      it('Endpoint checking', function () {
        let request = spec.buildRequests(bidRequests);
        expect(request.url).to.equal('https://bid.lemmadigital.com/lemma/servad?pid=1001&aid=1');
        expect(request.method).to.equal('POST');
      });
      it('Request params check', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.pubId.toString()); // publisher Id
        expect(data.imp[0].tagid).to.equal('1'); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
        expect(data.imp[0].bidfloor).to.equal(bidRequests[0].params.bidFloor);
        expect(data.source.ext.schain).to.deep.equal(bidRequests[0].schain);
      });

      it('Set sizes from mediaTypes object', function () {
        let newBannerRequest = utils.deepClone(bidRequests);
        delete newBannerRequest[0].sizes;
        let request = spec.buildRequests(newBannerRequest);
        let data = JSON.parse(request.data);
        expect(data.sizes).to.equal(undefined);
      });
      it('Check request banner object present', function () {
        let newBannerRequest = utils.deepClone(bidRequests);
        let request = spec.buildRequests(newBannerRequest);
        let data = JSON.parse(request.data);
        expect(data.banner).to.deep.equal(undefined);
      });
      it('Check device, source object not present', function () {
        let newBannerRequest = utils.deepClone(bidRequests);
        delete newBannerRequest[0].schain;
        let request = spec.buildRequests(newBannerRequest);
        let data = JSON.parse(request.data);
        delete data.device;
        delete data.source;
        expect(data.source).to.equal(undefined);
        expect(data.device).to.equal(undefined);
      });
      it('Set content from config, set site.content', function () {
        let sandbox = sinon.sandbox.create();
        const content = {
          'id': 'alpha-numeric-id'
        };
        sandbox.stub(config, 'getConfig').callsFake((key) => {
          var config = {
            content: content
          };
          return config[key];
        });
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.site.content).to.deep.equal(content);
        sandbox.restore();
      });
      it('Set content from config, set app.content', function () {
        let bidRequest = [{
          bidder: 'lemmadigital',
          params: {
            pubId: 1001,
            adunitId: 1,
            video: {
              skippable: true,
              minduration: 5,
              maxduration: 30
            },
            app: {
              id: 'e0977d04e6bafece57b4b6e93314f10a',
              name: 'AMC',
              bundle: 'com.roku.amc',
              storeurl: 'https://channelstore.roku.com/details/12716/amc',
              cat: [
                'IAB-26'
              ],
              publisher: {
                'id': '975'
              }
            },
          }
        }];
        let sandbox = sinon.sandbox.create();
        const content = {
          'id': 'alpha-numeric-id'
        };
        sandbox.stub(config, 'getConfig').callsFake((key) => {
          var config = {
            content: content
          };
          return config[key];
        });
        let request = spec.buildRequests(bidRequest);
        let data = JSON.parse(request.data);
        expect(data.app.content).to.deep.equal(content);
        sandbox.restore();
      });
      it('Set tmax from requestBids method', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.tmax).to.deep.equal(300);
      });
      it('Request params check without mediaTypes object', function () {
        let bidRequests = [{
          bidder: 'lemmadigital',
          params: {
            pubId: 1001,
            adunitId: 1,
            currency: 'AUD'
          },
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }];
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].banner.format).exist.and.to.be.an('array');
        expect(data.imp[0].banner.format[0]).exist.and.to.be.an('object');
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width
        expect(data.imp[0].banner.format[0].h).to.equal(600); // height
      });
      it('Request params check: without tagId', function () {
        delete bidRequests[0].params.adunitId;
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.pubId.toString()); // publisher Id
        expect(data.imp[0].tagid).to.equal(undefined); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
        expect(data.imp[0].bidfloor).to.equal(bidRequests[0].params.bidFloor);
      });
      it('Request params multi size format object check', function () {
        let bidRequests = [{
          bidder: 'lemmadigital',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [300, 600]
              ],
            }
          },
          params: {
            pubId: 1001,
            adunitId: 1,
            currency: 'AUD'
          },
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }];
        /* case 1 - size passed in adslot */
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        /* case 2 - size passed in adslot as well as in sizes array */
        bidRequests[0].sizes = [
          [300, 600],
          [300, 250]
        ];
        bidRequests[0].mediaTypes = {
          banner: {
            sizes: [
              [300, 600],
              [300, 250]
            ]
          }
        };
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request.data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(600); // height
        /* case 3 - size passed in sizes but not in adslot */
        bidRequests[0].params.adunitId = 1;
        bidRequests[0].sizes = [
          [300, 250],
          [300, 600]
        ];
        bidRequests[0].mediaTypes = {
          banner: {
            sizes: [
              [300, 250],
              [300, 600]
            ]
          }
        };
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request.data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].banner.format).exist.and.to.be.an('array');
        expect(data.imp[0].banner.format[0]).exist.and.to.be.an('object');
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height
      });
      it('Request params currency check', function () {
        let bidRequest = [{
          bidder: 'lemmadigital',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [300, 600]
              ],
            }
          },
          params: {
            pubId: 1001,
            adunitId: 1,
            currency: 'AUD'
          },
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }];
        /* case 1 -
      currency specified in adunits
      output: imp[0] use currency specified in bidRequests[0].params.currency
        */
        let request = spec.buildRequests(bidRequest);
        let data = JSON.parse(request.data);
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
        /* case 2 -
      currency specified in adunit
      output: imp[0] use default currency - USD
      */
        delete bidRequest[0].params.currency;
        request = spec.buildRequests(bidRequest);
        data = JSON.parse(request.data);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });
      it('Request params check for video ad', function () {
        let request = spec.buildRequests(videoBidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].tagid).to.equal('1');
        expect(data.imp[0]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['mimes'][0]).to.equal(videoBidRequests[0].params.video['mimes'][0]);
        expect(data.imp[0]['video']['mimes'][1]).to.equal(videoBidRequests[0].params.video['mimes'][1]);
        expect(data.imp[0]['video']['minduration']).to.equal(videoBidRequests[0].params.video['minduration']);
        expect(data.imp[0]['video']['maxduration']).to.equal(videoBidRequests[0].params.video['maxduration']);
        expect(data.imp[0]['video']['w']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.imp[0]['video']['h']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[1]);
        expect(data.source.ext.schain).to.deep.equal(videoBidRequests[0].schain);
      });
      describe('setting imp.floor using floorModule', function () {
        /*
        Use the minimum value among floor from floorModule per mediaType
        If params.bidFloor is set then take max(floor, min(floors from floorModule))
        set imp.bidfloor only if it is more than 0
        */

        let newRequest;
        let floorModuleTestData;
        let getFloor = function (req) {
          return floorModuleTestData[req.mediaType];
        };

        beforeEach(() => {
          floorModuleTestData = {
            'banner': {
              'currency': 'AUD',
              'floor': 1.50
            },
            'video': {
              'currency': 'AUD',
              'floor': 2.00
            }
          };
          newRequest = utils.deepClone(bidRequests);
          newRequest[0].getFloor = getFloor;
        });

        it('bidfloor should be undefined if calculation is <= 0', function () {
          floorModuleTestData.banner.floor = 0; // lowest of them all
          newRequest[0].params.bidFloor = undefined;
          let request = spec.buildRequests(newRequest);
          let data = JSON.parse(request.data);
          data = data.imp[0];
          expect(data.bidfloor).to.equal(undefined);
        });

        it('ignore floormodule o/p if floor is not number', function () {
          floorModuleTestData.banner.floor = 'INR';
          newRequest[0].params.bidFloor = undefined;
          let request = spec.buildRequests(newRequest);
          let data = JSON.parse(request.data);
          data = data.imp[0];
          expect(data.bidfloor).to.equal(undefined); // video will be lowest now
        });

        it('ignore floormodule o/p if currency is not matched', function () {
          floorModuleTestData.banner.currency = 'INR';
          newRequest[0].params.bidFloor = undefined;
          let request = spec.buildRequests(newRequest);
          let data = JSON.parse(request.data);
          data = data.imp[0];
          expect(data.bidfloor).to.equal(undefined); // video will be lowest now
        });

        it('bidFloor is not passed, use minimum from floorModule', function () {
          newRequest[0].params.bidFloor = undefined;
          let request = spec.buildRequests(newRequest);
          let data = JSON.parse(request.data);
          data = data.imp[0];
          expect(data.bidfloor).to.equal(1.5);
        });

        it('bidFloor is passed as 1, use min of floorModule as it is highest', function () {
          newRequest[0].params.bidFloor = '1.0';// yes, we want it as a string
          let request = spec.buildRequests(newRequest);
          let data = JSON.parse(request.data);
          data = data.imp[0];
          expect(data.bidfloor).to.equal(1.5);
        });
      });
      describe('Response checking', function () {
        it('should check for valid response values', function () {
          let request = spec.buildRequests(bidRequests);
          let response = spec.interpretResponse(bidResponses, request);
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
        it('should check for valid banner mediaType in request', function () {
          let request = spec.buildRequests(bidRequests);
          let response = spec.interpretResponse(bidResponses, request);

          expect(response[0].mediaType).to.equal('banner');
        });
        it('should check for valid video mediaType in request', function () {
          let request = spec.buildRequests(videoBidRequests);
          let response = spec.interpretResponse(videoBidResponse, request);

          expect(response[0].mediaType).to.equal('video');
        });
      });
    });
    describe('Video request params', function () {
      let sandbox, utilsMock, newVideoRequest;
      beforeEach(() => {
        utilsMock = sinon.mock(utils);
        sandbox = sinon.sandbox.create();
        sandbox.spy(utils, 'logWarn');
        newVideoRequest = utils.deepClone(videoBidRequests);
      });

      afterEach(() => {
        utilsMock.restore();
        sandbox.restore();
      });

      it('Video params from mediaTypes and params obj of bid are not present', function () {
        delete newVideoRequest[0].mediaTypes.video;
        delete newVideoRequest[0].params.video;
        let request = spec.buildRequests(newVideoRequest);
        expect(request).to.equal(undefined);
      });

      it('Should consider video params from mediaType object of bid', function () {
        delete newVideoRequest[0].params.video;

        let request = spec.buildRequests(newVideoRequest);
        let data = JSON.parse(request.data);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0]['video']['w']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.imp[0]['video']['h']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[1]);
        expect(data.imp[0]['video']['battr']).to.equal(undefined);
      });
    });
    describe('getUserSyncs', function () {
      const syncurl_iframe = 'https://sync.lemmadigital.com/js/usersync.html?pid=1001';
      let sandbox;
      beforeEach(function () {
        sandbox = sinon.sandbox.create();
      });
      afterEach(function () {
        sandbox.restore();
      });

      it('execute as per config', function () {
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined)).to.deep.equal([{
          type: 'iframe', url: syncurl_iframe
        }]);
      });

      it('not execute as per config', function () {
        expect(spec.getUserSyncs({ iframeEnabled: false }, {}, undefined, undefined)).to.deep.equal(undefined);
      });
    });
  });
});
