import {
  expect
} from 'chai';
import {
  spec,
  resetUserSync
} from 'modules/underdogmediaBidAdapter.js';

describe('UnderdogMedia adapter', function () {
  let bidRequests;
  let bidderRequest;

  beforeEach(function () {
    bidRequests = [{
      bidder: 'underdogmedia',
      params: {
        siteId: 12143
      },
      adUnitCode: '/19968336/header-bid-tag-1',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600],
            [728, 90],
            [160, 600],
            [320, 50]
          ],
        }
      },
      bidId: '23acc48ad47af5',
      auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
      bidderRequestId: '1c56ad30b9b8ca8',
      transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
    }];

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
              sizes: [
                [300, 250],
                [300, 600]
              ]
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
              sizes: [
                [300, 250],
                [300, 600]
              ]
            }
          }
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('request data should contain sid', function () {
        let bidRequests = [{
          bidId: '3c9408cdbf2f68',
          bidder: 'underdogmedia',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250]
              ]
            }
          },
          params: {
            siteId: '12143'
          },
          auctionId: '10b327aa396609',
          adUnitCode: '/123456/header-bid-tag-1'
        }];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.sid).to.equal(12143);
      });

      it('request data should contain sizes', function () {
        let bidRequests = [{
          bidId: '3c9408cdbf2f68',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [728, 90]
              ]
            }
          },
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          auctionId: '10b327aa396609',
          adUnitCode: '/123456/header-bid-tag-1'
        }];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].sizes[0]).to.equal('300x250');
        expect(request.data.placements[0].sizes[1]).to.equal('728x90');
      });

      it('request data should contain gdpr info', function () {
        let bidRequests = [{
          bidId: '3c9408cdbf2f68',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [728, 90]
              ]
            }
          },
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          auctionId: '10b327aa396609',
          adUnitCode: '/123456/header-bid-tag-1'
        }];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.gdpr.gdprApplies).to.equal(true);
        expect(request.data.gdpr.consentGiven).to.equal(true);
        expect(request.data.gdpr.consentData).to.equal('consentDataString');
      });

      it('should not build a request if no vendorConsent', function () {
        let bidRequests = [{
          bidId: '3c9408cdbf2f68',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [728, 90]
              ]
            }
          },
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          auctionId: '10b327aa396609',
          adUnitCode: '/123456/header-bid-tag-1'
        }];

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
        let bidRequests = [{
          bidId: '3c9408cdbf2f68',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [728, 90]
              ]
            }
          },
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          auctionId: '10b327aa396609',
          adUnitCode: '/123456/header-bid-tag-1'
        }];

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

        expect(request.data.placements[0].sizes[0]).to.equal('300x250');
        expect(request.data.placements[0].sizes[1]).to.equal('728x90');
        expect(request.data.sid).to.equal(12143);
        expect(request.data.gdpr.gdprApplies).to.equal(false);
        expect(request.data.gdpr.consentGiven).to.equal(false);
        expect(request.data.gdpr.consentData).to.equal('consentDataString');
      });

      it('should properly build a request if gdprConsent empty', function () {
        let bidRequests = [{
          bidId: '3c9408cdbf2f68',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [728, 90]
              ]
            }
          },
          bidder: 'underdogmedia',
          params: {
            siteId: '12143'
          },
          auctionId: '10b327aa396609',
          adUnitCode: '/123456/header-bid-tag-1'
        }];

        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {}
        }
        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].sizes[0]).to.equal('300x250');
        expect(request.data.placements[0].sizes[1]).to.equal('728x90');
        expect(request.data.sid).to.equal(12143);
      });

      it('should have uspConsent if defined', function () {
        const uspConsent = '1YYN'
        bidderRequest.uspConsent = uspConsent
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request.data.usp.uspConsent).to.equal(uspConsent);
      });

      it('should have correct number of placements', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        },
        {
          adUnitCode: 'div-gpt-ad-2460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '3a378b833cdef4',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-1'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        },
        {
          adUnitCode: 'div-gpt-ad-3460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '4088f04e07c2a1',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-2'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }
        ];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.usp.uspConsent).to.be.undefined;
        expect(request.data.placements.length).to.equal(3);
      });

      it('should have correct adUnitCode for each placement', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        },
        {
          adUnitCode: 'div-gpt-ad-2460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '3a378b833cdef4',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-1'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        },
        {
          adUnitCode: 'div-gpt-ad-3460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '4088f04e07c2a1',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-2'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }
        ];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.usp.uspConsent).to.be.undefined;
        expect(request.data.placements[0].adUnitCode).to.equal('div-gpt-ad-1460505748561-0');
        expect(request.data.placements[1].adUnitCode).to.equal('div-gpt-ad-2460505748561-0');
        expect(request.data.placements[2].adUnitCode).to.equal('div-gpt-ad-3460505748561-0');
      });

      it('should have gpid if it exists', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].gpid).to.equal('/19968336/header-bid-tag-0');
      });

      it('gpid should be undefined if it does not exists', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].gpid).to.equal(undefined);
      });

      it('should have productId equal to 1 if the productId is standard', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          params: {
            siteId: '12143',
            productId: 'standard'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].productId).to.equal(1);
      });

      it('should have productId equal to 2 if the productId is adhesion', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          params: {
            siteId: '12143',
            productId: 'adhesion'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].productId).to.equal(2);
      });

      it('productId should default to 1 if it is not defined', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].productId).to.equal(1);
      });

      it('should have correct sizes for multiple placements', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        },
        {
          adUnitCode: 'div-gpt-ad-2460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '3a378b833cdef4',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-1'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        },
        {
          adUnitCode: 'div-gpt-ad-3460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '4088f04e07c2a1',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-2'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }
        ];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].sizes.length).to.equal(2);
        expect(request.data.placements[0].sizes[0]).to.equal('300x250');
        expect(request.data.placements[0].sizes[1]).to.equal('160x600');
        expect(request.data.placements[1].sizes.length).to.equal(1);
        expect(request.data.placements[1].sizes[0]).to.equal('300x250');
        expect(request.data.placements[2].sizes.length).to.equal(1);
        expect(request.data.placements[2].sizes[0]).to.equal('160x600');
      });

      it('should have ref if it exists', function () {
        let bidderRequest = {
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
          refererInfo: {
            ref: 'www.example.com'
          }
        }

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.ref).to.equal('www.example.com');
      });

      it('ref should be undefined if it does not exist', function () {
        let bidderRequest = {
          timeout: 3000,
          gdprConsent: {
            gdprApplies: 1,
            consentString: 'consentDataString',
            vendorData: {
              vendorConsents: {
                '159': 1
              },
            },
          }
        }

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.ref).to.equal(undefined);
      });

      it('should have pubcid if it exists', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.userIds.pubcid).to.equal('ba6cbf43-abc0-4d61-b14f-e10f605b74d7');
      });

      it('pubcid should be undefined if it does not exist', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.userIds.pubcid).to.equal(undefined);
      });

      it('should have unifiedId if tdid if it exists', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.userIds.unifiedId).to.equal('7a9fc5a2-346d-4502-826e-017a9badf5f3');
      });

      it('unifiedId should be undefined if tdid does not exist', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.userIds.unifiedId).to.equal(undefined);
      });

      it('should have correct viewability information', function () {
        let bidRequests = [{
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          auctionId: 'dfa93f1f-6ecc-4d75-8725-f5cb92307658',
          bidId: '2dbc995ad299c',
          bidder: 'underdogmedia',
          crumbs: {
            pubcid: 'ba6cbf43-abc0-4d61-b14f-e10f605b74d7'
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [160, 600]
              ]
            }
          },
          ortb2Imp: {
            ext: {
              gpid: '/19968336/header-bid-tag-0'
            }
          },
          params: {
            siteId: '12143'
          },
          userId: {
            tdid: '7a9fc5a2-346d-4502-826e-017a9badf5f3'
          }
        }];

        const request = spec.buildRequests(bidRequests, bidderRequest);

        expect(request.data.placements[0].viewability).to.equal(-1)
      });
    });

    describe('bid responses', function () {
      it('should return complete bid response', function () {
        let serverResponse = {
          body: {
            mids: [{
              ad_code_html: 'ad_code_html',
              ad_unit_code: '/19968336/header-bid-tag-1',
              advertiser_domains: ['domain1'],
              cpm: 2.5,
              height: '600',
              mid: '32634',
              notification_url: 'notification_url',
              tid: '4',
              width: '160',
            },
            {
              ad_code_html: 'ad_code_html',
              ad_unit_code: '/19968336/header-bid-tag-1',
              cpm: 3.0,
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

        expect(bids[0].meta.advertiserDomains).to.deep.equal(['domain1'])
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
            mids: [{
              ad_code_html: 'ad_code_html',
              cpm: 2.5,
              height: '123',
              mid: '32634',
              notification_url: 'notification_url',
              tid: '4',
              width: '160'
            }]
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on 0 cpm', function () {
        let serverResponse = {
          body: {
            mids: [{
              ad_code_html: 'ad_code_html',
              cpm: 0,
              height: '600',
              mid: '32634',
              notification_url: 'notification_url',
              tid: '4',
              width: '160'
            }]
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response if no ad in response', function () {
        let serverResponse = {
          body: {
            mids: [{
              ad_code_html: '',
              cpm: 2.5,
              height: '600',
              mid: '32634',
              notification_url: 'notification_url',
              tid: '4',
              width: '160'
            }]
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids).to.be.lengthOf(0);
      });

      it('ad html string should contain the notification urls', function () {
        let serverResponse = {
          body: {
            mids: [{
              ad_code_html: 'ad_cod_html',
              ad_unit_code: '/19968336/header-bid-tag-1',
              cpm: 2.5,
              height: '600',
              mid: '32634',
              notification_url: 'notification_url',
              tid: '4',
              width: '160'
            }]
          }
        };
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bids = spec.interpretResponse(serverResponse, request);

        expect(bids[0].ad).to.have.string('notification_url');
        expect(bids[0].ad).to.have.string(';style=adapter');
      });
    });
  });

  describe('getUserSyncs', function () {
    const syncOptionsPixelOnly = {
      'pixelEnabled': true
    };

    const syncOptionsIframeOnly = {
      'iframeEnabled': true
    };

    const syncOptionsPixelAndIframe = {
      'pixelEnabled': true,
      'iframeEnabled': true
    };

    const responseWithUserSyncs = [{
      body: {
        userSyncs: [{
          type: 'image',
          url: 'https://test.url.com'
        },
        {
          type: 'iframe',
          url: 'https://test.url.com'
        }
        ]
      }
    }];

    const responseWithEmptyUserSyncs = [{
      body: {
        userSyncs: []
      }
    }];

    it('user syncs should only return what is allowed', function () {
      const result = spec.getUserSyncs(syncOptionsPixelOnly, responseWithUserSyncs);
      expect(result[0].type).to.equal('image');
      expect(result.length).to.equal(1);
    });

    it('user syncs should only load once per user', function () {
      const result = spec.getUserSyncs(syncOptionsPixelAndIframe, responseWithUserSyncs);
      expect(result).to.equal(undefined);
    });

    it('user syncs should return undefined when empty', function () {
      resetUserSync();

      const result = spec.getUserSyncs(syncOptionsPixelAndIframe, responseWithEmptyUserSyncs);
      expect(result).to.equal(undefined);
    });

    it('should reset USER_SYNCED flag, allowing another sync', function () {
      resetUserSync();

      const result = spec.getUserSyncs(syncOptionsIframeOnly, responseWithUserSyncs);
      expect(result[0].type).to.equal('iframe');
      expect(result.length).to.equal(1);
    });

    it('should return all enabled syncs', function () {
      resetUserSync();

      const result = spec.getUserSyncs(syncOptionsPixelAndIframe, responseWithUserSyncs);
      expect(result[0].type).to.equal('image');
      expect(result[1].type).to.equal('iframe');
      expect(result.length).to.equal(2);
    });
  });
});
