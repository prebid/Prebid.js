import { expect } from 'chai';
import { spec } from 'modules/growadvertisingBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('GrowAdvertising Adapter', function() {
  const ZONE_ID = 'unique-zone-id';
  const serverResponse = {
    body: {
      status: 'success',
      width: 300,
      height: 250,
      creativeId: 'ULqaukILu0RnMa0FyidOtkji4Po3qbgQ9ceRVGlhjLLKnrrLAATmGNCwtE99Ems8',
      ad: '<img src="http://image.source.com/img" alt="" title="" width="300" height="250" />',
      cpm: 1,
      ttl: 180,
      currency: 'USD',
    }
  };
  let bidRequests = [];

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'growads',
        params: {
          zoneId: ZONE_ID,
          maxCPM: 5,
          minCPM: 1
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          },
        },
      }
    ];
  });

  describe('implementation', function () {
    describe('for requests', function () {
      it('should accept valid bid', function () {
        let validBid = {
          bidder: 'growads',
          params: {
            zoneId: ZONE_ID
          }
        };

        let isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });

      it('should reject null zoneId bid', function () {
        let zoneNullBid = {
          bidder: 'growads',
          params: {
            zoneId: null
          }
        };

        let isValid = spec.isBidRequestValid(zoneNullBid);
        expect(isValid).to.equal(false);
      });

      it('should reject absent zoneId bid', function () {
        let absentZoneBid = {
          bidder: 'growads',
          params: {
            param: ZONE_ID
          }
        };

        let isValid = spec.isBidRequestValid(absentZoneBid);
        expect(isValid).to.equal(false);
      });

      it('should use custom domain', function () {
        let validBid = {
          bidder: 'growads',
          params: {
            zoneId: ZONE_ID,
            domain: 'test.subdomain.growadvertising.com',
          },
        };

        let requests = spec.buildRequests([validBid]);
        expect(requests[0].url).to.have.string('test.subdomain.');
      });

      it('should use default domain', function () {
        let validBid = {
          bidder: 'growads',
          params: {
            zoneId: ZONE_ID,
          },
        };

        let requests = spec.buildRequests([validBid]);
        expect(requests[0].url).to.have.string('portal.growadvertising.com');
      });

      it('should increment zone index', function () {
        let validBids = [
          {
            bidder: 'growads',
            params: {
              zoneId: ZONE_ID,
            },
          },
          {
            bidder: 'growads',
            params: {
              zoneId: ZONE_ID,
            },
          }
        ];

        let requests = spec.buildRequests(validBids);
        expect(requests[0].data).to.include({i: 0});
        expect(requests[1].data).to.include({i: 1});
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response', function () {
        let bids = spec.interpretResponse(serverResponse, {bidRequest: bidRequests[0]});

        expect(bids).to.be.lengthOf(1);
        expect(bids[0].bidderCode).to.equal('growads');
        expect(bids[0].cpm).to.equal(1);
        expect(bids[0].width).to.equal(300);
        expect(bids[0].height).to.equal(250);
        expect(bids[0].creativeId).to.have.length.above(1);
        expect(bids[0].ad).to.have.length.above(1);
      });

      it('should return empty bid on incorrect size', function () {
        let response = utils.mergeDeep(serverResponse, {
          body: {
            width: 150,
            height: 150
          }
        });

        let bids = spec.interpretResponse(response, {bidRequest: bidRequests[0]});
        expect([]).to.be.lengthOf(0);
      });

      it('should return empty bid on incorrect CPM', function () {
        let response = utils.mergeDeep(serverResponse, {
          body: {
            cpm: 10
          }
        });

        let bids = spec.interpretResponse(response, {bidRequest: bidRequests[0]});
        expect([]).to.be.lengthOf(0);
      });
    });
  });
});
