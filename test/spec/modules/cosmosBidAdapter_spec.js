import { expect } from 'chai';
import { spec } from 'modules/cosmosBidAdapter';
import * as utils from 'src/utils';
const constants = require('src/constants.json');

describe('Cosmos adapter', function () {
  let bannerBidRequests;
  let bannerBidResponse;
  let videoBidRequests;
  let videoBidResponse;

  beforeEach(function () {
    bannerBidRequests = [
      {
        bidder: 'cosmos',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        params: {
          publisherId: '1001',
          currency: 'USD',
          geo: {
            lat: '09.5',
            lon: '21.2',
          }
        },
        bidId: '29f8bd96defe76'
      }
    ];

    videoBidRequests =
      [
        {
          mediaTypes: {
            video: {
              mimes: ['video/mp4', 'video/x-flv'],
              context: 'instream'
            }
          },
          bidder: 'cosmos',
          params: {
            publisherId: 1001,
            video: {
              skippable: true,
              minduration: 5,
              maxduration: 30
            }
          },
          bidId: '39f5cc6eff9b37'
        }
      ];

    bannerBidResponse = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '82DAAE22-FF66-4FAB-84AB-347B0C5CD02C',
            'impid': '29f8bd96defe76',
            'price': 1.858309,
            'adm': '<div style=\"background-color:#3399ff;\"><p style=\"color:#ff0000;font-size:30px;font-family:Courier, monospace;\">COSMOS<span style=\"color:white;font-style:italic;font-size:20px;\">\"Connecting Advertisers and Publishers directly\"</span></p></div><script src=\"https://track.cosmoshq.com/event?data=%7B%22id%22%3A%221566015675167%22%2C%22bid%22%3A%2282DAAE22-FF66-4FAB-84AB-347B0C5CD02C%22%2C%22ts%22%3A%2220190817042115%22%2C%22pid%22%3A1001%2C%22plcid%22%3A1%2C%22aid%22%3A1%2C%22did%22%3A1%2C%22cid%22%3A%2222918%22%2C%22af%22%3A2%2C%22at%22%3A1%2C%22w%22%3A300%2C%22h%22%3A250%2C%22crid%22%3A%22v55jutrh%22%2C%22pp%22%3A1.858309%2C%22cp%22%3A1.858309%2C%22mg%22%3A0%7D&type=1\" type=\"text/javascript\"></script>',
            'adid': 'v55jutrh',
            'adomain': ['febreze.com'],
            'iurl': 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/vgl908z.png',
            'cid': '1234',
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
            'id': '82DAAE22-FF66-4FAB-84AB-347B0C5CD02C',
            'impid': '39f5cc6eff9b37',
            'price': 0.858309,
            'adm': '<?xml version=\"1.0" encoding=\"UTF-8"?><VAST version=\"2.0"><Ad id=\"1"><InLine><AdSystem>CosmosHQ</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Impression>https://track.cosmoshq.com/event?data=%7B%22id%22%3A%221566011421045%22%2C%22bid%22%3A%2282DAAE22-FF66-4FAB-84AB-347B0C5CD02C%22%2C%22ts%22%3A%2220190817031021%22%2C%22pid%22%3A1001%2C%22plcid%22%3A1%2C%22aid%22%3A1%2C%22did%22%3A1%2C%22cid%22%3A%2222918%22%2C%22af%22%3A3%2C%22at%22%3A1%2C%22w%22%3A300%2C%22h%22%3A250%2C%22crid%22%3A%22v55jutrh%22%2C%22pp%22%3A0.858309%2C%22cp%22%3A0.858309%2C%22mg%22%3A0%7D&amp;type=1</Impression><Impression>http://track.dsp.impression.com/impression</Impression><Creatives><Creative AdID=\"1"><Linear><Duration>00:00:60</Duration><TrackingEvents/><MediaFiles><MediaFile delivery=\"progressive" type=\"video/mp4" bitrate=\"500" width=\"400" height=\"300" scalable=\"true" maintainAspectRatio=\"true">http://sync.cosmoshq.com/static/video/SampleVideo_1280x720_10mb.mp4</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
            'adid': 'v55jutrh',
            'adomain': ['febreze.com'],
            'iurl': 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/vgl908z.png',
            'cid': '1234',
            'crid': 'v55jutrh',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'video'
              }
            }
          }],
          'seat': 'zeta'
        }]
      }
    };
  });

  describe('isBidRequestValid', function () {
    describe('validate the bid object: valid bid', function () {
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

      it('validate the bid object: nil/empty bid object', function () {
        let validBid = {
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('validate the bid object: publisherId not passed', function () {
        let validBid = {
            bidder: 'cosmos',
            params: {
              tagId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('validate the bid object: publisherId is not number', function () {
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

      it('validate the bid object: mimes absent', function () {
        let validBid = {
            bidder: 'cosmos',
            mediaTypes: {
              video: {}
            },
            params: {
              publisherId: 1001
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('validate the bid object: mimes present', function () {
        let validBid = {
            bidder: 'cosmos',
            mediaTypes: {
              video: {
                mimes: ['video/mp4', 'application/javascript']
              }
            },
            params: {
              publisherId: 1001
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });

      it('validate the bid object: tagId is not passed', function () {
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

    describe('buildRequests', function () {
      it('build request object: buildRequests function should not modify original bannerBidRequests object', function () {
        let originalBidRequests = utils.deepClone(bannerBidRequests);
        let request = spec.buildRequests(bannerBidRequests);
        expect(bannerBidRequests).to.deep.equal(originalBidRequests);
      });

      it('build request object: endpoint check', function () {
        let request = spec.buildRequests(bannerBidRequests);
        expect(request[0].url).to.equal('//bid.cosmoshq.com/openrtb2/bids');
        expect(request[0].method).to.equal('POST');
      });

      it('build request object: request params check', function () {
        let request = spec.buildRequests(bannerBidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.site.publisher.id).to.equal(bannerBidRequests[0].params.publisherId); // publisher Id
        expect(data.imp[0].bidfloorcur).to.equal(bannerBidRequests[0].params.currency);
      });

      it('build request object: request params check without tagId', function () {
        delete bannerBidRequests[0].params.tagId;
        let request = spec.buildRequests(bannerBidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.site.publisher.id).to.equal(bannerBidRequests[0].params.publisherId); // publisher Id
        expect(data.imp[0].tagid).to.equal(undefined); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bannerBidRequests[0].params.currency);
      });

      it('build request object: request params multi size format object check', function () {
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
              currency: 'USD'
            }
          }
        ];
        /* case 1 - size passed in adslot */
        let request = spec.buildRequests(bidRequest);
        let data = JSON.parse(request[0].data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height

        /* case 2 - size passed in adslot as well as in sizes array */
        bidRequest[0].sizes = [[300, 600], [300, 250]];
        bidRequest[0].mediaTypes = {
          banner: {
            sizes: [[300, 600], [300, 250]]
          }
        };
        request = spec.buildRequests(bidRequest);
        data = JSON.parse(request[0].data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(600); // height

        /* case 3 - size passed in sizes but not in adslot */
        bidRequest[0].params.tagId = 1;
        bidRequest[0].sizes = [[300, 250], [300, 600]];
        bidRequest[0].mediaTypes = {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        };
        request = spec.buildRequests(bidRequest);
        data = JSON.parse(request[0].data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].banner.format).exist.and.to.be.an('array');
        expect(data.imp[0].banner.format[0]).exist.and.to.be.an('object');
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height
      });

      it('build request object: request params currency check', function () {
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
              currency: 'USD'
            },
            sizes: [[300, 250], [300, 600]]
          }
        ];

        /* case 1 -
            currency specified in adunits
            output: imp[0] use currency specified in bannerBidRequests[0].params.currency

        */
        let request = spec.buildRequests(bidRequest);
        let data = JSON.parse(request[0].data);
        expect(data.imp[0].bidfloorcur).to.equal(bidRequest[0].params.currency);

        /* case 2 -
            currency specified in adunit
            output: imp[0] use default currency - USD

        */
        delete bidRequest[0].params.currency;
        request = spec.buildRequests(bidRequest);
        data = JSON.parse(request[0].data);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('build request object: request params check for video ad', function () {
        let request = spec.buildRequests(videoBidRequests);
        let data = JSON.parse(request[0].data);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['mimes'][0]).to.equal(videoBidRequests[0].mediaTypes.video['mimes'][0]);
        expect(data.imp[0]['video']['mimes'][1]).to.equal(videoBidRequests[0].mediaTypes.video['mimes'][1]);
        expect(data.imp[0]['video']['minduration']).to.equal(videoBidRequests[0].params.video['minduration']);
        expect(data.imp[0]['video']['maxduration']).to.equal(videoBidRequests[0].params.video['maxduration']);
      });

      describe('interpretResponse', function () {
        it('check for banner response', function () {
          let request = spec.buildRequests(bannerBidRequests);
          let data = JSON.parse(request[0].data);
          let response = spec.interpretResponse(bannerBidResponse, request[0]);
          expect(response).to.be.an('array').with.length.above(0);
          expect(response[0].requestId).to.equal(bannerBidResponse.body.seatbid[0].bid[0].impid);
          expect(response[0].cpm).to.equal((bannerBidResponse.body.seatbid[0].bid[0].price).toFixed(2));
          expect(response[0].width).to.equal(bannerBidResponse.body.seatbid[0].bid[0].w);
          expect(response[0].height).to.equal(bannerBidResponse.body.seatbid[0].bid[0].h);
          if (bannerBidResponse.body.seatbid[0].bid[0].crid) {
            expect(response[0].creativeId).to.equal(bannerBidResponse.body.seatbid[0].bid[0].crid);
          } else {
            expect(response[0].creativeId).to.equal(bannerBidResponse.body.seatbid[0].bid[0].id);
          }
          expect(response[0].dealId).to.equal(bannerBidResponse.body.seatbid[0].bid[0].dealid);
          expect(response[0].currency).to.equal('USD');
          expect(response[0].netRevenue).to.equal(false);
          expect(response[0].ttl).to.equal(300);
        });
        it('check for video response', function () {
          let request = spec.buildRequests(videoBidRequests);
          let data = JSON.parse(request[0].data);
          let response = spec.interpretResponse(videoBidResponse, request[0]);
        });
      });
    });
  });
});
