import { expect } from 'chai';
import { spec } from 'modules/distroscaleBidAdapter.js';
import * as utils from 'src/utils.js';

describe('distroscaleBidAdapter', function() {
  const DSNAME = 'distroscale';

  describe('isBidRequestValid', function() {
    it('with no param', function() {
      expect(spec.isBidRequestValid({
        bidder: DSNAME,
        params: {}
      })).to.equal(false);
    });

    it('with pubid param', function() {
      expect(spec.isBidRequestValid({
        bidder: DSNAME,
        params: {
          pubid: '12345'
        }
      })).to.equal(true);
    });

    it('with pubid and zoneid params', function() {
      expect(spec.isBidRequestValid({
        bidder: DSNAME,
        params: {
          pubid: '12345',
          zoneid: '67890'
        }
      })).to.equal(true);
    });
  });

  describe('buildRequests', function() {
    const CONSENT_STRING = 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw';
    const BID_REQUESTS = [{
      'bidder': DSNAME,
      'params': {
        'pubid': '12345',
        'zoneid': '67890'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[970, 250], [300, 250]]
        }
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'ca59932f-90f4-4dff-bed2-b90ffa2c2b6a',
      'sizes': [[970, 250], [300, 250]],
      'bidId': '20b96f0310083c',
      'bidderRequestId': '1dd684edba2006',
      'auctionId': '22ed3053-f76f-476c-a08e-dcda5862443d'
    }];
    const BIDDER_REQUEST = {
      'bidderCode': DSNAME,
      'auctionId': '22ed3053-f76f-476c-a08e-dcda5862443d',
      'bidderRequestId': '1dd684edba2006',
      'refererInfo': {
        'referer': 'https://publisher.com/homepage.html',
        'reachedTop': true,
        'isAmp': false,
        'numIframes': 0,
        'stack': [
          'https://publisher.com/homepage.html'
        ],
        'canonicalUrl': null
      },
      'gdprConsent': {
        'consentString': CONSENT_STRING,
        'gdprApplies': true
      }
    };

    it('basic', function() {
      const request = spec.buildRequests(BID_REQUESTS, BIDDER_REQUEST);
      expect(request.method).to.equal('POST');
      expect(request.url).to.have.string('https://hb.jsrdn.com/hb?from=pbjs');
      expect(request.bidderRequest).to.deep.equal(BIDDER_REQUEST);
      expect(request.data).to.exist;
      expect(request.data.id).to.be.a('string').that.is.not.empty;
      expect(request.data.at).to.equal(1);
      expect(request.data.cur).to.deep.equal(['USD']);
      expect(request.data.device).to.exist;
      expect(request.data.site).to.exist;
      expect(request.data.user).to.exist;
      expect(request.data.imp).to.be.an('array').that.is.not.empty;
      expect(request.data.imp[0]).to.exist;
      expect(request.data.imp[0].id).to.equal(BID_REQUESTS[0].bidId);
      expect(request.data.imp[0].tagid).to.equal(BID_REQUESTS[0].params.zoneid || '');
      expect(request.data.imp[0].secure).to.equal(1);
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].banner.format).to.be.an('array').that.is.not.empty;
      expect(request.data.imp[0].banner.format[0]).to.exist;
      expect(request.data.imp[0].banner.format[0].w).to.equal(970);
      expect(request.data.imp[0].banner.format[0].h).to.equal(250);
      expect(request.data.imp[0].banner.w).to.equal(970);
      expect(request.data.imp[0].banner.h).to.equal(250);
      expect(request.data.imp[0].banner.pos).to.equal(0);
      expect(request.data.imp[0].banner.topframe).to.be.oneOf([0, 1]);
      expect(request.data.imp[0].ext).to.exist;
      expect(request.data.imp[0].ext.pubid).to.equal(BID_REQUESTS[0].params.pubid);
      expect(request.data.imp[0].ext.zoneid).to.equal(BID_REQUESTS[0].params.zoneid || '');
    });

    it('gdpr', function() {
      const request = spec.buildRequests(BID_REQUESTS, BIDDER_REQUEST);
      expect(request.data).to.exist;
      expect(request.data.regs).to.exist;
      expect(request.data.regs.gdpr).to.equal(1);
      expect(request.data.user).to.exist;
      expect(request.data.user.consent).to.equal(CONSENT_STRING);
    });
  });

  describe('interpretResponse', function() {
    const REQUEST = {
      'method': 'POST',
      'url': 'https://hb.jsrdn.com/hb?from=pbjs',
      'data': '{"id":"1648161050749","at":1,"cur":["USD"],"site":{"page":"https://publisher.com/homepage.html","domain":"publisher.com"},"device":{"ua":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.83 Safari/537.36","js":1,"h":1200,"w":1920,"language":"en","dnt":0},"imp":[{"id":"20b96f0310083c","tagid":"67890","secure":1,"ext":{"pubid":"12345","zoneid":"67890"},"banner":{"pos":0,"w":970,"h":250,"topframe":1,"format":[{"w":970,"h":250}]}}],"user":{},"ext":{}}',
      'bidderRequest': {
        'bidderCode': DSNAME,
        'auctionId': '22ed3053-f76f-476c-a08e-dcda5862443d',
        'bidderRequestId': '1dd684edba2006',
        'bids': [{
          'bidder': DSNAME,
          'params': {
            'pubid': '12345',
            'zoneid': '67890'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[970, 250], [300, 250]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'transactionId': 'ca59932f-90f4-4dff-bed2-b90ffa2c2b6a',
          'sizes': [[970, 250], [300, 250]],
          'bidId': '20b96f0310083c',
          'bidderRequestId': '1dd684edba2006',
          'auctionId': '22ed3053-f76f-476c-a08e-dcda5862443d'
        }],
        'refererInfo': {
          'referer': 'https://publisher.com/homepage.html',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'https://publisher.com/homepage.html'
          ],
          'canonicalUrl': null
        }
      }
    };
    const RESPONSE = {
      'body': {
        'id': '1648161050749',
        'seatbid': [{
          'bid': [{
            'id': '212f1c7b-378b-47e4-8294-ac38658b33f6_0',
            'impid': '20b96f0310083c',
            'price': 0.1,
            'w': 970,
            'h': 250,
            'adm': "<div class='dsunit-test' id='20b96f0310083c' style='width:970px;height:250px;background-image:url(https://advertiser.dsp.com/creatives/aaaaaaaa-fa90-46ec-a0f9-1a898452ade3/banner.jpg);background-size:cover'></div>"
          }]
        }],
        'cur': 'USD'
      },
      'headers': {}
    };
    const SAMPLE_PARSED = [{
      'requestId': '20b96f0310083c',
      'cpm': 0.1,
      'currency': 'USD',
      'width': 970,
      'height': 250,
      'creativeId': 'bbbbbbbb-648d-4e03-a5e2-7198bcd07cfe',
      'netRevenue': true,
      'ttl': 300,
      'ad': "<div class='dsunit-test' id='2f0dfc70a1c251' style='width:970px;height:250px;background-image:url(https://dummyimage.com/970x250/444444/ffffff?text=Test%20Ad);background-size:cover'></div>",
      'meta': {
        'advertiserDomains': []
      }
    }];

    it('valid bid response for banner ad', function() {
      const result = spec.interpretResponse(RESPONSE, REQUEST);
      const bid = RESPONSE.body.seatbid[0].bid[0];
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal(bid.impid);
      expect(result[0].cpm).to.equal(Number(bid.price));
      expect(result[0].currency).to.equal(RESPONSE.body.cur);
      expect(result[0].width).to.equal(Number(bid.w));
      expect(result[0].height).to.equal(Number(bid.h));
      expect(result[0].creativeId).to.be.a('string').that.is.not.empty;
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
      expect(result[0].ad).to.equal(bid.adm);
      expect(result[0].meta).to.exist;
      expect(result[0].meta.advertiserDomains).to.exist;
    });

    it('advertiserDomains is included when sent by server', function() {
      const ADOMAIN = ['advertiser_adomain'];
      let RESPONSE_CLONE = utils.deepClone(RESPONSE);
      RESPONSE_CLONE.body.seatbid[0].bid[0].adomain = utils.deepClone(ADOMAIN); ;
      let result = spec.interpretResponse(RESPONSE_CLONE, REQUEST);
      expect(result[0].meta.advertiserDomains).to.deep.equal(ADOMAIN);
    });
  });
});
