import { expect } from 'chai';
import {
  getPublisherUserId,
  createConverter,
  isBidRequestValid,
  createBuildRequests,
  interpretResponse,
  createGetUserSyncs,
} from '../../../../libraries/agenticxUtils/bidderUtils.js';
import { BANNER, VIDEO, AUDIO } from '../../../../src/mediaTypes.js';

describe('AgenticX bidderUtils', () => {
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

    it('returns true for valid audio bid with mimes', () => {
      const bid = { mediaTypes: { [AUDIO]: { mimes: ['audio/mp4'] } } };
      expect(isBidRequestValid(bid)).to.equal(true);
    });

    it('returns false for audio bid with missing mimes', () => {
      const bid = { mediaTypes: { [AUDIO]: {} } };
      expect(isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false for audio bid with mimes not an array', () => {
      const bid = { mediaTypes: { [AUDIO]: { mimes: 'audio/mp4' } } };
      expect(isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false for audio bid with empty mimes array', () => {
      const bid = { mediaTypes: { [AUDIO]: { mimes: [] } } };
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

  describe('converter imp() building', () => {
    const converter = createConverter(defaultConfig);

    it('maps banner sizes to imp.banner.format', () => {
      const bidRequests = [
        {
          bidId: 'bid1',
          mediaTypes: { [BANNER]: { sizes: [[300, 250], [728, 90]] } },
          params: {},
        },
      ];
      const request = converter.toORTB({ bidRequests, bidderRequest: {} });
      expect(request.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });

    it('assigns imp.video from mediaTypes.video when video is present', () => {
      const bidRequests = [
        {
          bidId: 'bid1',
          mediaTypes: { [VIDEO]: { mimes: ['video/mp4'], w: 640, h: 480 } },
          params: {},
        },
      ];
      const request = converter.toORTB({ bidRequests, bidderRequest: {} });
      expect(request.imp[0].video).to.include({ w: 640, h: 480 });
      expect(request.imp[0].video.mimes).to.include('video/mp4');
      expect(request.imp[0]).to.not.have.property('banner');
    });

    it('assigns imp.audio from mediaTypes.audio when audio is present', () => {
      const bidRequests = [
        {
          bidId: 'bid1',
          mediaTypes: { [AUDIO]: { mimes: ['audio/mp4'], minduration: 5 } },
          params: {},
        },
      ];
      const request = converter.toORTB({ bidRequests, bidderRequest: {} });
      expect(request.imp[0].audio.mimes).to.include('audio/mp4');
      expect(request.imp[0].audio).to.include({ minduration: 5 });
      expect(request.imp[0]).to.not.have.property('banner');
      expect(request.imp[0]).to.not.have.property('video');
    });

    it('sets imp.bidfloor from bid params when present', () => {
      const bidRequests = [
        {
          bidId: 'bid1',
          mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
          params: { bidfloor: 1.25 },
        },
      ];
      const request = converter.toORTB({ bidRequests, bidderRequest: {} });
      expect(request.imp[0]).to.have.property('bidfloor', 1.25);
    });

    it('does not set imp.bidfloor when absent from bid params', () => {
      const bidRequests = [
        {
          bidId: 'bid1',
          mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
          params: {},
        },
      ];
      const request = converter.toORTB({ bidRequests, bidderRequest: {} });
      expect(request.imp[0]).to.not.have.property('bidfloor');
    });
  });

  describe('converter request() building', () => {
    const converter = createConverter(defaultConfig);
    const bidRequests = [
      {
        bidId: 'bid1',
        mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
        params: {},
      },
    ];

    it('sets cur, tmax, and test on the request', () => {
      const bidderRequest = { timeout: 2500, bids: bidRequests, test: 1 };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.cur).to.deep.equal(['USD']);
      expect(request.tmax).to.equal(2500);
      expect(request.test).to.equal(1);
    });

    it('defaults test to 0 when bidderRequest.test is not provided', () => {
      const bidderRequest = { timeout: 2500, bids: bidRequests };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.test).to.equal(0);
    });

    it('sets ext.test when a bid has params.testMode === 1', () => {
      const bidsWithTestMode = [{ ...bidRequests[0], params: { testMode: 1 } }];
      const bidderRequest = { timeout: 2500, bids: bidsWithTestMode };
      const request = converter.toORTB({ bidRequests: bidsWithTestMode, bidderRequest });
      expect(request.ext).to.have.property('test', 1);
    });

    it('does not set ext.test when no bid has testMode', () => {
      const bidderRequest = { timeout: 2500, bids: bidRequests };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.ext?.test).to.be.undefined;
    });

    it('sets ext.sspId from the first bid with params.sspId', () => {
      const bidsWithSspId = [{ ...bidRequests[0], params: { sspId: 'ssp123' } }];
      const bidderRequest = { timeout: 2500, bids: bidsWithSspId };
      const request = converter.toORTB({ bidRequests: bidsWithSspId, bidderRequest });
      expect(request.ext).to.have.property('sspId', 'ssp123');
    });

    it('sets ext.siteId from the first bid with params.siteId', () => {
      const bidsWithSiteId = [{ ...bidRequests[0], params: { siteId: 'site456' } }];
      const bidderRequest = { timeout: 2500, bids: bidsWithSiteId };
      const request = converter.toORTB({ bidRequests: bidsWithSiteId, bidderRequest });
      expect(request.ext).to.have.property('siteId', 'site456');
    });

    it('sets regs.gdpr and user.consent when gdprConsent is present', () => {
      const bidderRequest = {
        timeout: 2500,
        bids: bidRequests,
        gdprConsent: { gdprApplies: true, consentString: 'consent123' },
      };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.regs).to.have.property('gdpr', 1);
      expect(request.user).to.have.property('consent', 'consent123');
    });

    it('sets regs.gdpr to 0 when gdprApplies is false', () => {
      const bidderRequest = {
        timeout: 2500,
        bids: bidRequests,
        gdprConsent: { gdprApplies: false, consentString: 'consent123' },
      };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.regs).to.have.property('gdpr', 0);
    });

    it('sets regs.ext.us_privacy when uspConsent is present', () => {
      const bidderRequest = { timeout: 2500, bids: bidRequests, uspConsent: '1YNN' };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.regs.ext).to.have.property('us_privacy', '1YNN');
    });

    it('does not set regs or user when neither gdprConsent nor uspConsent present', () => {
      const bidderRequest = { timeout: 2500, bids: bidRequests };
      const request = converter.toORTB({ bidRequests, bidderRequest });
      expect(request.regs).to.be.undefined;
      expect(request.user).to.be.undefined;
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

    it('sets mediaType to VIDEO and includes vastXml when mtype is 2', () => {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'imp1',
                  price: 2,
                  adm: '<VAST version="3.0">video</VAST>',
                  crid: 'c1',
                  mtype: 2,
                },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastXml).to.equal('<VAST version="3.0">video</VAST>');
    });

    it('sets mediaType to AUDIO and includes vastXml when mtype is 3', () => {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'imp1',
                  price: 1.75,
                  adm: '<VAST version="3.0">audio</VAST>',
                  crid: 'c1',
                  mtype: 3,
                },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids[0].mediaType).to.equal(AUDIO);
      expect(bids[0].vastXml).to.equal('<VAST version="3.0">audio</VAST>');
    });

    it('includes dealId when dealid is present on the bid', () => {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'imp1',
                  price: 1,
                  adm: '<div>Ad</div>',
                  crid: 'c1',
                  mtype: 1,
                  dealid: 'deal123',
                },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids[0]).to.have.property('dealId', 'deal123');
    });

    it('does not include dealId when dealid is absent', () => {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                { impid: 'imp1', price: 1, adm: '<div>Ad</div>', crid: 'c1', mtype: 1 },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids[0]).to.not.have.property('dealId');
    });

    it('defaults meta.advertiserDomains to an empty array when adomain is missing', () => {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                { impid: 'imp1', price: 1, adm: '<div>Ad</div>', crid: 'c1', mtype: 1 },
              ],
            },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it('skips bids missing impid or price and only processes the first bid per seatbid', () => {
      const serverResponse = {
        body: {
          seatbid: [
            { bid: [{ price: 1, adm: '<div>Ad</div>', crid: 'c1' }] }, // missing impid
            { bid: [{ impid: 'imp2', adm: '<div>Ad</div>', crid: 'c1' }] }, // missing price
            { bid: [] }, // empty bid array
            { bid: [{ impid: 'imp3', price: 3, adm: '<div>Ad</div>', crid: 'c1', mtype: 1 }] },
          ],
        },
      };
      const bids = interpretResponse(serverResponse, {}, defaultConfig);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('imp3');
    });

    it('returns empty array when seatbid.bid is not an array', () => {
      const serverResponse = { body: { seatbid: [{ bid: 'invalid' }] } };
      expect(interpretResponse(serverResponse, {}, defaultConfig)).to.deep.equal([]);
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

    it('returns image type sync when only pixelEnabled is true', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const result = getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.include('iframe_enabled=false');
    });

    it('includes us_privacy param when uspConsent is present', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const result = getUserSyncs({ iframeEnabled: true }, [], undefined, '1YNN');
      expect(result[0].url).to.include('us_privacy=1YNN');
    });

    it('includes gpp and gpp_sid params when gppConsent has applicableSections', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const gppConsent = { gppString: 'DBABLA~1YNN', applicableSections: [7, 8] };
      const result = getUserSyncs({ iframeEnabled: true }, [], undefined, undefined, gppConsent);
      expect(result[0].url).to.include('gpp=DBABLA~1YNN');
      expect(result[0].url).to.include('gpp_sid=7%2C8');
    });

    it('omits gpp params when applicableSections is empty', () => {
      const getUserSyncs = createGetUserSyncs(syncUrl);
      const gppConsent = { gppString: 'DBABLA~1YNN', applicableSections: [] };
      const result = getUserSyncs({ iframeEnabled: true }, [], undefined, undefined, gppConsent);
      expect(result[0].url).to.not.include('gpp=');
    });
  });
});
