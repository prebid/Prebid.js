import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/readpeakBidAdapter';
import * as utils from 'src/utils';

describe('ReadPeakAdapter', () => {
  let bidRequest
  let serverResponse
  let serverRequest

  beforeEach(() => {
    bidRequest = {
      bidder: 'readpeak',
      nativeParams: {
        title: { required: true, len: 200 },
        image: { wmin: 100 },
        sponsoredBy: { },
        body: {required: false},
        cta: {required: false},
      },
      params: {
        bidfloor: 5.00,
        publisherId: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
      },
      bidId: '2ffb201a808da7',
      bidderRequestId: '178e34bad3658f',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
    }
    serverResponse = {
      id: bidRequest.bidderRequestId,
      cur: 'USD',
      seatbid: [{
        bid: [{
          id: 'bidRequest.bidId',
          impid: bidRequest.bidId,
          price: 0.12,
          cid: '12',
          crid: '123',
          adomain: ['readpeak.com'],
          adm: {
            assets: [{
              id: 1,
              title: {
                text: 'Title',
              }
            },
            {
              id: 3,
              data: {
                type: 1,
                value: 'Brand Name',
              },
            },
            {
              id: 4,
              data: {
                type: 2,
                value: 'Description',
              },
            },
            {
              id: 2,
              img: {
                type: 3,
                url: 'http://url.to/image',
                w: 320,
                h: 200,
              },
            }],
            link: {
              url: 'http://url.to/target'
            },
            imptrackers: [
              'http://url.to/pixeltracker'
            ],
          }
        }],
      }],
    }
    serverRequest = {
      method: 'POST',
      url: 'http://localhost:60080/header/prebid',
      data: JSON.stringify({
        'id': '178e34bad3658f',
        'imp': [
          {
            'id': '2ffb201a808da7',
            'native': {
              'request': '{"assets":[{"id":1,"required":1,"title":{"len":200}},{"id":2,"required":0,"data":{"type":1,"len":50}},{"id":3,"required":0,"img":{"type":3,"wmin":100,"hmin":150}}]}',
              'ver': '1.1'
            },
            'bidfloor': 5,
            'bidfloorcur': 'USD'
          }
        ],
        'site': {
          'publisher': {
            'id': '11bc5dd5-7421-4dd8-c926-40fa653bec76'
          },
          'id': '11bc5dd5-7421-4dd8-c926-40fa653bec76',
          'ref': '',
          'page': 'http://localhost',
          'domain': 'localhost'
        },
        'app': null,
        'device': {
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/61.0.3163.100 Safari/537.36',
          'language': 'en-US'
        },
        'isPrebid': true
      })
    }
  });

  describe('spec.isBidRequestValid', () => {
    it('should return true when the required params are passed', () => {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the native params are missing', () => {
      bidRequest.nativeParams = undefined;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "publisherId" param is missing', () => {
      bidRequest.params = {
        bidfloor: 5.00
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no bid params are passed', () => {
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when a bid request is not passed', () => {
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('spec.buildRequests', () => {
    it('should create a POST request for every bid', () => {
      const request = spec.buildRequests([ bidRequest ]);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
    });

    it('should attach request data', () => {
      const request = spec.buildRequests([ bidRequest ]);

      const data = JSON.parse(request.data);
      expect(data.isPrebid).to.equal(true);
      expect(data.id).to.equal(bidRequest.bidderRequestId)
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
      expect(data.site).to.deep.equal({
        publisher: {
          id: bidRequest.params.publisherId,
        },
        id: bidRequest.params.publisherId,
        ref: window.top.document.referrer,
        page: utils.getTopWindowLocation().href,
        domain: utils.getTopWindowLocation().hostname,
      });
      expect(data.device).to.deep.contain({ ua: navigator.userAgent });
    });
  });

  describe('spec.interpretResponse', () => {
    it('should return no bids if the response is not valid', () => {
      const bidResponse = spec.interpretResponse({ body: null }, serverRequest);
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid bid response', () => {
      const bidResponse = spec.interpretResponse({ body: serverResponse }, serverRequest)[0];
      expect(bidResponse).to.contain({
        requestId: bidRequest.bidId,
        cpm: serverResponse.seatbid[0].bid[0].price,
        creativeId: serverResponse.seatbid[0].bid[0].crid,
        ttl: 300,
        netRevenue: true,
        mediaType: 'native',
        currency: serverResponse.cur
      });

      expect(bidResponse.native.title).to.equal('Title')
      expect(bidResponse.native.body).to.equal('Description')
      expect(bidResponse.native.image).to.equal('http://url.to/image')
      expect(bidResponse.native.clickUrl).to.equal('http%3A%2F%2Furl.to%2Ftarget')
      expect(bidResponse.native.impressionTrackers).to.contain('http://url.to/pixeltracker')
    });
  });
});
