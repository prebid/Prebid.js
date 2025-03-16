import * as ajax from 'src/ajax.js';
import { expect } from 'chai';
import { spec } from 'modules/fanAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from 'src/mediaTypes.js';

describe('Freedom Ad Network Bid Adapter', function () {
  describe('Test isBidRequestValid', function () {
    it('undefined bid should return false', function () {
      expect(spec.isBidRequestValid()).to.be.false;
    });

    it('null bid should return false', function () {
      expect(spec.isBidRequestValid(null)).to.be.false;
    });

    it('bid.params should be set', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('bid.params.placementId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { foo: 'bar' }
      })).to.be.false;
    });

    it('valid bid should return true', function () {
      expect(spec.isBidRequestValid({
        mediaTypes: {
          [BANNER]: {
            sizes: [[300, 250]]
          }
        },
        params: {
          placementId: 'e6203f1e-bd6d-4f42-9895-d1a19cdb83c8'
        }
      })).to.be.true;
    });
  });

  describe('Test buildRequests', function () {
    const bidderRequest = {
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      auctionStart: Date.now(),
      bidderCode: 'myBidderCode',
      bidderRequestId: '15246a574e859f',
      refererInfo: {
        page: 'http://example.com',
        stack: ['http://example.com']
      },
      gdprConsent: {
        gdprApplies: true,
        consentString: 'IwuyYwpjmnsauyYasIUWwe'
      },
      uspConsent: 'Oush3@jmUw82has',
      timeout: 3000
    };

    it('build request object', function () {
      const bidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '8064026a1776',
          bidder: 'freedomadnetwork',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          params: {
            placementId: 'e6203f1e-bd6d-4f42-9895-d1a19cdb83c8'
          }
        },
        {
          adUnitCode: 'test-native',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '8064026a1777',
          bidder: 'freedomadnetwork',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            native: {
              title: {
                required: true,
                len: 20,
              },
              image: {
                required: true,
                sizes: [300, 250],
                aspect_ratios: [{
                  ratio_width: 1,
                  ratio_height: 1
                }]
              },
              icon: {
                required: true,
                sizes: [60, 60],
                aspect_ratios: [{
                  ratio_width: 1,
                  ratio_height: 1
                }]
              },
              sponsoredBy: {
                required: true,
                len: 20
              },
              body: {
                required: true,
                len: 140
              },
              cta: {
                required: true,
                len: 20,
              }
            }
          },
          params: {
            placementId: '3f50a79e-5582-4e5c-b1f4-9dcc1c82cece'
          }
        },
        {
          adUnitCode: 'test-native2',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '8064026a1778',
          bidder: 'freedomadnetwork',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            native: {
              title: {},
              image: {},
              icon: {},
              sponsoredBy: {},
              body: {},
              cta: {}
            }
          },
          params: {
            placementId: '2015defc-19db-4cf6-926d-d2d0d32122fa',
          }
        },
        {
          adUnitCode: 'test-native3',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '8064026a1779',
          bidder: 'freedomadnetwork',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            native: {},
          },
          params: {
            placementId: '8064026a-9932-45ae-b804-03491302ad88'
          }
        }
      ];

      let reqs;

      expect(function () {
        reqs = spec.buildRequests(bidRequests, bidderRequest);
      }).to.not.throw();

      expect(reqs).to.be.an('array').that.have.lengthOf(bidRequests.length);

      for (let i = 0, len = reqs.length; i < len; i++) {
        const req = reqs[i];
        const bidRequest = bidRequests[i];

        expect(req.method).to.equal('POST');
        expect(req.url).to.equal('https://srv.freedomadnetwork.com/pb/req');

        expect(req.options).to.be.an('object');
        expect(req.options.contentType).to.contain('application/json');
        expect(req.options.customHeaders).to.be.an('object');

        expect(req.originalBidRequest).to.equal(bidRequest);

        var data = JSON.parse(req.data);
        expect(data.id).to.equal(bidRequest.bidId);
        expect(data.placements[0]).to.equal(bidRequest.params.placementId);
      }
    });
  });

  describe('Test adapter request', function () {
    const adapter = newBidder(spec);

    it('adapter.callBids exists and is a function', function () {
      expect(adapter.callBids).to.be.a('function');
    });
  });

  describe('Test response interpretResponse', function () {
    it('Test main interpretResponse', function () {
      const serverResponse = {
        body: [{
          id: '8064026a1776',
          bidid: '78e10bd4-aa67-40a6-b282-0f2697251eb3',
          impid: '88faf7e7-bef8-43a5-9ef3-73db10c2af6b',
          userId: '944c9c880be09af1e90da1f883538607',
          cpm: 17.76,
          currency: 'USD',
          width: 300,
          height: 250,
          ttl: 60,
          netRevenue: false,
          crid: '03f3ed6f-1a9e-4276-8ad7-0dc5efae289e',
          payload: '<img />',
          trackers: [],
          mediaType: 'native',
          domains: ['foo.com'],
        }]
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        originalBidRequest: {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '8064026a1776',
          bidder: 'freedomadnetwork',
          bidderRequestId: '15246a574e859f',
          mediaTypes: {
            banner: { sizes: [[300, 250]] }
          },
          params: {
            placementId: 'e6203f1e-bd6d-4f42-9895-d1a19cdb83c8'
          }
        }
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.requestId).to.equal(bid.id);
      expect(bidResponse.bidid).to.equal(bid.bidid);
      expect(bidResponse.impid).to.equal(bid.impid);
      expect(bidResponse.userId).to.equal(bid.userId);
      expect(bidResponse.cpm).to.equal(bid.cpm);
      expect(bidResponse.currency).to.equal(bid.currency);
      expect(bidResponse.width).to.equal(bid.width);
      expect(bidResponse.height).to.equal(bid.height);
      expect(bidResponse.ad).to.equal(bid.payload);
      expect(bidResponse.ttl).to.equal(bid.ttl);
      expect(bidResponse.creativeId).to.equal(bid.crid);
      expect(bidResponse.netRevenue).to.equal(bid.netRevenue);
      expect(bidResponse.trackers).to.equal(bid.trackers);
      expect(bidResponse.meta.mediaType).to.equal(bid.mediaType);
      expect(bidResponse.meta.advertiserDomains).to.equal(bid.domains);
    });

    it('Test empty server response', function () {
      const bidResponses = spec.interpretResponse({}, {});

      expect(bidResponses).to.be.an('array').that.is.empty;
    });

    it('Test empty bid response', function () {
      const bidResponses = spec.interpretResponse({ body: [] }, {});

      expect(bidResponses).to.be.an('array').that.is.empty;
    });
  });

  describe('Test getUserSyncs', function () {
    it('getUserSyncs should return empty', function () {
      const serverResponse = {};
      const syncOptions = {}
      const userSyncPixels = spec.getUserSyncs(syncOptions, [serverResponse])
      expect(userSyncPixels).to.have.lengthOf(0);
    });
  });

  describe('Test onTimeout', function () {
    it('onTimeout should not throw', function () {
      expect(spec.onTimeout()).to.not.throw;
    });
  });

  describe('Test onBidWon', function () {
    let sandbox, ajaxStub;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      ajaxStub = sandbox.stub(ajax, 'ajax');
    });

    afterEach(function () {
      sandbox.restore();
      ajaxStub.restore();
    });

    const bid = {
      bidid: '78e10bd4-aa67-40a6-b282-0f2697251eb3',
      impid: '88faf7e7-bef8-43a5-9ef3-73db10c2af6b',
      cpm: 17.76,
      trackers: ['foo.com'],
    }

    it('onBidWon empty bid should not throw', function () {
      expect(spec.onBidWon({})).to.not.throw;
      expect(ajaxStub.calledOnce).to.equal(true);
    });

    it('onBidWon valid bid should not throw', function () {
      expect(spec.onBidWon(bid)).to.not.throw;
      expect(ajaxStub.calledOnce).to.equal(true);
    });
  });

  describe('Test onSetTargeting', function () {
    it('onSetTargeting should not throw', function () {
      expect(spec.onSetTargeting()).to.not.throw;
    });
  });
});
