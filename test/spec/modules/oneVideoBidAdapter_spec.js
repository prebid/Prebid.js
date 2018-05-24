import { expect } from 'chai';
import { spec } from 'modules/oneVideoBidAdapter';
import * as utils from 'src/utils';

describe('OneVideoBidAdapter', () => {
  let bidRequest;

  beforeEach(() => {
    bidRequest = {
      bidder: 'oneVideo',
      sizes: [640, 480],
      bidId: '30b3efwfwe1e',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2]
        },
        site: {
          id: 1,
          page: 'https://news.yahoo.com/portfolios',
          referrer: 'http://www.yahoo.com'
        },
        pubId: 'brxd'
      }
    };
  });

  describe('spec.isBidRequestValid', () => {
    it('should return true when the required params are passed', () => {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the "video" param is missing', () => {
      bidRequest.params = {
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "pubId" param is missing', () => {
      bidRequest.params = {
        video: {
          playerWidth: 480,
          playerHeight: 640,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no bid params are passed', () => {
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('spec.buildRequests', () => {
    it('should create a POST request for every bid', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(location.protocol + spec.ENDPOINT + bidRequest.params.pubId);
    });

    it('should attach the bid request object', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].bidRequest).to.equal(bidRequest);
    });

    it('should attach request data', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const [ width, height ] = bidRequest.sizes;
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
    });

    it('must parse bid size from a nested array', () => {
      const width = 640;
      const height = 480;
      bidRequest.sizes = [[ width, height ]];
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
    });
  });

  describe('spec.interpretResponse', () => {
    it('should return no bids if the response is not valid', () => {
      const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "nurl" and "adm" are missing', () => {
      const serverResponse = {seatbid: [{bid: [{price: 6.01}]}]};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "price" is missing', () => {
      const serverResponse = {seatbid: [{bid: [{adm: '<VAST></VAST>'}]}]};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid bid response with just "adm"', () => {
      const serverResponse = {seatbid: [{bid: [{id: 1, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      let o = {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        cpm: serverResponse.seatbid[0].bid[0].price,
        creativeId: serverResponse.seatbid[0].bid[0].id,
        vastXml: serverResponse.seatbid[0].bid[0].adm,
        width: 640,
        height: 480,
        mediaType: 'video',
        currency: 'USD',
        ttl: 100,
        netRevenue: true
      };
      expect(bidResponse).to.deep.equal(o);
    });
  });
});
