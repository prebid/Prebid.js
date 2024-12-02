import { expect } from 'chai';
import {
  addRenderer,
  billBid,
  buildRequest,
  interpretResponse,
  spec,
  syncUser,
  validateMichaoParams,
} from '../../../modules/michaoBidAdapter';
import * as utils from 'src/utils.js';
import { config } from '../../../src/config';

describe('the michao bidder adapter', () => {
  beforeEach(() => {
    config.resetConfig();
  });

  describe('unit', () => {
    describe('validate bid request', () => {
      const invalidBidParams = [
        { site: '123', placement: 'super-placement' },
        { site: '123', placement: 456 },
        { site: Infinity, placement: 456 },
      ];
      invalidBidParams.forEach((params) => {
        it('Detecting incorrect parameters', () => {
          const result = validateMichaoParams(params);

          expect(result).to.be.false;
        });
      });

      it('If the site ID and placement ID are correct, the verification succeeds.', () => {
        const params = {
          site: 123,
          placement: 234,
        };

        const result = validateMichaoParams(params);

        expect(result).to.be.true;
      });
    });

    describe('build bid request', () => {
      it('Banner bid requests are converted to banner server request objects', () => {
        const bannerBidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: { banner: [[300, 250]] },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [bannerBidRequest],
        };

        const result = buildRequest(bannerBidRequest, bidderRequest, 'banner');

        expect(result).to.nested.include({
          url: 'https://rtb.michao-ssp.com/openrtb/prebid',
          'options.contentType': 'application/json',
          'options.withCredentials': true,
          method: 'POST',
          'data.cur[0]': 'USD',
          'data.imp[0].ext.placement': '456',
          'data.site.id': '123',
          'data.test': 0,
        });
      });

      it('Video bid requests are converted to video server request objects', () => {
        const videoBidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
            },
          },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [videoBidRequest],
        };

        const result = buildRequest(videoBidRequest, bidderRequest, 'banner');

        expect(result).to.nested.include({
          url: 'https://rtb.michao-ssp.com/openrtb/prebid',
          'options.contentType': 'application/json',
          'options.withCredentials': true,
          method: 'POST',
          'data.cur[0]': 'USD',
          'data.imp[0].ext.placement': '456',
          'data.site.id': '123',
          'data.test': 0,
        });
      });

      it('Native bid requests are converted to video server request objects', () => {
        const nativeBidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: {
            native: {
              ortb: {
                assets: [
                  {
                    id: 2,
                    required: 1,
                    title: {
                      len: 80
                    }
                  }
                ]
              }
            }
          },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [nativeBidRequest],
        };

        const result = buildRequest(nativeBidRequest, bidderRequest, 'native');

        expect(result).to.nested.include({
          url: 'https://rtb.michao-ssp.com/openrtb/prebid',
          'options.contentType': 'application/json',
          'options.withCredentials': true,
          method: 'POST',
          'data.cur[0]': 'USD',
          'data.imp[0].ext.placement': '456',
          'data.site.id': '123',
          'data.test': 0,
        });
      });

      it('Converted to server request object for testing in debug mode', () => {
        const bidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: { banner: [[300, 250]] },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [bidRequest],
        };
        config.setConfig({
          debug: true,
        });

        const result = buildRequest(bidRequest, bidderRequest, 'banner');

        expect(result).to.nested.include({
          'data.test': 1,
        });
      });

      it('Specifying a reward builds a bid request for the reward.', () => {
        const bidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: { banner: [[300, 250]] },
          params: {
            site: 123,
            placement: 456,
            reward: true,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [bidRequest],
        };
        config.setConfig({
          debug: true,
        });

        const result = buildRequest(bidRequest, bidderRequest, 'banner');

        expect(result).to.nested.include({
          'data.imp[0].rwdd': 1,
        });
      });
    });

    describe('interpret response', () => {
      it('Server response is interpreted as a bid.', () => {
        const response = {
          headers: null,
          body: {
            id: 'requestId',
            seatbid: [
              {
                bid: [
                  {
                    id: 'bidId1',
                    impid: 'bidId1',
                    price: 0.18,
                    adm: '<script>adm</script>',
                    adid: '144762342',
                    adomain: ['https://dummydomain.com'],
                    iurl: 'iurl',
                    cid: '109',
                    crid: 'creativeId',
                    cat: [],
                    w: 300,
                    h: 250,
                    mtype: 1,
                  },
                ],
                seat: 'seat',
              },
            ],
            cur: 'USD',
          },
        };
        const bannerBidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: 'bidId1',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: { banner: [[300, 250]] },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [bannerBidRequest],
        };
        const request = buildRequest(bannerBidRequest, bidderRequest, 'banner');

        const result = interpretResponse(response, request);

        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('currency', 'USD');
        expect(result[0]).to.have.property('requestId', 'bidId1');
        expect(result[0]).to.have.property('cpm', 0.18);
        expect(result[0]).to.have.property('width', 300);
        expect(result[0]).to.have.property('height', 250);
        expect(result[0]).to.have.property('ad', '<script>adm</script>');
        expect(result[0]).to.have.property('creativeId', 'creativeId');
        expect(result[0]).to.have.property('netRevenue', true);
      });

      it('Empty server responses are interpreted as empty bids', () => {
        const response = { body: {} };
        const bannerBidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: '22c4871113f461',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: { banner: [[300, 250]] },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [bannerBidRequest],
        };
        const request = buildRequest(bannerBidRequest, bidderRequest, 'banner');

        const result = interpretResponse(response, request);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(0);
      });

      it('Set renderer with outstream video ads', () => {
        const response = {
          headers: null,
          body: {
            id: 'requestId',
            seatbid: [
              {
                bid: [
                  {
                    id: 'bidId1',
                    impid: 'bidId1',
                    price: 0.18,
                    adm: '<VAST></VAST>',
                    adid: '144762342',
                    adomain: ['https://dummydomain.com'],
                    iurl: 'iurl',
                    cid: '109',
                    crid: 'creativeId',
                    cat: [],
                    w: 300,
                    h: 250,
                    mtype: 1,
                  },
                ],
                seat: 'seat',
              },
            ],
            cur: 'USD',
          },
        };
        const videoBidRequest = {
          adUnitCode: 'test-div',
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          bidId: 'bidId1',
          bidder: 'michao',
          bidderRequestId: '15246a574e859f',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              minduration: 0,
              maxduration: 30,
              protocols: [7]
            },
          },
          params: {
            site: 123,
            placement: 456,
          },
        };
        const bidderRequest = {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidderCode: 'michao',
          bidderRequestId: '15246a574e859f',
          bids: [videoBidRequest],
        };
        const request = buildRequest(videoBidRequest, bidderRequest, 'video');

        const result = interpretResponse(response, request);

        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('currency', 'USD');
        expect(result[0]).to.have.property('requestId', 'bidId1');
        expect(result[0]).to.have.property('cpm', 0.18);
        expect(result[0]).to.have.property('width', 300);
        expect(result[0]).to.have.property('height', 250);
        expect(result[0]).to.have.property('vastXml', '<VAST></VAST>');
        expect(result[0]).to.have.property('creativeId', 'creativeId');
        expect(result[0]).to.have.property('netRevenue', true);
        expect(result[0]).to.have.property('mediaType', 'video');
        expect(result[0]).to.have.property('renderer');
      });
    });

    describe('user syncs', () => {
      it('Sync Users', () => {
        const gdprConsent = {
          gdprApplies: false,
          consentString: '',
        };

        const result = syncUser(gdprConsent);

        expect(result).to.deep.equal({
          type: 'iframe',
          url: 'https://sync.michao-ssp.com/cookie-syncs?gdpr=0&gdpr_consent=',
        });
      });
    });

    describe('bill a bid', () => {
      const triggerPixelSpy = sinon.spy(utils, 'triggerPixel');
      const bid = {
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'michao',
        bidderRequestId: '15246a574e859f',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        mediaTypes: { banner: [[300, 250]] },
        params: {
          site: 123,
          placement: 456,
        },
        burl: 'https://example.com/burl',
      };

      billBid(bid);

      expect(triggerPixelSpy.calledWith('https://example.com/burl')).to.true;
      triggerPixelSpy.restore();
    });

    describe('renderer', () => {
      it('Set outstream renderer', () => {
        const bid = {
          renderer: [],
        };

        addRenderer(bid);

        expect(bid.renderer[0]).that.is.a('function');
      });
    });
  });

  describe('integration', () => {
    it('`isBidRequestValid`', () => {
      const validBidRequest = {
        params: {
          placement: 124,
          site: 456,
        },
      };

      const result = spec.isBidRequestValid(validBidRequest);

      expect(result).to.true;
    });

    it('`buildRequests`', () => {
      const validBidRequests = [
        {
          adUnitCode: 'test-div',
          auctionId: 'auction-1',
          bidId: 'bid-1',
          bidder: 'michao',
          bidderRequestId: 'bidder-request-1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          params: {
            site: 12,
            placement: 12,
          },
        },
        {
          adUnitCode: 'test-div',
          auctionId: 'auction-2',
          bidId: 'bid-2',
          bidder: 'michao',
          bidderRequestId: 'bidder-request-2',
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
            },
          },
          params: {
            site: 12,
            placement: 12,
          },
        },
        {
          adUnitCode: 'test-div',
          auctionId: 'auction-2',
          bidId: 'bid-2',
          bidder: 'michao',
          bidderRequestId: 'bidder-request-2',
          mediaTypes: {
            native: {
              ortb: {
                assets: [
                  {
                    id: 2,
                    required: 1,
                    title: {
                      len: 80
                    }
                  }
                ]
              }
            },
          },
          params: {
            site: 12,
            placement: 12,
          },
        },
      ];
      const bidderRequest = {
        auctionId: 'auction-1',
        auctionStart: 1579746300522,
        bidderCode: 'michao',
        bidderRequestId: 'bidder-request-1',
      };

      const result = spec.buildRequests(validBidRequests, bidderRequest);

      expect(result.length).to.equal(3);
    });

    it('`interpretResponse`', () => {
      const response = {
        headers: null,
        body: {
          id: 'requestId',
          seatbid: [
            {
              bid: [
                {
                  id: 'bidId1',
                  impid: 'bidId1',
                  price: 0.18,
                  adm: '<div>ad</div>',
                  adid: '144762342',
                  adomain: ['https://dummydomain.com'],
                  iurl: 'iurl',
                  cid: '109',
                  crid: 'creativeId',
                  cat: [],
                  w: 640,
                  h: 480,
                  mtype: 1,
                },
              ],
              seat: 'seat',
            },
          ],
          cur: 'USD',
        },
      };
      const bannerBidRequest = {
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: 'bidId1',
        bidder: 'michao',
        bidderRequestId: '15246a574e859f',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          },
        },
        params: {
          site: 123,
          placement: 456,
        },
      };
      const bidderRequest = {
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        auctionStart: 1579746300522,
        bidderCode: 'michao',
        bidderRequestId: '15246a574e859f',
        bids: [bannerBidRequest],
      };
      const request = buildRequest(bannerBidRequest, bidderRequest, 'banner');

      const result = interpretResponse(response, request);

      expect(result).to.be.an('array');
      expect(result[0]).to.have.property('currency', 'USD');
      expect(result[0]).to.have.property('requestId', 'bidId1');
      expect(result[0]).to.have.property('cpm', 0.18);
      expect(result[0]).to.have.property('width', 640);
      expect(result[0]).to.have.property('height', 480);
      expect(result[0]).to.have.property('ad', '<div>ad</div>');
      expect(result[0]).to.have.property('creativeId', 'creativeId');
      expect(result[0]).to.have.property('netRevenue', true);
    });

    it('`getUserSyncs`', () => {
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString:
          'CQIhBPbQIhBPbEkAAAENCZCAAAAAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
      };

      const result = spec.getUserSyncs(syncOptions, {}, gdprConsent);

      expect(result).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://sync.michao-ssp.com/cookie-syncs?gdpr=1&gdpr_consent=CQIhBPbQIhBPbEkAAAENCZCAAAAAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
        },
      ]);
    });

    it('`onBidBillable`', () => {
      const triggerPixelSpy = sinon.spy(utils, 'triggerPixel');
      const bid = {
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'michao',
        bidderRequestId: '15246a574e859f',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        mediaTypes: { banner: [[300, 250]] },
        params: {
          site: 123,
          placement: 456,
        },
        burl: 'https://example.com/burl',
      };

      spec.onBidBillable(bid);

      expect(triggerPixelSpy.calledWith('https://example.com/burl')).to.true;
      triggerPixelSpy.restore();
    });
  });
});
