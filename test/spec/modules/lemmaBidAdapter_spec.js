import { expect } from 'chai';
import { spec } from 'modules/lemmaBidAdapter';
import * as utils from 'src/utils';
const constants = require('src/constants.json');

describe('lemmaBidAdapter', function() {
  var bidRequests;
  var videoBidRequests;
  var bidResponses;
  beforeEach(function() {
    bidRequests = [{
      bidder: 'lemma',
      mediaType: 'banner',
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
        geo: {
          lat: '12.3',
          lon: '23.7',
        }
      },
      sizes: [
        [300, 250],
        [300, 600]
      ]
    }];
    videoBidRequests = [{
      code: 'video1',
      mediaType: 'video',
      mediaTypes: {
        video: {
          playerSize: [640, 480],
          context: 'instream'
        }
      },
      bidder: 'lemma',
      params: {
        pubId: 1001,
        adunitId: 1,
        video: {
          mimes: ['video/mp4', 'video/x-flv'],
          skippable: true,
          minduration: 5,
          maxduration: 30
        }
      }
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
            'h': 250,
            'w': 300,
            'ext': {}
          }]
        }]
      }
    };
  });
  describe('implementation', function() {
    describe('Bid validations', function() {
      it('valid bid case', function() {
        var validBid = {
            bidder: 'lemma',
            params: {
              pubId: 1001,
              adunitId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });
      it('invalid bid case', function() {
        var isValid = spec.isBidRequestValid();
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: pubId not passed', function() {
        var validBid = {
            bidder: 'lemma',
            params: {
              adunitId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: pubId is not number', function() {
        var validBid = {
            bidder: 'lemma',
            params: {
              pubId: '301',
              adunitId: 1
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: adunitId is not passed', function() {
        var validBid = {
            bidder: 'lemma',
            params: {
              pubId: 1001
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
      it('invalid bid case: video bid request mimes is not passed', function() {
        var validBid = {
            bidder: 'lemma',
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
    describe('Request formation', function() {
      it('buildRequests function should not modify original bidRequests object', function() {
        var originalBidRequests = utils.deepClone(bidRequests);
        var request = spec.buildRequests(bidRequests);
        expect(bidRequests).to.deep.equal(originalBidRequests);
      });
      it('Endpoint checking', function() {
        var request = spec.buildRequests(bidRequests);
        expect(request.url).to.equal('//ads.lemmatechnologies.com/lemma/servad?pid=1001&aid=1');
        expect(request.method).to.equal('POST');
      });
      it('Request params check', function() {
        var request = spec.buildRequests(bidRequests);
        var data = JSON.parse(request.data);
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.pubId.toString()); // publisher Id
        expect(data.imp[0].tagid).to.equal('1'); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
      });
      it('Request params check without mediaTypes object', function() {
        var bidRequests = [{
          bidder: 'lemma',
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
        var request = spec.buildRequests(bidRequests);
        var data = JSON.parse(request.data);
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].banner.format).exist.and.to.be.an('array');
        expect(data.imp[0].banner.format[0]).exist.and.to.be.an('object');
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width
        expect(data.imp[0].banner.format[0].h).to.equal(600); // height
      });
      it('Request params check: without tagId', function() {
        delete bidRequests[0].params.adunitId;
        var request = spec.buildRequests(bidRequests);
        var data = JSON.parse(request.data);
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.pubId.toString()); // publisher Id
        expect(data.imp[0].tagid).to.equal(undefined); // tagid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
      });
      it('Request params multi size format object check', function() {
        var bidRequests = [{
          bidder: 'lemma',
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
        var request = spec.buildRequests(bidRequests);
        var data = JSON.parse(request.data);
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
      it('Request params currency check', function() {
        var bidRequest = [{
          bidder: 'lemma',
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
        var request = spec.buildRequests(bidRequest);
        var data = JSON.parse(request.data);
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
      it('Request params check for video ad', function() {
        var request = spec.buildRequests(videoBidRequests);
        var data = JSON.parse(request.data);
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
      describe('Response checking', function() {
        it('should check for valid response values', function() {
          var request = spec.buildRequests(bidRequests);
          var data = JSON.parse(request.data);
          var response = spec.interpretResponse(bidResponses, request);
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
