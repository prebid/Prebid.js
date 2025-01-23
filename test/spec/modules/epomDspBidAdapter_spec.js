import { expect } from 'chai';
import { spec } from 'modules/epomDspBidAdapter.js';
import { config } from 'src/config.js';
import { logError, logWarn } from 'src/utils.js';

describe('epomDspBidAdapter', () => {
  const BIDDER_CODE = 'epomDsp';

  describe('isBidRequestValid', () => {
    it('should return true when bid has endpoint in params', () => {
      const bid = {
        params: {
          endpoint: 'https://example.com'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when endpoint is missing', () => {
      config.setBidderConfig({});
      const bid = {
        params: {}
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    it('should build requests correctly', () => {
      const bidRequests = [{
        params: {
          endpoint: 'https://example.com'
        },
        bidId: '123',
        auctionId: '456'
      }];
      const bidderRequest = {
        refererInfo: {
          referer: 'https://example.com'
        },
        gdprConsent: 'consentString',
        uspConsent: 'uspConsentString'
      };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0]).to.deep.equal({
        method: 'POST',
        url: 'https://example.com',
        data: {
          bidId: '123',
          auctionId: '456',
          referer: 'https://example.com',
          gdprConsent: 'consentString',
          uspConsent: 'uspConsentString'
        },
        options: {
          contentType: 'application/json',
          withCredentials: false
        }
      });
    });
  });

  describe('interpretResponse', () => {
    it('should interpret valid server response', () => {
      const serverResponse = {
        body: {
          bids: [{
            requestId: '123',
            cpm: 1.23,
            currency: 'USD',
            width: 300,
            height: 250,
            ad: '<html></html>',
            creativeId: '456',
            ttl: 60,
            netRevenue: true
          }]
        }
      };
      const bidResponses = spec.interpretResponse(serverResponse);
      expect(bidResponses).to.have.lengthOf(1);
      expect(bidResponses[0]).to.deep.equal({
        requestId: '123',
        cpm: 1.23,
        currency: 'USD',
        width: 300,
        height: 250,
        ad: '<html></html>',
        creativeId: '456',
        ttl: 60,
        netRevenue: true
      });
    });
  });

  describe('getUserSyncs', () => {
    it('should return iframe syncs when iframeEnabled is true', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: false
      };
      const serverResponses = [{
        body: {
          userSync: {
            iframe: 'https://example.com/iframe'
          }
        }
      }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.deep.equal({
        type: 'iframe',
        url: 'https://example.com/iframe'
      });
    });

    it('should return pixel syncs when pixelEnabled is true', () => {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true
      };
      const serverResponses = [{
        body: {
          userSync: {
            pixel: 'https://example.com/pixel'
          }
        }
      }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.deep.equal({
        type: 'image',
        url: 'https://example.com/pixel'
      });
    });

    it('should return empty array when no sync options are enabled', () => {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false
      };
      const serverResponses = [{
        body: {
          userSync: {
            iframe: 'https://example.com/iframe',
            pixel: 'https://example.com/pixel'
          }
        }
      }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.have.lengthOf(0);
    });
  });
});
