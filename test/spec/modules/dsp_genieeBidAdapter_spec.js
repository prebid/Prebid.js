import { expect } from 'chai';
import { spec } from 'modules/genieeBidAdapter.js';
import { config } from 'src/config';

describe('Geniee adapter tests', () => {
  const validBidderRequest = {
    code: 'sample_request',
    bids: [{
      bidId: 'bid-id',
      bidder: 'dsp_geniee',
      params: {
        test: 1
      }
    }],
    gdprConsent: {
      gdprApplies: false
    },
    uspConsent: '1YNY'
  };

  describe('buildRequests function test', () => {
    it('auction', () => {
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      const auction_id = request.data.id;
      expect(request).deep.equal({
        method: 'POST',
        url: 'https://rt.gsspat.jp/prebid_auction',
        data: {
          at: 1,
          id: auction_id,
          imp: [
            {
              ext: {
                test: 1
              },
              id: 'bid-id'
            }
          ],
          test: 1
        },
      });
    });
    it('uncomfortable (gdpr)', () => {
      const bidderRequest = structuredClone(validBidderRequest);
      bidderRequest.gdprConsent.gdprApplies = true;
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
    });
    it('uncomfortable (usp)', () => {
      const bidderRequest = structuredClone(validBidderRequest);
      bidderRequest.uspConsent = '1YYY';
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
    });
    it('uncomfortable (coppa)', () => {
      const bidderRequest = structuredClone(validBidderRequest);
      config.setConfig({ coppa: true });
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
      config.setConfig({ coppa: false });
    });
    it('uncomfortable (currency)', () => {
      const bidderRequest = structuredClone(validBidderRequest);
      config.setConfig({ currency: { adServerCurrency: 'TWD' } });
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request).deep.equal({
        method: 'GET',
        url: 'https://rt.gsspat.jp/prebid_uncomfortable',
      });
      config.setConfig({ currency: { adServerCurrency: 'JPY' } });
    });
  });
  describe('interpretResponse function test', () => {
    it('empty bid', () => {
      const request = spec.buildRequests(validBidderRequest.bids, validBidderRequest);
      const auction_id = request.data.id;
      expect(request).deep.equal({
        method: 'POST',
        url: 'https://rt.gsspat.jp/prebid_auction',
        data: {
          at: 1,
          id: auction_id,
          imp: [{
            ext: {
              test: 1
            },
            id: 'bid-id'
          }],
          test: 1
        },
      });
      const serverResponse = {
        body: {
          id: auction_id,
          bidid: 'ace9ac85bdeb42eea7c8bcba27991f5162db1f07',
          cur: 'JPY',
          seatbid: [{
            seat: '9487',
            bid: [{
              id: '1',
              impid: 'bid-id',
              price: 1.777458324324324,
              adid: '5015259',
              adm: 'test-adm',
              cid: '47361',
              crid: '792361',
              mtype: 1,
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).deep.equal([{
        'ad': 'test-adm',
        'cpm': 1.777458324324324,
        'creativeId': '792361',
        'creative_id': '792361',
        'currency': 'JPY',
        'mediaType': 'banner',
        'meta': {},
        'netRevenue': true,
        'requestId': 'bid-id',
        'seatBidId': '1',
        'ttl': 300
      }]);
    });
    it('no bid', () => {
      const serverResponse = {};
      const bids = spec.interpretResponse(serverResponse, validBidderRequest);
      expect(bids).deep.equal([]);
    });
  });
  describe('getUserSyncs function test', () => {
    it('sync enabled', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const serverResponses = [];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).deep.equal([{
        type: 'image',
        url: 'https://rt.gsspat.jp/prebid_cs'
      }]);
    });
    it('sync disabled (option false)', () => {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false
      };
      const serverResponses = [];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).deep.equal([]);
    });
    it('sync disabled (gdpr)', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const serverResponses = [];
      const gdprConsent = {
        gdprApplies: true
      };
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(syncs).deep.equal([]);
    });
  });
});
