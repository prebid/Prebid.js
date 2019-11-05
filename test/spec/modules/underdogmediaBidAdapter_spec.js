import { expect } from 'chai';
import { spec } from 'modules/underdogmediaBidAdapter';

describe('UnderdogMedia adapter', function () {
  let bidRequests;
  let bidderRequest;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'underdogmedia',
        params: {
          siteId: 12143
        },
        adUnitCode: '/19968336/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600], [728, 90], [160, 600], [320, 50]],
          }
        },
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];

    bidderRequest = {
      timeout: 3000,
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '159': 1
          },
        },
      },
    }
  });

  describe('implementation', function () {
    describe('for requests', function () {
      it('should accept valid bid', function () {
        let validBid = {
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          }
        };
        const isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid missing sizes', function () {
        let invalidBid = {
          bidder: 'underdogmedia',
          params: {
            siteId: '12143',
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('should reject invalid bid missing siteId', function () {
        let invalidBid = {
          bidder: 'underdogmedia',
          params: {},
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('request data should contain sid', function () {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            bidder: 'underdogmedia',
            mediaTypes: {
              banner: {
                sizes: [[300, 250]]
              }
            },
            params: {
              siteId: '12143'
            },
            auctionId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.sid).to.equal('12143');
      });

      it('request data should contain sizes', function () {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              }
            },
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            auctionId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.sizes).to.equal('300x250,728x90');
      });

      it('request data should contain gdpr info', function () {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              }
            },
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            auctionId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.gdprApplies).to.equal(true);
        expect(request.data.consentGiven).to.equal(true);
        expect(request.data.consentData).to.equal('consentDataString');
      });

      it('should not build a request if no vendorConsent', function () {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              }
            },
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            auctionId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];

        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {
            gdprApplies: 1,
            consentString: 'consentDataString',
            vendorData: {
              vendorConsents: {
                '159': 0
              },
            },
          },
        }
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request).to.equal(undefined);
      });

      it('should properly build a request if no vendorConsent but no gdprApplies', function () {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              }
            },
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            auctionId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];

        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {
            gdprApplies: 0,
            consentString: 'consentDataString',
            vendorData: {
              vendorConsents: {
                '159': 0
              },
            },
          },
        }
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.sizes).to.equal('300x250,728x90');
        expect(request.data.sid).to.equal('12143');
        expect(request.data.gdprApplies).to.equal(false);
        expect(request.data.consentGiven).to.equal(false);
        expect(request.data.consentData).to.equal('consentDataString');
      });

      it('should properly build a request if gdprConsent empty', function () {
        let bidRequests = [
          {
            bidId: '3c9408cdbf2f68',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              }
            },
            bidder: 'underdogmedia',
            params: {
              siteId: '12143'
            },
            auctionId: '10b327aa396609',
            adUnitCode: '/123456/header-bid-tag-1'
          }
        ];

        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {}
        }
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.sizes).to.equal('300x250,728x90');
        expect(request.data.sid).to.equal('12143');
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response', function () {
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
        const request = spec.buildRequests(bidRequests, bidderRequest);
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

      it('should return empty bid response if mids empty', function () {
        let serverResponse = {
          body: {
            mids: []
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on incorrect size', function () {
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
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on 0 cpm', function () {
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
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response if no ad in response', function () {
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
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('ad html string should contain the notification urls', function () {
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
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids[0].ad).to.have.string('notification_url');
        expect(bids[0].ad).to.have.string(';style=adapter');
      });
    });
  });
});
