import { expect } from 'chai';
import { spec } from 'modules/underdogmediaBidAdapter';

describe('UnderdogMedia adapter', () => {
  let bidRequests;

  beforeEach(() => {
    bidRequests = [
      {
        bidder: 'underdogmedia',
        params: {
          siteId: 12143
        },
        adUnitCode: '/19968336/header-bid-tag-1',
        sizes: [[300, 250], [300, 600], [728, 90], [160, 600], [320, 50]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];
  });

  describe('implementation', () => {
    describe('for requests', () => {
      it('should accept valid bid', () => {
        let validBid = {
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          sizes: [[300, 250], [300, 600]]
        };
        const isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid missing sizes', () => {
        let invalidBid = {
          bidder: 'underdogmedia',
          params: {
            siteId: '12143',
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('should reject invalid bid missing siteId', () => {
        let invalidBid = {
          bidder: 'underdogmedia',
          params: {},
          sizes: [[300, 250], [300, 600]]
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('request data should contain sid', () => {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            sizes: [[300, 250]],
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            requestId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];
        const request = spec.buildRequests(bidRequests);

        expect(request.data).to.have.string('sid=12143');
      });

      it('request data should contain sizes', () => {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            sizes: [[300, 250], [728, 90]],
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            requestId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];
        const request = spec.buildRequests(bidRequests);

        expect(request.data).to.have.string('sizes=300x250,728x90');
      });
    });

    describe('bid responses', () => {
      it('should return complete bid response', () => {
        let serverResponse = {
          body: {
            mids: [
              {
                ad_code_html: 'ad_code_html',
                cpm: 2.5,
                height: '600',
                mid: '32634',
                notification_url: 'notification_url',
                tid: '4',
                width: '160'
              },
              {
                ad_code_html: 'ad_code_html',
                cpm: 2.5,
                height: '250',
                mid: '32633',
                notification_url: 'notification_url',
                tid: '2',
                width: '300'
              },
            ]
          }
        };
        const request = spec.buildRequests(bidRequests);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(2);

        expect(bids[0].bidderCode).to.equal('underdogmedia');
        expect(bids[0].cpm).to.equal(2.5);
        expect(bids[0].width).to.equal('160');
        expect(bids[0].height).to.equal('600');
        expect(bids[0].ad).to.have.length.above(1);
        expect(bids[0].creativeId).to.equal('32634');
        expect(bids[0].currency).to.equal('USD');
      });

      it('should return empty bid response if mids empty', () => {
        let serverResponse = {
          body: {
            mids: []
          }
        };
        const request = spec.buildRequests(bidRequests);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on incorrect size', () => {
        let serverResponse = {
          body: {
            mids: [
              {
                ad_code_html: 'ad_code_html',
                cpm: 2.5,
                height: '123',
                mid: '32634',
                notification_url: 'notification_url',
                tid: '4',
                width: '160'
              }
            ]
          }
        };
        const request = spec.buildRequests(bidRequests);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on 0 cpm', () => {
        let serverResponse = {
          body: {
            mids: [
              {
                ad_code_html: 'ad_code_html',
                cpm: 0,
                height: '600',
                mid: '32634',
                notification_url: 'notification_url',
                tid: '4',
                width: '160'
              }
            ]
          }
        };
        const request = spec.buildRequests(bidRequests);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response if no ad in response', () => {
        let serverResponse = {
          body: {
            mids: [
              {
                ad_code_html: '',
                cpm: 2.5,
                height: '600',
                mid: '32634',
                notification_url: 'notification_url',
                tid: '4',
                width: '160'
              }
            ]
          }
        };
        const request = spec.buildRequests(bidRequests);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('ad html string should contain the notification urls', () => {
        let serverResponse = {
          body: {
            mids: [
              {
                ad_code_html: 'ad_cod_html',
                cpm: 2.5,
                height: '600',
                mid: '32634',
                notification_url: 'notification_url',
                tid: '4',
                width: '160'
              }
            ]
          }
        };
        const request = spec.buildRequests(bidRequests);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids[0].ad).to.have.string('notification_url');
        expect(bids[0].ad).to.have.string(';style=adapter');
      });
    });
  });
});
