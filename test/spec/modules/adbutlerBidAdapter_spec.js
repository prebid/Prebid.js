import { expect } from 'chai';
import { spec } from 'modules/adbutlerBidAdapter.js';

describe('AdButler adapter', function () {
  let validBidRequests;

  beforeEach(function () {
    validBidRequests = [
      {
        bidder: 'adbutler',
        params: {
          accountID: '181556',
          zoneID: '705374',
          keyword: 'red',
          minCPM: '1.00',
          maxCPM: '5.00',
        },
        placementCode: '/19968336/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          },
        },
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
      },
    ];
  });

  describe('for requests', function () {
    describe('without account ID', function () {
      it('rejects the bid', function () {
        const invalidBid = {
          bidder: 'adbutler',
          params: {
            zoneID: '210093',
          },
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });

    describe('without a zone ID', function () {
      it('rejects the bid', function () {
        const invalidBid = {
          bidder: 'adbutler',
          params: {
            accountID: '167283',
          },
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });

    describe('with a valid bid', function () {
      describe('with a custom domain', function () {
        it('uses the custom domain', function () {
          validBidRequests[0].params.domain = 'customadbutlerdomain.com';

          const requests = spec.buildRequests(validBidRequests);
          const requestURL = requests[0].url;

          expect(requestURL).to.have.string('customadbutlerdomain.com');
        });
      });

      it('accepts the bid', function () {
        const validBid = {
          bidder: 'adbutler',
          params: {
            accountID: '167283',
            zoneID: '210093',
          },
        };
        const isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('sets default domain', function () {
        const requests = spec.buildRequests(validBidRequests);
        const request = requests[0];

        let [domain] = request.url.split('/adserve/');

        expect(domain).to.equal('https://servedbyadbutler.com');
      });

      it('sets the keyword parameter', function () {
        const requests = spec.buildRequests(validBidRequests);
        const requestURL = requests[0].url;

        expect(requestURL).to.have.string(';kw=red;');
      });

      describe('with extra params', function () {
        beforeEach(function() {
          validBidRequests[0].params.extra = {
            foo: 'bar',
          };
        });

        it('sets the extra parameter', function () {
          const requests = spec.buildRequests(validBidRequests);
          const requestURL = requests[0].url;

          expect(requestURL).to.have.string(';foo=bar;');
        });
      });

      describe('with multiple bids to the same zone', function () {
        it('increments the place count', function () {
          const requests = spec.buildRequests([validBidRequests[0], validBidRequests[0]]);
          const firstRequest = requests[0].url;
          const secondRequest = requests[1].url;

          expect(firstRequest).to.have.string(';place=0;');
          expect(secondRequest).to.have.string(';place=1;');
        });
      });
    });
  });

  describe('for server responses', function () {
    let serverResponse;

    describe('with no body', function () {
      beforeEach(function() {
        serverResponse = {
          body: null,
        };
      });

      it('does not return any bids', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(0);
      });
    });

    describe('with an incorrect size', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210083,
            cpm: 1.5,
            width: 728,
            height: 90,
            place: 0,
          },
        };
      });

      it('does not return any bids', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(0);
      });
    });

    describe('with a failed status', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            status: 'NO_ELIGIBLE_ADS',
            zone_id: 210083,
            width: 300,
            height: 250,
            place: 0,
          },
        };
      });

      it('does not return any bids', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(0);
      });
    });

    describe('with low CPM', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210093,
            cpm: 0.75,
            width: 300,
            height: 250,
            place: 0,
            ad_code: '<img src="http://image.source.com/img" alt="" title="" border="0" width="300" height="250">',
            tracking_pixels: [],
          },
        }
      });

      describe('with a minimum CPM', function () {
        it('does not return any bids', function () {
          const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });
          expect(bids).to.be.length(0);
        });
      });

      describe('with no minimum CPM', function () {
        beforeEach(function() {
          delete validBidRequests[0].params.minCPM;
        });

        it('returns a bid', function() {
          const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

          expect(bids).to.be.length(1);
        });
      });
    });

    describe('with high CPM', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210093,
            cpm: 999,
            width: 300,
            height: 250,
            place: 0,
            ad_code: '<img src="http://image.source.com/img" alt="" title="" border="0" width="300" height="250">',
            tracking_pixels: [],
          },
        }
      });

      describe('with a maximum CPM', function () {
        it('does not return any bids', function () {
          const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

          expect(bids).to.be.length(0);
        });
      });

      describe('with no maximum CPM', function () {
        beforeEach(function() {
          delete validBidRequests[0].params.maxCPM;
        });

        it('returns a bid', function() {
          const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

          expect(bids).to.be.length(1);
        });
      });
    });

    describe('with a valid ad', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210093,
            cpm: 1.5,
            width: 300,
            height: 250,
            place: 0,
            ad_code: '<img src="http://image.source.com/img" alt="" title="" border="0" width="300" height="250">',
            tracking_pixels: [
              'http://tracking.pixel.com/params=info',
            ],
          },
        };
      });

      it('returns a complete bid', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(1);
        expect(bids[0].cpm).to.equal(1.5);
        expect(bids[0].width).to.equal(300);
        expect(bids[0].height).to.equal(250);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ad).to.have.length.above(1);
        expect(bids[0].ad).to.have.string('http://tracking.pixel.com/params=info');
      });

      describe('for a bid request without banner media type', function () {
        beforeEach(function() {
          delete validBidRequests[0].mediaTypes.banner;
        });

        it('does not return any bids', function () {
          const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

          expect(bids).to.be.length(0);
        });
      });

      describe('with advertiser meta', function () {
        beforeEach(function() {
          serverResponse.body.advertiser = {
            id: 123,
            name: 'Advertiser Name',
            domain: 'advertiser.com',
          };
        });

        it('returns a bid including advertiser meta', function () {
          const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

          expect(bids).to.be.length(1);
          expect(bids[0]).to.have.property('meta');
          expect(bids[0].meta.advertiserId).to.equal(123);
          expect(bids[0].meta.advertiserName).to.equal('Advertiser Name');
          expect(bids[0].meta.advertiserDomains).to.contain('advertiser.com');
        });
      });
    });
  });
});
