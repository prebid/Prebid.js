import { expect } from 'chai';
import { spec } from 'modules/customBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('customBidApater', () => {

  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when no handler is provided', () => {
      const validBid = {
        bidder: 'customBidAdapter',
      };
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should call the handler provided with the same args', () => {

      const spyArguments = [];
      const spy = (...args) => {
        spyArguments.push(args);
        return true;
      };

      const validBid = {
        bidder: 'customBidAdapter',
        params: {
          zoneId: 'zone-42',
        },
        handlers: {
          isBidRequestValid: spy,
        }
      };
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
      console.log(spyArguments);
      expect(spyArguments).to.have.lengthOf(1);
      expect(spyArguments[0][0]).be.equal(validBid);

    });

  });

  describe('buildRequests', () => {
    const validBidRequests = [
      {
        bidder: 'customBidAdpater',
        params: {
          placementId: 'placementId-42',
        },
        adUnitCode: 'div-adunit-code-1337',
        sizes: [[300, 250], [300, 600]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      },
      {
        bidder: 'customBidAdpater',
        params: {
          placementId: 'placementId-42',
        },
        adUnitCode: 'div-adunit-code-42',
        sizes: [[300, 250]],
        bidId: '1d1a030790a475',
        bidderRequestId: '30b31c1838de1e',
        auctionId: '22edbae2733bf6',
      }
    ];


    it('should return an empty array when no handler is provided', () => {
      const serverRequest = spec.buildRequests(validBidRequests, {});
      expect(serverRequest).to.be.a('array').and.to.have.lengthOf(0);
    });

    it('should call the handler provided with the same args', () => {
      const spyArguments = [];
      const spy = (...args) => {
        spyArguments.push(args);
        return args[0].map(a => ({
          method: 'PROMISE',
          promise: new Promise(resolve => resolve(a)),
        }));
      };

      const bidderRequest = {
        handlers: {
          buildRequests: spy,
        }
      };

      const serverRequest = spec.buildRequests(validBidRequests, bidderRequest);
      expect(serverRequest).to.be.a('array').and.to.have.lengthOf(2);
      expect(spyArguments).to.have.lengthOf(1);
      expect(spyArguments[0][0]).be.equal(validBidRequests);
      expect(spyArguments[0][1]).be.equal(bidderRequest);
      serverRequest.forEach(request => {
        expect(request.method).to.equal('PROMISE');
        expect(Promise.resolve(request)).to.be.a('promise');
      });
    });
  });

  describe('interpretResponse', () => {
    const serverResponse = [{
      placementId: 'placementId-42',
      adUnitCode: 'div-adunit-code-1337',
      sizes: [300, 250],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      cpm: 1.2,
    }];

    it('should return an empty array when no handler is provided', () => {
      const serverRequest = spec.interpretResponse(serverResponse, {});
      expect(serverRequest).to.be.a('array').and.to.have.lengthOf(0);
    });

    it('should call the handler provided with the same args', () => {
      const spyArguments = [];
      const spy = (...args) => {
        spyArguments.push(args);
        return args[0];
      };

      const serverRequest = {
        handlers: {
          interpretResponse: spy,
        }
      };

      const responses = spec.interpretResponse(serverResponse, serverRequest);
      expect(responses).to.be.a('array').and.to.have.lengthOf(serverResponse.length);
      expect(spyArguments).to.have.lengthOf(1);
      expect(spyArguments[0][0]).be.equal(serverResponse);
      expect(spyArguments[0][1]).be.equal(serverRequest);
    });
  });
});
