import { expect } from 'chai';
import {
  getPublisherUserId,
  createConverter,
  isBidRequestValid,
  createBuildRequests,
  interpretResponse,
  createGetUserSyncs,
} from '../../../../libraries/adsmartxUtils/bidderUtils.js';
import { BANNER, VIDEO } from '../../../../src/mediaTypes.js';

describe('AdSmartX bidderUtils', () => {
  const defaultConfig = { defaultCurrency: 'USD', defaultTtl: 60 };

  describe('getPublisherUserId', () => {
    it('returns sspUserId from bid params when present', () => {
      const bidParams = { sspUserId: 'user-from-params' };
      const bidderRequest = {};
      expect(getPublisherUserId(bidParams, bidderRequest)).to.equal('user-from-params');
    });

    it('returns ortb2.user.id when sspUserId not in params', () => {
      const bidParams = {};
      const bidderRequest = { ortb2: { user: { id: 'ortb2-user-id' } } };
      expect(getPublisherUserId(bidParams, bidderRequest)).to.equal('ortb2-user-id');
    });

    it('returns null when neither source has user id', () => {
      expect(getPublisherUserId({}, {})).to.equal(null);
      expect(getPublisherUserId({}, { ortb2: {} })).to.equal(null);
    });
  });

  describe('createConverter', () => {
    it('returns a converter that produces valid ORTB structure', () => {
      const converter = createConverter(defaultConfig);
      expect(converter).to.be.an('object');
      expect(converter.toORTB).to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('returns true for valid banner bid', () => {
      const bid = { mediaTypes: { [BANNER]: { sizes: [[300, 250]] } } };
      expect(isBidRequestValid(bid)).to.equal(true);
    });

    it('returns true for valid video bid with mimes and sizes', () => {
      const bid = {
        mediaTypes: {
          [VIDEO]: { mimes: ['video/mp4'], w: 640, h: 480 },
        },
      };
      expect(isBidRequestValid(bid)).to.equal(true);
    });

    it('returns false for video bid with empty mimes', () => {
      const bid = {
        mediaTypes: {
          [VIDEO]: { mimes: [], w: 640, h: 480 },
        },
      };
      expect(isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false for video bid with invalid width', () => {
      const bid = {
        mediaTypes: {
          [VIDEO]: { mimes: ['video/mp4'], w: 0, h: 480 },
        },
      };
      expect(isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('createBuildRequests and interpretResponse', () => {
    const endpointUrl = 'https://test.endpoint.com/ads';
    const converter = createConverter(defaultConfig);
    const buildRequests = createBuildRequests({ converter, endpointUrl });

    it('buildRequests returns POST request with endpoint and compressed option', () => {
      const validBidRequests = [
        {
          bidId: 'bid1',
          mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
          params: {},
        },
      ];
      const bidderRequest = { timeout: 3000 };
      const result = buildRequests(validBidRequests, bidderRequest);
      expect(result.method).to.equal('POST');
      expect(result.url).to.equal(endpointUrl);
      expect(result.options).to.deep.include({ endpointCompression: true });
      expect(result.data).to.be.an('object');
    });
  });

  describe('interpretResponse', () => {
    it('returns empty array when body or seatbid missing', () => {
      expect(interpretResponse(undefined, {})).to.deep.equal([]);
      expect(interpretResponse({ body: {} }, {})).to.deep.equal([]);
      expect(interpretResponse({ body: { seatbid: null } }, {})).to.deep.equal([]);
    });

    it('maps seatbid to bids with mediaType from mtype', () => {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: 'imp1',
                  price: 2.5,
                  w: 300,
                  h: 250,
                  adm: '<div>Ad</div>',
                  crid: 'c1',
                  adomain: ['example.com'],
                  mtype: 1,
                },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('imp1');
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].currency).to.equal('USD');
    });

    it('defaults unknown or null mtype to BANNER', () => {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'imp1',
                  price: 1,
                  w: 300,
                  h: 250,
                  adm: '<div>Ad</div>',
                  crid: 'c1',
                  mtype: 999,
                },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids[0].mediaType).to.equal(BANNER);
    });
  });

  describe('createGetUserSyncs', () => {
    const syncUrl = 'https://ads.example.com/sync';

    it('returns empty array when iframe and pixel disabled', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const result = getUserSyncs(
        { iframeEnabled: false, pixelEnabled: false },
        [],
        undefined,
        undefined,
        undefined
      );
      expect(result).to.deep.equal([]);
    });

    it('returns sync with URL containing gdpr and iframe_enabled', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const result = getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        { gdprApplies: true, consentString: 'consent1' },
        undefined,
        undefined
      );
      expect(result).to.have.lengthOf(1);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.include(syncUrl);
      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include('iframe_enabled=true');
    });

    it('always includes hardcoded ssp_id=630141 and no ssp_site_id', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const result = getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        undefined,
        undefined,
        undefined
      );
      expect(result[0].url).to.include('ssp_id=630141');
      expect(result[0].url).to.not.include('ssp_site_id');
    });
  });
});
