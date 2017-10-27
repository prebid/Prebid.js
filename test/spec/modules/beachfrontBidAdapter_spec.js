import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/beachfrontBidAdapter';
import * as utils from 'src/utils';

describe('BeachfrontAdapter', () => {
  let bidRequest;

  beforeEach(() => {
    bidRequest = {
      bidder: 'beachfront',
      params: {
        bidfloor: 5.00,
        appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
      },
      adUnitCode: 'adunit-code',
      sizes: [ 640, 480 ],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475'
    };
  });

  describe('spec.isBidRequestValid', () => {
    it('should return true when the required params are passed', () => {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the "bidfloor" param is missing', () => {
      bidRequest.params = {
        appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "appId" param is missing', () => {
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
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT + bidRequest.params.appId);
    });

    it('should attach the bid request object', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].bidRequest).to.equal(bidRequest);
    });

    it('should attach request data', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const [ width, height ] = bidRequest.sizes;
      expect(data.isPrebid).to.equal(true);
      expect(data.appId).to.equal(bidRequest.params.appId);
      expect(data.domain).to.equal(document.location.hostname);
      expect(data.imp[0].video).to.deep.equal({ w: width, h: height });
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
      expect(data.site).to.deep.equal({ page: utils.getTopWindowLocation().host });
      expect(data.device).to.deep.contain({ ua: navigator.userAgent });
      expect(data.cur).to.deep.equal(['USD']);
    });

    it('must parse bid size from a nested array', () => {
      const width = 640;
      const height = 480;
      bidRequest.sizes = [[ width, height ]];
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video).to.deep.equal({ w: width, h: height });
    });

    it('must parse bid size from a string', () => {
      const width = 640;
      const height = 480;
      bidRequest.sizes = `${width}x${height}`;
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video).to.deep.equal({ w: width, h: height });
    });

    it('must handle an empty bid size', () => {
      bidRequest.sizes = [];
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video).to.deep.equal({ w: undefined, h: undefined });
    });
  });

  describe('spec.interpretResponse', () => {
    it('should return no bids if the response is not valid', () => {
      const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "url" is missing', () => {
      const serverResponse = {
        bidPrice: 5.00
      };
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "bidPrice" is missing', () => {
      const serverResponse = {
        url: 'http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da'
      };
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid bid response', () => {
      const serverResponse = {
        bidPrice: 5.00,
        url: 'http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da',
        cmpId: '123abc'
      };
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse).to.deep.equal({
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        cpm: serverResponse.bidPrice,
        creativeId: serverResponse.cmpId,
        vastUrl: serverResponse.url,
        width: 640,
        height: 480,
        mediaType: 'video',
        currency: 'USD',
        ttl: 300,
        netRevenue: true
      });
    });
  });
});
