import { expect } from 'chai';
import { spec } from '../../../modules/contentigniteBidAdapter';

describe('Content Ignite adapter', function () {
  let bidRequests;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'contentignite',
        params: {
          accountID: '168237',
          zoneID: '299680',
          keyword: 'business',
          minCPM: '0.10',
          maxCPM: '1.00'
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[728, 90]],
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];
  });

  describe('implementation', function () {
    describe('for requests', function () {
      it('should accept valid bid', function () {
        const validBid = {
            bidder: 'contentignite',
            params: {
              accountID: '168237',
              zoneID: '299680'
            }
          },
          isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid', function () {
        const invalidBid = {
            bidder: 'contentignite',
            params: {
              accountID: '168237'
            }
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('should set the keyword parameter', function () {
        const requests = spec.buildRequests(bidRequests),
          requestURL = requests[0].url;

        expect(requestURL).to.have.string(';kw=business;');
      });

      it('should increment the count for the same zone', function () {
        const bidRequests = [
            {
              sizes: [[728, 90]],
              bidder: 'contentignite',
              params: {
                accountID: '107878',
                zoneID: '86133'
              }
            },
            {
              sizes: [[728, 90]],
              bidder: 'contentignite',
              params: {
                accountID: '107878',
                zoneID: '86133'
              }
            }
          ],
          requests = spec.buildRequests(bidRequests),
          firstRequest = requests[0].url,
          secondRequest = requests[1].url;

        expect(firstRequest).to.have.string(';place=0;');
        expect(secondRequest).to.have.string(';place=1;');
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response', function () {
        const serverResponse = {
            body: {
              status: 'SUCCESS',
              account_id: 107878,
              zone_id: 86133,
              cpm: 0.1,
              width: 728,
              height: 90,
              place: 0,
              ad_code:
                '<div id="ci_lb_14209"></div> <script type="text/javascript" src="https://connectignite.com/srv/lb/14209/add.js?serve=1" id="cilb-ads"></script>',
              tracking_pixels: []
            }
          },
          bids = spec.interpretResponse(serverResponse, {
            bidRequest: bidRequests[0]
          });

        expect(bids).to.be.lengthOf(1);
        expect(bids[0].cpm).to.equal(0.1);
        expect(bids[0].width).to.equal(728);
        expect(bids[0].height).to.equal(90);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ad).to.have.length.above(1);
      });

      it('should return empty bid response', function () {
        const serverResponse = {
            status: 'NO_ELIGIBLE_ADS',
            zone_id: 299680,
            width: 728,
            height: 90,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {
            bidRequest: bidRequests[0]
          });

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on incorrect size', function () {
        const serverResponse = {
            status: 'SUCCESS',
            account_id: 168237,
            zone_id: 299680,
            cpm: 0.1,
            width: 300,
            height: 250,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {
            bidRequest: bidRequests[0]
          });

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response with CPM too low', function () {
        const serverResponse = {
            status: 'SUCCESS',
            account_id: 168237,
            zone_id: 299680,
            cpm: 0.05,
            width: 728,
            height: 90,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {
            bidRequest: bidRequests[0]
          });

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response with CPM too high', function () {
        const serverResponse = {
            status: 'SUCCESS',
            account_id: 168237,
            zone_id: 299680,
            cpm: 7.0,
            width: 728,
            height: 90,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {
            bidRequest: bidRequests[0]
          });

        expect(bids).to.be.lengthOf(0);
      });
    });
  });
});
