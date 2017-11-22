import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/optimaticBidAdapter';
import * as utils from 'src/utils';

describe('OptimaticBidAdapter', () => {
  let bidRequest;

  beforeEach(() => {
    bidRequest = {
      bidder: 'optimatic',
      params: {
        placement: '2chy7Gc2eSQL',
        bidfloor: 5.00
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
        placement: '2chy7Gc2eSQL'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "placement" param is missing', () => {
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
      expect(requests[0].url).to.equal(ENDPOINT + bidRequest.params.placement);
    });

    it('should attach the bid request object', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      expect(requests[0].bidRequest).to.equal(bidRequest);
    });

    it('should attach request data', () => {
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      const [ width, height ] = bidRequest.sizes;
      expect(data.imp[0].video.width).to.equal(width);
      expect(data.imp[0].video.height).to.equal(height);
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
    });

    it('must parse bid size from a nested array', () => {
      const width = 640;
      const height = 480;
      bidRequest.sizes = [[ width, height ]];
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video.width).to.equal(width);
      expect(data.imp[0].video.height).to.equal(height);
    });

    it('must parse bid size from a string', () => {
      const width = 640;
      const height = 480;
      bidRequest.sizes = `${width}x${height}`;
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video.width).to.equal(width);
      expect(data.imp[0].video.height).to.equal(height);
    });

    it('must handle an empty bid size', () => {
      bidRequest.sizes = [];
      const requests = spec.buildRequests([ bidRequest ]);
      const data = requests[0].data;
      expect(data.imp[0].video.width).to.equal(undefined);
      expect(data.imp[0].video.height).to.equal(undefined);
    });
  });

  describe('spec.interpretResponse', () => {
    it('should return no bids if the response is not valid', () => {
      const bidResponse = spec.interpretResponse({ body: null }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "adm" is missing', () => {
      const serverResponse = {seatbid: [{bid: [{price: 5.01}]}]};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "price" is missing', () => {
      const serverResponse = {seatbid: [{bid: [{adm: '<VAST></VAST>'}]}]};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid bid response', () => {
      const serverResponse = {seatbid: [{bid: [{id: 1, price: 5.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
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
        ttl: 300,
        netRevenue: true
      };
      expect(bidResponse).to.deep.equal(o);
    });
  });
});
