import {expect} from 'chai';
import {spec} from 'modules/adglareBidAdapter.js';

describe('AdGlare Adapter Tests', function () {
  let bidRequests;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'adglare',
        params: {
          domain: 'try.engine.adglare.net',
          zID: '475579334',
          type: 'banner'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          },
        },
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
        let validBid = {
            bidder: 'adglare',
            params: {
              domain: 'try.engine.adglare.net',
              zID: '475579334',
              type: 'banner'
            }
          },
          isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid', function () {
        let invalidBid = {
            bidder: 'adglare',
            params: {
              domain: 'somedomain.com',
              zID: 'not an integer',
              type: 'unsupported'
            }
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('should build a valid endpoint URL', function () {
        let bidRequests = [
            {
              bidder: 'adglare',
              params: {
                domain: 'try.engine.adglare.net',
                zID: '475579334',
                type: 'banner'
              },
              mediaTypes: {
                banner: {
                  sizes: [[300, 250], [300, 600]],
                },
              },
              bidId: '23acc48ad47af5',
              auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
              bidderRequestId: '1c56ad30b9b8ca8',
              transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
            }
          ],
          bidderRequest = {
            bidderCode: 'adglare',
            auctionID: '0fb4905b-9456-4152-86be-c6f6d259ba99',
            bidderRequestId: '1c56ad30b9b8ca8',
            auctionStart: 1581497568252,
            timeout: 5000,
            refererInfo: {
              referer: 'https://www.somedomain.com',
              reachedTop: true,
              numFrames: 0
            },
            start: 1581497568254
          },
          requests = spec.buildRequests(bidRequests, bidderRequest),
          requestURL = requests[0].url;

        expect(requestURL).to.have.string('https://try.engine.adglare.net/?475579334');
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response', function () {
        let serverResponse = {
            body: {
              status: 'OK',
              zID: 475579334,
              cID: 501658124,
              crID: 442123173,
              cpm: 1.5,
              ttl: 3600,
              currency: 'USD',
              width: 300,
              height: 250,
              adhtml: 'I am an ad.'
            }
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(1);
        expect(bids[0].bidderCode).to.equal('adglare');
        expect(bids[0].cpm).to.equal(1.5);
        expect(bids[0].width).to.equal(300);
        expect(bids[0].height).to.equal(250);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
      });

      it('should return empty bid response', function () {
        let serverResponse = {
            body: {
              status: 'NOADS'
            }
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });
    });
  });
});
