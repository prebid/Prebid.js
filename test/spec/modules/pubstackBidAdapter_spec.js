import { expect } from 'chai';
import { spec } from 'modules/pubstackBidAdapter';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { hook } from 'src/hook.js';
import 'src/prebid.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';

describe('pubstackBidAdapter', function () {
  const baseBidRequest = {
    adUnitCode: 'adunit-code',
    auctionId: 'auction-1',
    bidId: 'bid-1',
    bidder: 'pubstack',
    bidderRequestId: 'request-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    params: {
      siteId: 'site-123',
      adUnitName: 'adunit-1'
    },
    sizes: [[300, 250]],
    transactionId: 'transaction-1'
  };

  const baseBidderRequest = {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'consent-string',
      vendorData: {
        purpose: {
          consents: { 1: true }
        }
      }
    },
    uspConsent: '1YYN',
    gppConsent: {
      gppString: 'gpp-string',
      applicableSections: [7, 8]
    },
    refererInfo: {
      referer: 'https://example.com'
    }
  };

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const createBidRequest = (overrides = {}) => {
    const bidRequest = clone(baseBidRequest);
    const { params = {}, ...otherOverrides } = overrides;
    Object.assign(bidRequest, otherOverrides);
    bidRequest.params = {
      ...bidRequest.params,
      ...params
    };
    return bidRequest;
  };

  const createBidderRequest = (bidRequest, overrides = {}) => ({
    ...clone(baseBidderRequest),
    bids: [bidRequest],
    ...overrides
  });

  const extractBids = (result) => Array.isArray(result) ? result : result?.bids;

  const findSyncForSite = (syncs, siteId) =>
    syncs.find((sync) => new URL(sync.url).searchParams.get('siteId') === siteId);

  const getDecodedSyncPayload = (sync) =>
    JSON.parse(atob(new URL(sync.url).searchParams.get('consent')));

  before(() => {
    hook.ready();
  });

  beforeEach(function () {
    config.resetConfig();
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    it('returns true when required params are present', function () {
      expect(spec.isBidRequestValid(createBidRequest())).to.equal(true);
    });

    it('returns false for invalid params when debug is disabled', function () {
      config.setConfig({ debug: false });
      expect(spec.isBidRequestValid(createBidRequest({ params: { siteId: undefined } }))).to.equal(false);
      expect(spec.isBidRequestValid(createBidRequest({ params: { adUnitName: undefined } }))).to.equal(false);
    });

    it('returns true for invalid params when debug is enabled', function () {
      config.setConfig({ debug: true });
      expect(spec.isBidRequestValid(createBidRequest({ params: { siteId: undefined } }))).to.equal(true);
      expect(spec.isBidRequestValid(createBidRequest({ params: { adUnitName: undefined } }))).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('builds a POST request with ORTB data and bidder extensions', function () {
      const bidRequest = createBidRequest();
      const bidderRequest = createBidderRequest(bidRequest);
      const request = spec.buildRequests([bidRequest], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://node.pbstck.com/openrtb2/auction?siteId=site-123');
      expect(utils.deepAccess(request, 'data.site.publisher.id')).to.equal('site-123');
      expect(utils.deepAccess(request, 'data.test')).to.equal(0);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(utils.deepAccess(request, 'data.imp.0.id')).to.equal('bid-1');
      expect(utils.deepAccess(request, 'data.imp.0.ext.prebid.bidder.pubstack.adUnitName')).to.equal('adunit-1');
      expect(utils.deepAccess(request, 'data.imp.0.ext.prebid.bidder.pubstack.adUnitCode')).to.equal('adunit-code');
      expect(utils.deepAccess(request, 'data.ext.prebid.version')).to.be.a('string');
      expect(utils.deepAccess(request, 'data.ext.prebid.cntRequest')).to.be.a('number');
      expect(utils.deepAccess(request, 'data.ext.prebid.cntImp')).to.be.a('number');
      expect(utils.deepAccess(request, 'data.ext.prebid.pVisible')).to.be.a('boolean');
      expect(utils.deepAccess(request, 'data.ext.prebid.uStart')).to.be.a('number');
    });

    it('sets test to 1 when prebid debug mode is enabled', function () {
      config.setConfig({ debug: true });
      const bidRequest = createBidRequest({ bidId: 'bid-debug' });
      const bidderRequest = createBidderRequest(bidRequest);
      const request = spec.buildRequests([bidRequest], bidderRequest);

      expect(utils.deepAccess(request, 'data.test')).to.equal(1);
    });

    it('increments request and imp counters for each call', function () {
      const firstBidRequest = createBidRequest({ bidId: 'bid-counter-1' });
      const firstRequest = spec.buildRequests([firstBidRequest], createBidderRequest(firstBidRequest));
      const secondBidRequest = createBidRequest({
        bidId: 'bid-counter-2',
        adUnitCode: 'adunit-code-2',
        params: { adUnitName: 'adunit-2' }
      });
      const secondRequest = spec.buildRequests([secondBidRequest], createBidderRequest(secondBidRequest));

      expect(utils.deepAccess(secondRequest, 'data.ext.prebid.cntRequest'))
        .to.equal(utils.deepAccess(firstRequest, 'data.ext.prebid.cntRequest') + 1);
      expect(utils.deepAccess(secondRequest, 'data.ext.prebid.cntImp'))
        .to.equal(utils.deepAccess(firstRequest, 'data.ext.prebid.cntImp') + 1);
    });
  });

  describe('interpretResponse', function () {
    it('returns empty array when response has no body', function () {
      const bidRequest = createBidRequest();
      const request = spec.buildRequests([bidRequest], createBidderRequest(bidRequest));
      const bids = spec.interpretResponse({ body: null }, request);
      expect(bids).to.be.an('array');
      expect(bids).to.have.lengthOf(0);
    });

    it('maps ORTB bid responses into prebid bids', function () {
      const bidRequest = createBidRequest();
      const request = spec.buildRequests([bidRequest], createBidderRequest(bidRequest));
      const serverResponse = {
        body: {
          id: 'resp-1',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-1',
                  mtype: 1,
                  price: 1.23,
                  w: 300,
                  h: 250,
                  adm: '<div>ad</div>',
                  crid: 'creative-1'
                }
              ]
            }
          ]
        }
      };

      const result = spec.interpretResponse(serverResponse, request);
      const bids = extractBids(result);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.include({
        requestId: 'bid-1',
        cpm: 1.23,
        width: 300,
        height: 250,
        ad: '<div>ad</div>',
        creativeId: 'creative-1'
      });
      expect(bids[0]).to.have.property('currency', 'USD');
    });

    it('returns no bids when ORTB response impid does not match request imp ids', function () {
      const bidRequest = createBidRequest({ bidId: 'bid-match-required' });
      const request = spec.buildRequests([bidRequest], createBidderRequest(bidRequest));
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'unknown-imp-id',
              price: 2.5,
              w: 300,
              h: 250,
              adm: '<div>ad</div>',
              crid: 'creative-unknown'
            }]
          }]
        }
      };

      expect(extractBids(spec.interpretResponse(serverResponse, request))).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('returns iframe sync with encoded consent payload and site id', function () {
      const bidRequest = createBidRequest();
      const bidderRequest = createBidderRequest(bidRequest);
      spec.buildRequests([bidRequest], bidderRequest);

      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: true },
        [],
        bidderRequest.gdprConsent,
        bidderRequest.uspConsent,
        bidderRequest.gppConsent
      );

      const siteSync = findSyncForSite(syncs, 'site-123');
      expect(siteSync).to.not.equal(undefined);
      expect(siteSync.type).to.equal('iframe');
      expect(siteSync.url).to.include('https://cdn.pbstck.com/async_usersync.html');

      const consentPayload = getDecodedSyncPayload(siteSync);
      expect(consentPayload).to.deep.equal({
        gdprConsentString: 'consent-string',
        gdprApplies: true,
        uspConsent: '1YYN',
        gpp: 'gpp-string',
        gpp_sid: [7, 8]
      });
    });

    it('returns image sync when iframe sync is disabled', function () {
      const bidRequest = createBidRequest({ bidId: 'bid-pixel' });
      const bidderRequest = createBidderRequest(bidRequest);
      spec.buildRequests([bidRequest], bidderRequest);

      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        [],
        bidderRequest.gdprConsent,
        bidderRequest.uspConsent,
        bidderRequest.gppConsent
      );

      const siteSync = findSyncForSite(syncs, 'site-123');
      expect(siteSync).to.not.equal(undefined);
      expect(siteSync.type).to.equal('image');
      expect(siteSync.url).to.include('https://cdn.pbstck.com/async_usersync.png');
    });

    it('returns no syncs when both iframe and pixel sync are disabled', function () {
      const bidRequest = createBidRequest({ bidId: 'bid-disabled-syncs' });
      const bidderRequest = createBidderRequest(bidRequest);
      spec.buildRequests([bidRequest], bidderRequest);

      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: false },
        [],
        bidderRequest.gdprConsent,
        bidderRequest.uspConsent,
        bidderRequest.gppConsent
      );

      expect(syncs).to.deep.equal([]);
    });

    it('includes sync entries for each seen site id', function () {
      const bidA = createBidRequest({
        bidId: 'bid-site-a',
        adUnitCode: 'ad-site-a',
        params: { siteId: 'site-a', adUnitName: 'adunit-a' }
      });
      const bidB = createBidRequest({
        bidId: 'bid-site-b',
        adUnitCode: 'ad-site-b',
        params: { siteId: 'site-b', adUnitName: 'adunit-b' }
      });

      spec.buildRequests([bidA], createBidderRequest(bidA));
      spec.buildRequests([bidB], createBidderRequest(bidB));

      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        baseBidderRequest.gdprConsent,
        baseBidderRequest.uspConsent,
        baseBidderRequest.gppConsent
      );
      const siteIds = syncs.map((sync) => new URL(sync.url).searchParams.get('siteId'));

      expect(siteIds).to.include('site-a');
      expect(siteIds).to.include('site-b');
    });

    it('supports null consent objects in the sync payload', function () {
      const bidRequest = createBidRequest({
        bidId: 'bid-null-consent',
        params: { siteId: 'site-null-consent', adUnitName: 'adunit-null-consent' }
      });
      spec.buildRequests([bidRequest], createBidderRequest(bidRequest));

      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        null,
        null,
        null
      );

      const siteSync = findSyncForSite(syncs, 'site-null-consent');
      expect(siteSync).to.not.equal(undefined);
      expect(getDecodedSyncPayload(siteSync)).to.deep.equal({ uspConsent: null });
    });
  });
});
