import sinon from 'sinon';
import { expect } from 'chai';
import { spec, ADAPTER_VERSION } from 'modules/apsBidAdapter';
import { config } from 'src/config.js';

/**
 * Update config without rewriting the entire aps scope.
 *
 * Every call to setConfig() overwrites supplied values at the top level.
 * e.g. if ortb2 is provided as a value, any previously-supplied ortb2
 * values will disappear.
 */
const updateAPSConfig = (data) => {
  const existingAPSConfig = config.readConfig('aps');
  config.setConfig({
    aps: {
      ...existingAPSConfig,
      ...data,
    },
  });
};

describe('apsBidAdapter', () => {
  const accountID = 'test-account';

  beforeEach(() => {
    updateAPSConfig({ accountID });
  });

  afterEach(() => {
    config.resetConfig();
    delete window._aps;
  });

  describe('isBidRequestValid', () => {
    it('should record prebidAdapter/isBidRequestValid/didTrigger event', () => {
      spec.isBidRequestValid({});

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/isBidRequestValid/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.isBidRequestValid({});

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.isBidRequestValid({});

      expect(window._aps).not.to.exist;
    });

    [
      { accountID: undefined },
      { accountID: null },
      { accountID: [] },
      { accountID: { key: 'value' } },
      { accountID: true },
      { accountID: false },
    ].forEach((scenario) => {
      it(`when accountID is ${JSON.stringify(scenario.accountID)}, should return false`, () => {
        updateAPSConfig({ accountID: scenario.accountID });
        const actual = spec.isBidRequestValid({});
        expect(actual).to.equal(false);
      });
    });

    it('when accountID is a number, should return true', () => {
      updateAPSConfig({ accountID: 1234 });
      const actual = spec.isBidRequestValid({});
      expect(actual).to.equal(true);
    });

    it('when accountID is a string, should return true', () => {
      updateAPSConfig({ accountID: '1234' });
      const actual = spec.isBidRequestValid({});
      expect(actual).to.equal(true);
    });
  });

  describe('buildRequests', () => {
    let bidRequests, bidderRequest;

    beforeEach(() => {
      bidRequests = [
        {
          bidId: 'bid1',
          adUnitCode: 'adunit1',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          params: {},
        },
        {
          bidId: 'bid2',
          code: 'video_div',
          mediaTypes: {
            video: {
              playerSize: [400, 225],
              context: 'outstream',
              mimes: ['video/mp4'],
              protocols: [1, 2, 3, 4, 5, 6, 7, 8],
              minduration: 5,
              maxduration: 30,
              placement: 3,
            },
          },
          bids: [{ bidder: 'aps' }],
        },
      ];
      bidderRequest = {
        bidderCode: 'aps',
        auctionId: 'auction1',
        bidderRequestId: 'request1',
      };
    });

    it('should record prebidAdapter/buildRequests/didTrigger event', () => {
      spec.buildRequests(bidRequests, bidderRequest);

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/buildRequests/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.buildRequests(bidRequests, bidderRequest);

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.buildRequests(bidRequests, bidderRequest);

      expect(window._aps).not.to.exist;
    });

    it('should return server request with default endpoint', () => {
      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.method).to.equal('POST');
      expect(result.url).to.equal(
        'https://web.ads.aps.amazon-adsystem.com/e/pb/bid'
      );
      expect(result.data).to.exist;
    });

    it('should return server request with properly formatted impressions', () => {
      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data.imp.length).to.equal(2);
      expect(result.data.imp[0]).to.deep.equal({
        banner: { format: [{ h: 250, w: 300 }], h: 250, topframe: 0, w: 300 },
        id: 'bid1',
        secure: 1,
      });
      expect(result.data.imp[1]).to.deep.equal({
        id: 'bid2',
        secure: 1,
        ...(FEATURES.VIDEO && {
          video: {
            h: 225,
            maxduration: 30,
            mimes: ['video/mp4'],
            minduration: 5,
            placement: 3,
            protocols: [1, 2, 3, 4, 5, 6, 7, 8],
            w: 400,
          },
        }),
      });
    });

    it('when debugURL is provided, should use custom debugURL', () => {
      updateAPSConfig({ debugURL: 'https://example.com' });

      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.url).to.equal('https://example.com');
    });

    it('should convert bid requests to ORTB format with account', () => {
      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data).to.be.an('object');
      expect(result.data.ext).to.exist;
      expect(result.data.ext.account).to.equal(accountID);
    });

    it('should include ADAPTER_VERSION in request data', () => {
      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data.ext.sdk.version).to.equal(ADAPTER_VERSION);
      expect(result.data.ext.sdk.source).to.equal('prebid');
    });

    it('when accountID is not provided, should convert bid requests to ORTB format with no account', () => {
      updateAPSConfig({ accountID: undefined });

      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data).to.be.an('object');
      expect(result.data.ext).to.exist;
      expect(result.data.ext.account).to.equal(undefined);
    });

    it('should remove sensitive geo data from device', () => {
      bidderRequest.ortb2 = {
        device: {
          geo: {
            lat: 37.7749,
            lon: -122.4194,
            country: 'US',
          },
        },
      };

      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data.device.geo.lat).to.be.undefined;
      expect(result.data.device.geo.lon).to.be.undefined;
      expect(result.data.device.geo.country).to.equal('US');
    });

    it('should remove sensitive user data', () => {
      bidderRequest.ortb2 = {
        user: {
          gender: 'M',
          yob: 1990,
          keywords: 'sports,tech',
          kwarry: 'alternate keywords',
          customdata: 'custom user data',
          geo: { lat: 37.7749, lon: -122.4194 },
          data: [{ id: 'segment1' }],
          id: 'user123',
        },
      };

      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data.user.gender).to.be.undefined;
      expect(result.data.user.yob).to.be.undefined;
      expect(result.data.user.keywords).to.be.undefined;
      expect(result.data.user.kwarry).to.be.undefined;
      expect(result.data.user.customdata).to.be.undefined;
      expect(result.data.user.geo).to.be.undefined;
      expect(result.data.user.data).to.be.undefined;
      expect(result.data.user.id).to.equal('user123');
    });

    it('should set default currency to USD', () => {
      const result = spec.buildRequests(bidRequests, bidderRequest);

      expect(result.data.cur).to.deep.equal(['USD']);
    });

    [
      { imp: undefined },
      { imp: null },
      { imp: 'not an array' },
      { imp: 123 },
      { imp: true },
      { imp: false },
    ].forEach((scenario) => {
      it(`when imp is ${JSON.stringify(scenario.imp)}, should send data`, () => {
        bidderRequest.ortb2 = {
          imp: scenario.imp,
        };

        const result = spec.buildRequests(bidRequests, bidderRequest);

        expect(result.data.imp).to.equal(scenario.imp);
      });
    });

    [
      { imp: [null] },
      { imp: [undefined] },
      { imp: [null, {}] },
      { imp: [{}, null] },
      { imp: [undefined, {}] },
      { imp: [{}, undefined] },
    ].forEach((scenario, scenarioIndex) => {
      it(`when imp array contains null/undefined at index, should send data - scenario ${scenarioIndex}`, () => {
        bidRequests = [];
        bidderRequest.ortb2 = { imp: scenario.imp };

        const result = spec.buildRequests(bidRequests, bidderRequest);

        expect(result.data.imp).to.deep.equal(scenario.imp);
      });
    });

    [
      { w: 'invalid', h: 250 },
      { w: 300, h: 'invalid' },
      { w: null, h: 250 },
      { w: 300, h: undefined },
      { w: true, h: 250 },
      { w: 300, h: false },
      { w: {}, h: 250 },
      { w: 300, h: [] },
    ].forEach((scenario) => {
      it(`when imp array contains banner object with invalid format (h: "${scenario.h}", w: "${scenario.w}"), should send data`, () => {
        const { w, h } = scenario;
        const invalidBannerObj = {
          banner: {
            format: [
              { w, h },
              { w: 300, h: 250 },
            ],
          },
        };
        const imp = [
          { banner: { format: [{ w: 300, h: 250 }] } },
          { video: { w: 300, h: undefined } },
          invalidBannerObj,
          { video: { w: undefined, h: 300 } },
        ];
        bidRequests = [];
        bidderRequest.ortb2 = { imp };

        const result = spec.buildRequests(bidRequests, bidderRequest);

        expect(result.data.imp).to.deep.equal(imp);
      });
    });

    describe('when debug mode is enabled', () => {
      beforeEach(() => {
        updateAPSConfig({ debug: true });
      });

      it('should append debug parameters', () => {
        const result = spec.buildRequests(bidRequests, bidderRequest);

        expect(result.url).to.equal(
          'https://web.ads.aps.amazon-adsystem.com/e/pb/bid?amzn_debug_mode=1'
        );
      });

      it('when using custom endpoint, should append debug parameters', () => {
        updateAPSConfig({ debugURL: 'https://example.com' });

        const result = spec.buildRequests(bidRequests, bidderRequest);

        expect(result.url).to.equal('https://example.com?amzn_debug_mode=1');
      });

      it('when endpoint has existing query params, should append debug parameters with &', () => {
        updateAPSConfig({
          debugURL: 'https://example.com?existing=param',
        });

        const result = spec.buildRequests(bidRequests, bidderRequest);

        expect(result.url).to.equal(
          'https://example.com?existing=param&amzn_debug_mode=1'
        );
      });

      describe('when renderMethod is fif', () => {
        beforeEach(() => {
          updateAPSConfig({ renderMethod: 'fif' });
        });

        it('when renderMethod is fif, should append fif debug parameters', () => {
          const result = spec.buildRequests(bidRequests, bidderRequest);

          expect(result.url).to.equal(
            'https://web.ads.aps.amazon-adsystem.com/e/pb/bid?amzn_debug_mode=fif&amzn_debug_mode=1'
          );
        });
      });
    });
  });

  describe('interpretResponse', () => {
    const impid = '32adcfab8e54178';
    let response, request, bidRequests, bidderRequest;

    beforeEach(() => {
      bidRequests = [
        {
          bidder: 'aps',
          params: {},
          ortb2Imp: { ext: { data: {} } },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          adUnitCode: 'display-ad',
          adUnitId: '57661158-f277-4061-bbfc-532b6f811c7b',
          sizes: [[300, 250]],
          bidId: impid,
          bidderRequestId: '2a1ec2d1ccea318',
        },
      ];
      bidderRequest = {
        bidderCode: 'aps',
        auctionId: null,
        bidderRequestId: '2a1ec2d1ccea318',
        bids: [
          {
            bidder: 'aps',
            params: {},
            ortb2Imp: { ext: { data: {} } },
            mediaTypes: { banner: { sizes: [[300, 250]] } },
            adUnitCode: 'display-ad',
            adUnitId: '57661158-f277-4061-bbfc-532b6f811c7b',
            sizes: [[300, 250]],
            bidId: impid,
            bidderRequestId: '2a1ec2d1ccea318',
          },
        ],
        start: 1758899825329,
      };

      request = spec.buildRequests(bidRequests, bidderRequest);

      response = {
        body: {
          id: '53d4dda2-cf3d-455a-8554-48f051ca4ad3',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  mtype: 1,
                  id: 'jp45_n29nkvhfuttv0rhl5iaaagvz_t54weaaaxzaqbhchnfdhhux2jpzdigicbhchnfdhhux2ltcdegicdpqbra',
                  adid: 'eaayacognuhq9jcfs8rwkoyyhmwtke4e4jmnrjcx.ywnbprnvr0ybkk6wpu_',
                  price: 5.5,
                  impid,
                  crid: 'amazon-test-ad',
                  w: 300,
                  h: 250,
                  exp: 3600,
                },
              ],
            },
          ],
        },
        headers: {},
      };
    });

    it('should record prebidAdapter/interpretResponse/didTrigger event', () => {
      spec.interpretResponse(response, request);

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(2);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/buildRequests/didTrigger'
      );
      expect(accountQueue[1].type).to.equal(
        'prebidAdapter/interpretResponse/didTrigger'
      );
    });

    it('should return interpreted bids from ORTB response', () => {
      const result = spec.interpretResponse(response, request);

      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
    });

    it('should include accountID in creative script', () => {
      updateAPSConfig({ accountID: accountID });

      const result = spec.interpretResponse(response, request);

      expect(result).to.have.length(1);
      expect(result[0].ad).to.include("const accountID = 'test-account'");
    });

    it('when creativeURL is provided, should use custom creative URL', () => {
      updateAPSConfig({
        creativeURL: 'https://custom-creative.com/script.js',
      });

      const result = spec.interpretResponse(response, request);

      expect(result).to.have.length(1);
      expect(result[0].ad).to.include(
        'src="https://custom-creative.com/script.js"'
      );
    });

    it('should use default creative URL when not provided', () => {
      const result = spec.interpretResponse(response, request);

      expect(result).to.have.length(1);
      expect(result[0].ad).to.include(
        'src="https://client.aps.amazon-adsystem.com/prebid-creative.js"'
      );
    });

    describe('when bid mediaType is VIDEO', () => {
      beforeEach(() => {
        response.body.seatbid[0].bid[0].mtype = 2;
      });

      it('should not inject creative script for video bids', () => {
        const result = spec.interpretResponse(response, request);

        expect(result).to.have.length(1);
        expect(result[0].ad).to.be.undefined;
      });
    });

    describe('when bid mediaType is not VIDEO', () => {
      it('should inject creative script for non-video bids', () => {
        const result = spec.interpretResponse(response, request);

        expect(result).to.have.length(1);
        expect(result[0].ad).to.include('<script src=');
        expect(result[0].ad).to.include('prebid/creative/render');
      });

      it('should include base64 encoded response in creative script', () => {
        const result = spec.interpretResponse(response, request);
        const expectedEncodedResponse = btoa(JSON.stringify(response.body));

        expect(result).to.have.length(1);
        expect(result[0].ad).to.include(
          `aaxResponse: '${expectedEncodedResponse}'`
        );
      });
    });
  });

  describe('getUserSyncs', () => {
    let syncOptions, serverResponses, gdprConsent, uspConsent;

    beforeEach(() => {
      syncOptions = undefined;
      serverResponses = [];
      gdprConsent = undefined;
      uspConsent = '1YNN';
    });

    it('should record prebidAdapter/getUserSyncs/didTrigger event', () => {
      spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/getUserSyncs/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);

      expect(window._aps).not.to.exist;
    });

    it('Given 0 server responses, should return empty list', () => {
      const result = spec.getUserSyncs(
        syncOptions,
        serverResponses,
        gdprConsent,
        uspConsent
      );
      expect(result).deep.equal([]);
    });

    describe('Given 1 server response', () => {
      beforeEach(() => {
        serverResponses = [{ body: { ext: { userSyncs: [] } } }];
      });

      it('when server response is missing body, should return empty list', () => {
        serverResponses[0].body = undefined;
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );
        expect(result).deep.equal([]);
      });

      it('when server response is missing body.ext, should return empty list', () => {
        serverResponses[0].body.ext = undefined;
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );
        expect(result).deep.equal([]);
      });

      it('when server response is missing body.ext.userSyncs, should return empty list', () => {
        serverResponses[0].body.ext.userSyncs = undefined;
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );
        expect(result).deep.equal([]);
      });

      it('when server response contains empty body.ext.userSyncs, should return empty list', () => {
        serverResponses[0].body.ext.userSyncs = [];
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );
        expect(result).deep.equal([]);
      });

      it('when server response contains invalid user syncs, should return empty list', () => {
        serverResponses[0].body.ext.userSyncs = [];
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );
        expect(result).deep.equal([]);
      });

      describe('when server response contains body.ext.userSyncs', () => {
        beforeEach(() => {
          serverResponses[0].body.ext.userSyncs = [
            { type: 'iframe', url: 'https://example.com/iframe1' },
            { type: 'image', url: 'https://example.com/image1' },
            { type: 'iframe', url: 'https://example.com/iframe2' },
            { type: 'invalid', url: 'https://example.com/invalid' },
            { url: 'https://example.com/invalid2' },
          ];
        });

        it('when iframe sync is enabled, should return iframe user syncs', () => {
          syncOptions = { iframeEnabled: true, pixelEnabled: false };
          const result = spec.getUserSyncs(
            syncOptions,
            serverResponses,
            gdprConsent,
            uspConsent
          );

          expect(result).deep.equal([
            { type: 'iframe', url: 'https://example.com/iframe1' },
            { type: 'iframe', url: 'https://example.com/iframe2' },
          ]);
        });

        it('when pixel sync is enabled, should return image user syncs', () => {
          syncOptions = { iframeEnabled: false, pixelEnabled: true };
          const result = spec.getUserSyncs(
            syncOptions,
            serverResponses,
            gdprConsent,
            uspConsent
          );

          expect(result).deep.equal([
            { type: 'image', url: 'https://example.com/image1' },
          ]);
        });

        it('when both iframe and pixel sync are enabled, should return iframe and image user syncs', () => {
          syncOptions = { iframeEnabled: true, pixelEnabled: true };
          const result = spec.getUserSyncs(
            syncOptions,
            serverResponses,
            gdprConsent,
            uspConsent
          );

          expect(result).deep.equal([
            { type: 'iframe', url: 'https://example.com/iframe1' },
            { type: 'image', url: 'https://example.com/image1' },
            { type: 'iframe', url: 'https://example.com/iframe2' },
          ]);
        });

        it('when both iframe and pixel sync are disabled, should return iframe and image user syncs', () => {
          syncOptions = { iframeEnabled: false, pixelEnabled: false };
          const result = spec.getUserSyncs(
            syncOptions,
            serverResponses,
            gdprConsent,
            uspConsent
          );

          expect(result).deep.equal([]);
        });
      });
    });

    describe('Given multiple server responses', () => {
      beforeEach(() => {
        serverResponses.push({
          body: {
            ext: {
              userSyncs: [
                { type: 'iframe', url: 'https://example.com/res1/iframe1' },
                { type: 'image', url: 'https://example.com/res1/image1' },
                { type: 'iframe', url: 'https://example.com/res1/iframe2' },
                { type: 'invalid', url: 'https://example.com/res1/invalid' },
                { url: 'https://example.com/res1/invalid2' },
              ],
            },
          },
        });

        serverResponses.push({
          body: {
            ext: {
              userSyncs: [
                { type: 'iframe', url: 'https://example.com/res2/iframe1' },
                { type: 'image', url: 'https://example.com/res2/image1' },
                { type: 'iframe', url: 'https://example.com/res2/iframe2' },
                { type: 'invalid', url: 'https://example.com/res2/invalid' },
                { url: 'https://example.com/res2/invalid2' },
              ],
            },
          },
        });
      });

      it('when iframe sync is enabled, should return iframe user syncs', () => {
        syncOptions = { iframeEnabled: true, pixelEnabled: false };
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );

        expect(result).deep.equal([
          { type: 'iframe', url: 'https://example.com/res1/iframe1' },
          { type: 'iframe', url: 'https://example.com/res1/iframe2' },
          { type: 'iframe', url: 'https://example.com/res2/iframe1' },
          { type: 'iframe', url: 'https://example.com/res2/iframe2' },
        ]);
      });

      it('when pixel sync is enabled, should return image user syncs', () => {
        syncOptions = { iframeEnabled: false, pixelEnabled: true };
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );

        expect(result).deep.equal([
          { type: 'image', url: 'https://example.com/res1/image1' },
          { type: 'image', url: 'https://example.com/res2/image1' },
        ]);
      });

      it('when both iframe and pixel sync are enabled, should return iframe and image user syncs', () => {
        syncOptions = { iframeEnabled: true, pixelEnabled: true };
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );

        expect(result).deep.equal([
          { type: 'iframe', url: 'https://example.com/res1/iframe1' },
          { type: 'image', url: 'https://example.com/res1/image1' },
          { type: 'iframe', url: 'https://example.com/res1/iframe2' },
          { type: 'iframe', url: 'https://example.com/res2/iframe1' },
          { type: 'image', url: 'https://example.com/res2/image1' },
          { type: 'iframe', url: 'https://example.com/res2/iframe2' },
        ]);
      });

      it('when both iframe and pixel sync are disabled, should return iframe and image user syncs', () => {
        syncOptions = { iframeEnabled: false, pixelEnabled: false };
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );

        expect(result).deep.equal([]);
      });
    });

    describe('GDPR consent', () => {
      beforeEach(() => {
        syncOptions = { iframeEnabled: true, pixelEnabled: true };
        serverResponses = [
          {
            body: {
              ext: {
                userSyncs: [
                  { type: 'iframe', url: 'https://example.com/iframe1' },
                ],
              },
            },
          },
        ];
      });

      it('when GDPR applies and purpose 1 consent is not given, should return undefined', () => {
        gdprConsent = {
          gdprApplies: true,
          vendorData: { purpose: { consents: { 1: false } } },
        };
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );

        expect(result).to.be.undefined;
      });

      it('when GDPR applies and purpose 1 consent is given, should return user syncs', () => {
        gdprConsent = {
          gdprApplies: true,
          vendorData: { purpose: { consents: { 1: true } } },
        };
        const result = spec.getUserSyncs(
          syncOptions,
          serverResponses,
          gdprConsent,
          uspConsent
        );

        expect(result).deep.equal([
          { type: 'iframe', url: 'https://example.com/iframe1' },
        ]);
      });
    });
  });

  describe('onTimeout', () => {
    let timeoutData;

    beforeEach(() => {
      timeoutData = [
        {
          bidId: 'bid1',
          bidder: 'aps',
          adUnitCode: 'adunit1',
          timeout: 3000,
        },
      ];
    });

    it('should record prebidAdapter/onTimeout/didTrigger event', () => {
      spec.onTimeout(timeoutData);

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onTimeout/didTrigger'
      );
      expect(accountQueue[0].detail.error).to.equal(timeoutData);
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onTimeout(timeoutData);

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onTimeout(timeoutData);

      expect(window._aps).not.to.exist;
    });
  });

  describe('onSetTargeting', () => {
    it('should record prebidAdapter/onSetTargeting/didTrigger event', () => {
      spec.onSetTargeting({});

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onSetTargeting/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onSetTargeting({});

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onSetTargeting({});

      expect(window._aps).not.to.exist;
    });
  });

  describe('onAdRenderSucceeded', () => {
    it('should record prebidAdapter/onAdRenderSucceeded/didTrigger event', () => {
      spec.onAdRenderSucceeded({});

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onAdRenderSucceeded/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onAdRenderSucceeded({});

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onAdRenderSucceeded({});

      expect(window._aps).not.to.exist;
    });
  });

  describe('onBidderError', () => {
    let error;

    beforeEach(() => {
      error = new Error('Bidder request failed');
    });

    it('should record prebidAdapter/onBidderError/didTrigger event', () => {
      spec.onBidderError(error);

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onBidderError/didTrigger'
      );
      expect(accountQueue[0].detail.error).to.equal(error);
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onBidderError(error);

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onBidderError(error);

      expect(window._aps).not.to.exist;
    });
  });

  describe('onBidWon', () => {
    it('should record prebidAdapter/onBidWon/didTrigger event', () => {
      spec.onBidWon({});

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onBidWon/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onBidWon({});

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onBidWon({});

      expect(window._aps).not.to.exist;
    });
  });

  describe('onBidAttribute', () => {
    it('should record prebidAdapter/onBidAttribute/didTrigger event', () => {
      spec.onBidAttribute({});

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onBidAttribute/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onBidAttribute({});

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onBidAttribute({});

      expect(window._aps).not.to.exist;
    });
  });

  describe('onBidBillable', () => {
    it('should record prebidAdapter/onBidBillable/didTrigger event', () => {
      spec.onBidBillable({});

      const accountQueue = window._aps.get(accountID).queue;
      expect(accountQueue).to.have.length(1);
      expect(accountQueue[0].type).to.equal(
        'prebidAdapter/onBidBillable/didTrigger'
      );
    });

    it('when no accountID provided, should not record event', () => {
      updateAPSConfig({ accountID: undefined });
      spec.onBidBillable({});

      expect(window._aps).not.to.exist;
    });

    it('when telemetry is turned off, should not record event', () => {
      updateAPSConfig({ telemetry: false });
      spec.onBidBillable({});

      expect(window._aps).not.to.exist;
    });
  });
});
