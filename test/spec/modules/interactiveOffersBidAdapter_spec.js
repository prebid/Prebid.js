import {expect} from 'chai';
import {spec} from 'modules/interactiveOffersBidAdapter';

describe('interactiveOffers adapter', function () {
  describe('implementation', function () {
    describe('for requests', function () {
      it('should accept valid bid', function () {
        let validBid = {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          },
          isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid', function () {
        let invalidBid = {
            bidder: 'interactiveOffers'
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });
    describe('for requests', function () {
      it('should accept valid bid with optional params', function () {
        let validBid = {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42',
              loc: 'http://test.com/prebid',
              tmax: 1500
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);

        let buildRequest = spec.buildRequests([validBid])[0];
        let requestUrlCustomParams = buildRequest.data;
        expect(requestUrlCustomParams).have.property('loc', 'http://test.com/prebid');
        expect(requestUrlCustomParams).have.property('tmax', 1500);
      });

      it('should accept valid bid without optional params', function () {
        let validBid = {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);

        let buildRequest = spec.buildRequests([validBid])[0];
        let requestUrlCustomParams = buildRequest.data;
        expect(requestUrlCustomParams).have.property('loc');
        expect(requestUrlCustomParams).have.property('tmax');
      });

      it('should reject invalid bid without pubId', function () {
        let invalidBid = {
            bidder: 'interactiveOffers',
            params: {}
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });
    describe('bid responses', function () {
      it('should return complete bid response', function () {
        let serverResponse = {
          body: {
            'success': 'true',
            'message': 'Request Valid',
            'payloadData': {
              bidId: '3842b02f7ec0fd',
              cpm: 0.5,
              width: 300,
              height: 600,
              ad: '<div>...</div>',
            }
          }
        };

        let bidRequests = [
          {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          }
        ];
        let bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});
        expect(bids).to.be.lengthOf(1);
        expect(bids[0].cpm).to.equal(0.5);
        expect(bids[0].width).to.equal(300);
        expect(bids[0].height).to.equal(600);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ad).to.have.length.above(1);
      });

      it('should return empty bid response', function () {
        let bidRequests = [
          {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          }
        ];
        let serverResponse = {
            body: {
              'success': 'true',
              'message': 'Request Valid',
              'payloadData': {
                bidId: '3842b02f7ec0fd',
                cpm: 0
              }
            }
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response with error', function () {
        let bidRequests = [
          {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          }
        ];
        let serverResponse = {body: {'success': 'false', 'message': 'Request Error'}},
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response without payload', function () {
        let bidRequests = [
          {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          }
        ];
        let serverResponse = {body: {'success': 'true', 'message': 'Empty Payload', 'payloadData': []}},
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on empty body', function () {
        let bidRequests = [
          {
            bidder: 'interactiveOffers',
            params: {
              pubId: '42'
            }
          }
        ];
        let serverResponse,
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });
    });
  });
});
