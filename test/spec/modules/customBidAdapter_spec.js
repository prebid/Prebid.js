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
      const validBid = {
        bidder: 'customBidAdapter',
        params: {
          zoneId: 'zone-42',
        },
        handlers: {
          isBidRequestValid: sinon.stub(),
        }
      };
      validBid.handlers.isBidRequestValid.returns(true);

      expect(spec.isBidRequestValid(validBid)).to.equal(true);
      expect(validBid.handlers.isBidRequestValid.calledOnce);
      expect(validBid.handlers.isBidRequestValid.firstCall.args).to.have.lengthOf(1);
      expect(validBid.handlers.isBidRequestValid.firstCall.args[0]).be.equal(validBid);

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
      const bidderRequest = {
        handlers: {
          buildRequests: sinon.stub(),
        }
      };


      spec.buildRequests(validBidRequests, bidderRequest);

      expect(bidderRequest.handlers.buildRequests.calledOnce);
      expect(bidderRequest.handlers.buildRequests.firstCall.args).to.have.lengthOf(2);
      expect(bidderRequest.handlers.buildRequests.firstCall.args[0]).be.equal(validBidRequests);
      expect(bidderRequest.handlers.buildRequests.firstCall.args[1]).be.equal(bidderRequest);

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

      const serverRequest = {
        handlers: { interpretResponse: sinon.stub() }
      };

      spec.interpretResponse(serverResponse, serverRequest);

      expect(serverRequest.handlers.interpretResponse.calledOnce);
      expect(serverRequest.handlers.interpretResponse.firstCall.args).to.have.lengthOf(2);
      expect(serverRequest.handlers.interpretResponse.firstCall.args[0]).be.equal(serverResponse);
      expect(serverRequest.handlers.interpretResponse.firstCall.args[1]).be.equal(serverRequest);
    });
  });
});
