import { expect } from 'chai';
import * as utils from '../../../src/utils.js';
import {
  spec,
  storage,
  DEFAULT_BIDDER_CONFIG,
  VERSION,
  common,
} from '../../../modules/adbookpspBidAdapter.js';

describe('adbookpsp bid adapter', () => {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    sandbox
      .stub(common, 'generateUUID')
      .returns('54444444-5444-4444-9444-544444444444');
    sandbox.stub(common, 'getWindowDimensions').returns({
      innerWidth: 100,
      innerHeight: 100,
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid()', () => {
    it('should return false when there is no banner in mediaTypes', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.mediaTypes.banner;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when orgId and placementId is not defined', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.params.placementId;
      delete bid.params.orgId;

      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true when orgId is set in config', () => {
      const bid = utils.deepClone(bannerBid);

      delete bid.params.placementId;
      delete bid.params.orgId;

      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.orgId')
        .returns('129576');

      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
      expect(spec.isBidRequestValid(mixedBid)).to.equal(true);
    });

    it('should return false when sizes for banner are not specified', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.mediaTypes.banner.sizes;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes for banner are invalid', () => {
      const bid = utils.deepClone(bannerBid);
      delete bid.mediaTypes.banner.sizes;

      bid.mediaTypes.banner.sizes = [['123', 'foo']];

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true if player size is set via playerSize', () => {
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('should return true if player size is set via w and h', () => {
      const bid = utils.deepClone(videoBid);
      delete bid.mediaTypes.video.playerSize;

      bid.mediaTypes.video.w = 400;
      bid.mediaTypes.video.h = 300;

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should reutrn false if player size is not set', () => {
      const bid = utils.deepClone(videoBid);
      delete bid.mediaTypes.video.playerSize;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests()', () => {
    it('should build correct request for banner bid', () => {
      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.orgId')
        .returns(undefined)
        .withArgs('adbookpsp.exchangeUrl')
        .returns('https://ex.fattail.com/openrtb2');

      const requests = spec.buildRequests([bannerBid], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0]).to.deep.include({
        method: 'POST',
        url: 'https://ex.fattail.com/openrtb2',
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
      });
      expect(JSON.parse(requests[0].data)).to.deep.equal(bannerExchangeRequest);
    });

    it('should build correct request for video bid', () => {
      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp')
        .returns(DEFAULT_BIDDER_CONFIG)
        .withArgs('adbookpsp.exchangeUrl')
        .returns(DEFAULT_BIDDER_CONFIG.exchangeUrl)
        .withArgs('adbookpsp.orgId')
        .returns(undefined);

      const requests = spec.buildRequests([videoBid], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0]).to.deep.include({
        method: 'POST',
        url: 'https://ex.fattail.com/openrtb2',
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
      });
      expect(JSON.parse(requests[0].data)).to.deep.include({
        ...videoExchangeRequest,
        ext: {
          adbook: {
            config: DEFAULT_BIDDER_CONFIG,
            version: {
              adapter: VERSION,
              prebid: '$prebid.version$',
            },
          },
        },
      });
    });

    it('should build correct request for video bid with w and h', () => {
      const bid = utils.deepClone(videoBid);

      delete bid.mediaTypes.video.playerSize;

      bid.mediaTypes.video.w = 400;
      bid.mediaTypes.video.h = 300;

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = JSON.parse(request.data);

      expect(requestData.imp[0].video.w).to.equal(400);
      expect(requestData.imp[0].video.h).to.equal(300);
    });

    it('should build correct request for video bid with both w, h and playerSize', () => {
      const bid = utils.deepClone(videoBid);

      bid.mediaTypes.video.w = 640;
      bid.mediaTypes.video.h = 480;

      const [request] = spec.buildRequests([bid], bidderRequest);
      const requestData = JSON.parse(request.data);

      expect(requestData.imp[0].video.w).to.equal(640);
      expect(requestData.imp[0].video.h).to.equal(480);
    });

    it('should build correct request for mixed bid', () => {
      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.orgId')
        .returns(undefined)
        .withArgs('adbookpsp.exchangeUrl')
        .returns('https://ex.fattail.com/openrtb2');

      const requests = spec.buildRequests([mixedBid], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0]).to.deep.include({
        method: 'POST',
        url: 'https://ex.fattail.com/openrtb2',
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
      });
      expect(JSON.parse(requests[0].data)).to.deep.include(
        mixedExchangeRequest
      );
    });

    it('should use orgId from config', () => {
      const bid = utils.deepClone(bannerBid);

      delete bid.params;

      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.orgId')
        .returns('129576');

      const requests = spec.buildRequests([bid], bidderRequest);
      const request = JSON.parse(requests[0].data);

      expect(request.imp[0].ext).to.deep.include({
        adbook: {
          orgId: '129576',
        },
      });
    });

    it('should use orgId from adUnit when orgId is also set in config', () => {
      const bid = utils.deepClone(bannerBid);

      delete bid.params.placementId;

      bid.params.orgId = 'adUnitOrgId';

      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.orgId')
        .returns('configOrgId');

      const requests = spec.buildRequests([bid], bidderRequest);
      const request = JSON.parse(requests[0].data);

      expect(request.imp[0].ext).to.deep.include({
        adbook: {
          orgId: 'adUnitOrgId',
        },
      });
    });

    it('should include in request GDPR options if available', () => {
      const request = utils.deepClone(bidderRequest);

      delete request.uspConsent;

      const requests = spec.buildRequests([bannerBid, mixedBid], request);

      expect(JSON.parse(requests[0].data)).to.deep.include({
        regs: {
          coppa: 0,
          ext: {
            gdpr: 1,
            gdprConsentString: 'gdprConsentString',
          },
        },
      });
    });

    it('should include in request USP (CPPA) options if available', () => {
      const request = utils.deepClone(bidderRequest);

      delete request.gdprConsent;

      const requests = spec.buildRequests([bannerBid, mixedBid], request);

      expect(JSON.parse(requests[0].data)).to.deep.include({
        regs: {
          coppa: 0,
          ext: {
            us_privacy: 'uspConsentString',
          },
        },
      });
    });

    it('should pass valid coppa flag based on config', () => {
      sandbox.stub(common, 'getConfig').withArgs('coppa').returns(true);

      const request = utils.deepClone(bidderRequest);

      delete request.gdprConsent;
      delete request.uspConsent;

      const requests = spec.buildRequests([bannerBid, mixedBid], request);

      expect(JSON.parse(requests[0].data)).to.deep.include({
        regs: {
          coppa: 1,
        },
      });
    });

    it('should pass GDPR, USP (CCPA) and COPPA options', () => {
      sandbox.stub(common, 'getConfig').withArgs('coppa').returns(true);

      const requests = spec.buildRequests([bannerBid, mixedBid], bidderRequest);

      expect(JSON.parse(requests[0].data)).to.deep.include({
        regs: {
          coppa: 1,
          ext: {
            gdpr: 1,
            gdprConsentString: 'gdprConsentString',
            us_privacy: 'uspConsentString',
          },
        },
      });
    });

    it('should generate and pass user id when is not present in cookie and local storage is not enabled', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const requests = spec.buildRequests([bannerBid, mixedBid], bidderRequest);
      const rtbRequest = JSON.parse(requests[0].data);

      expect(rtbRequest.user.id).to.have.lengthOf(36);
    });

    it('should pass user id when is present in cookie', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      sandbox
        .stub(storage, 'getCookie')
        .returns('e35da6bb-f2f8-443b-aeff-3375bef45c9d');
      const requests = spec.buildRequests([bannerBid, mixedBid], bidderRequest);
      const rtbRequest = JSON.parse(requests[0].data);

      expect(rtbRequest.user.id).to.equal(
        'e35da6bb-f2f8-443b-aeff-3375bef45c9d'
      );
    });

    it('should pass user id if is present in local storage', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox
        .stub(storage, 'getDataFromLocalStorage')
        .returns('e35da6bb-f2f8-443b-aeff-3375bef45c9d');

      const requests = spec.buildRequests([bannerBid, mixedBid], bidderRequest);
      const rtbRequest = JSON.parse(requests[0].data);
      expect(rtbRequest.user.id).to.equal(
        'e35da6bb-f2f8-443b-aeff-3375bef45c9d'
      );
    });

    it('should regenerate user id if it is invalid', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage').returns('foo');

      const requests = spec.buildRequests([bannerBid, mixedBid], bidderRequest);
      const rtbRequest = JSON.parse(requests[0].data);
      expect(rtbRequest.user.id).to.have.lengthOf(36);
    });

    it('should pass schain if available', () => {
      const bid = utils.deepClone(bannerBid);
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'exchange1.com',
            sid: '1234',
            hp: 1,
            rid: 'bid-request-1',
            name: 'publisher',
            domain: 'publisher.com',
          },
        ],
      };

      bid.schain = schain;

      const requests = spec.buildRequests([bid], bidderRequest);

      expect(JSON.parse(requests[0].data).source).to.deep.include({
        ext: {
          schain,
        },
      });
    });

    it('return empty array if there are no valid bid requests', () => {
      const requests = spec.buildRequests([], bidderRequest);

      expect(requests).to.deep.equal([]);
    });

    it('should prioritize device information set in config', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1';

      sandbox.stub(common, 'getConfig').withArgs('device').returns({
        ua,
      });

      const requests = spec.buildRequests([bannerBid], bidderRequest);

      expect(JSON.parse(requests[0].data).device.ua).to.equal(ua);
    });

    it('should include bidder config', () => {
      const bidderConfig = {
        bidTTL: 500,
        defaultCurrency: 'USD',
        exchangeUrl: 'https://exsb.fattail.com/openrtb2',
        winTrackingEnabled: true,
        winTrackingUrl: 'https://evsb.fattail.com/wins',
        orgId: '129576',
      };
      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp')
        .returns(bidderConfig);

      const requests = spec.buildRequests([bannerBid], bidderRequest);
      const request = JSON.parse(requests[0].data);

      expect(request.ext).to.deep.include({
        adbook: {
          config: bidderConfig,
          version: {
            adapter: VERSION,
            prebid: '$prebid.version$',
          },
        },
      });
    });

    it('should use bidder video params if they are set', () => {
      const videoBidWithParams = utils.deepClone(videoBid);
      const bidderVideoParams = {
        api: [1, 2],
        mimes: ['video/mp4', 'video/x-flv'],
        playbackmethod: [3, 4],
        protocols: [5, 6],
        minduration: 10,
        maxduration: 30,
      };
      videoBidWithParams.params.video = bidderVideoParams;

      const requests = spec.buildRequests([videoBidWithParams], bidderRequest);
      const request = JSON.parse(requests[0].data);

      expect(request.imp[0]).to.deep.include({
        video: {
          ...bidderVideoParams,
          w: videoBidWithParams.mediaTypes.video.playerSize[0][0],
          h: videoBidWithParams.mediaTypes.video.playerSize[0][1],
        },
      });
    });
  });

  describe('interpretResponse()', () => {
    it('should correctly interpret valid response', () => {
      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.defaultCurrency')
        .returns(DEFAULT_BIDDER_CONFIG.defaultCurrency)
        .withArgs('adbookpsp.bidTTL')
        .returns(DEFAULT_BIDDER_CONFIG.bidTTL);

      const response = utils.deepClone(exchangeResponse);
      const bids = spec.interpretResponse(
        { body: response },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.deep.equal([
        {
          bidderRequestId: '999ccceeee11',
          requestId: '9873kfse',
          bidId: 'bid123456',
          width: 300,
          height: 250,
          ttl: 300,
          cpm: 0.5,
          currency: 'USD',
          creativeId: '123456789',
          mediaType: 'banner',
          meta: {
            advertiserDomains: ['advertiser.com'],
            mediaType: 'banner',
            primaryCatId: 'IAB2-1',
            secondaryCatIds: ['IAB2-2', 'IAB2-3'],
          },
          netRevenue: true,
          nurl: 'http://win.example.url',
          adUnitCode: 'div-gpt-ad-837465923534-0',
          ad: '<div>ad</div>',
          adId: '5',
          adserverTargeting: {
            hb_ad_ord_adbookpsp: '0_0', // the value to the left of the underscore represents the index of the ad id and the number to the right represents the order index
            hb_adid_c_adbookpsp: '5',
            hb_deal_adbookpsp: 'werwetwerw',
            hb_liid_adbookpsp: '2342345',
            hb_ordid_adbookpsp: '567843',
          },
          referrer: 'http://prebid-test-page.io:8080/banner.html',
          lineItemId: '2342345',
        },
        {
          ad: '<VAST version="4.2" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="http://www.iab.com/VAST"></VAST>',
          adId: '10',
          adUnitCode: 'div-gpt-ad-837465923534-0',
          adserverTargeting: {
            hb_ad_ord_adbookpsp: '0_0',
            hb_adid_c_adbookpsp: '10',
            hb_deal_adbookpsp: 'dsfxcxcvxc',
            hb_liid_adbookpsp: '2121221',
            hb_ordid_adbookpsp: '5678234',
          },
          bidId: 'bid4321',
          bidderRequestId: '999ccceeee11',
          cpm: 0.45,
          creativeId: '543123',
          currency: 'USD',
          height: 250,
          lineItemId: '2121221',
          mediaType: 'video',
          meta: {
            advertiserDomains: ['advertiser.com', 'campaign.advertiser.com'],
            mediaType: 'video',
            primaryCatId: 'IAB2-3',
            secondaryCatIds: [],
          },
          netRevenue: true,
          nurl: 'http://win.example.url',
          referrer: 'http://prebid-test-page.io:8080/banner.html',
          requestId: '120kfeske',
          ttl: 300,
          vastXml:
            '<VAST version="4.2" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="http://www.iab.com/VAST"></VAST>',
          width: 300,
        },
      ]);
    });

    it('should place valid GAM targeting for all bids when multiple bids are present for multiple impressions', () => {
      const response = utils.deepClone(exchangeResponse);

      const bids = spec.interpretResponse(
        { body: response },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.have.length(2);
      expect(bids[0].adserverTargeting).to.deep.equal({
        hb_ad_ord_adbookpsp: '0_0',
        hb_adid_c_adbookpsp: '5',
        hb_deal_adbookpsp: 'werwetwerw',
        hb_liid_adbookpsp: '2342345',
        hb_ordid_adbookpsp: '567843',
      });
      expect(bids[1].adserverTargeting).to.deep.equal({
        hb_ad_ord_adbookpsp: '0_0',
        hb_adid_c_adbookpsp: '10',
        hb_deal_adbookpsp: 'dsfxcxcvxc',
        hb_liid_adbookpsp: '2121221',
        hb_ordid_adbookpsp: '5678234',
      });
    });

    it('should place valid GAM targeting for all bids when multiple bids are present for single impression', () => {
      const response = utils.deepClone(exchangeResponse);

      response.seatbid[1].bid[0].impid = '9873kfse';

      const bids = spec.interpretResponse(
        { body: response },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.have.length(2);
      for (const bid of bids) {
        expect(bid.adserverTargeting).to.deep.equal({
          hb_ad_ord_adbookpsp: '0_0,1_0',
          hb_adid_c_adbookpsp: '5,10',
          hb_deal_adbookpsp: 'werwetwerw,dsfxcxcvxc',
          hb_liid_adbookpsp: '2342345,2121221',
          hb_ordid_adbookpsp: '567843,5678234',
        });
      }
    });

    it('should return no bids if response id does not match bidderRequestId', () => {
      const body = utils.deepClone(exchangeResponse);
      body.id = '999';

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.deep.equal([]);
    });

    it('should return no bids if response does not include seatbid', () => {
      const body = utils.deepClone(exchangeResponse);
      delete body.seatbid;

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.deep.equal([]);
    });

    it('should return no bids if response does not include any bids', () => {
      const body = utils.deepClone(exchangeResponse);
      body.seatbid = [];

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.deep.equal([]);
    });

    it('should exclude invalid video bids', () => {
      const body = utils.deepClone(exchangeResponse);

      body.seatbid.shift();
      body.seatbid[0].bid[0].adid = 34;

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids).to.deep.equal([]);
    });

    it('should exclude invalid banner bids', () => {
      const body = utils.deepClone(exchangeResponse);
      const request = utils.deepClone(exchangeBidRequest);

      body.seatbid.pop();

      delete body.seatbid[0].bid[0].w;
      delete body.seatbid[0].bid[0].h;

      request.imp[0].banner.format.push({ w: 300, h: 600 });

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(request) }
      );

      expect(bids).to.deep.equal([]);
    });

    it('should not include invalid banner bids in targeting map', () => {
      const body = utils.deepClone(exchangeResponse);
      const request = utils.deepClone(exchangeBidRequest);

      body.seatbid[0].bid[0].h = '600';

      request.imp[0].banner.format.push({ w: 300, h: 600 });

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(exchangeBidRequest) }
      );

      expect(bids[0].adserverTargeting).to.deep.equal({
        hb_ad_ord_adbookpsp: '0_0',
        hb_adid_c_adbookpsp: '10',
        hb_deal_adbookpsp: 'dsfxcxcvxc',
        hb_liid_adbookpsp: '2121221',
        hb_ordid_adbookpsp: '5678234',
      });
    });

    it('should not validate banner bid dimensions if bid request has single size', () => {
      const body = utils.deepClone(exchangeResponse);
      const request = utils.deepClone(exchangeBidRequest);

      delete body.seatbid[1];
      delete body.seatbid[0].bid[0].h;
      delete body.seatbid[0].bid[0].w;

      const bids = spec.interpretResponse(
        { body },
        { data: JSON.stringify(request) }
      );

      expect(bids.length).to.equal(1);
    });
  });

  describe('getUserSyncs()', () => {
    it('should return user syncs if there are included in the response and syncs are enabled', () => {
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: true,
          iframeEnabled: true,
        },
        [{ body: exchangeResponse }]
      );

      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'http://sometest.com/sync/1234567',
        },
        {
          type: 'iframe',
          url: 'http://sometest.com/sync/1234567',
        },
      ]);
    });

    it('should not return user syncs if syncs are disabled', () => {
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: false,
          iframeEnabled: false,
        },
        [{ body: exchangeResponse }]
      );

      expect(syncs).to.deep.equal([]);
    });

    it('should return image syncs if they are enabled', () => {
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: true,
          iframeEnabled: false,
        },
        [{ body: exchangeResponse }]
      );

      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'http://sometest.com/sync/1234567',
        },
      ]);
    });

    it('should return iframe syncs if they are enabled', () => {
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: false,
          iframeEnabled: true,
        },
        [{ body: exchangeResponse }]
      );

      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'http://sometest.com/sync/1234567',
        },
      ]);
    });

    it('should append COPPA status to sync url', () => {
      sandbox.stub(common, 'getConfig').withArgs('coppa').returns(true);
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: false,
          iframeEnabled: true,
        },
        [{ body: utils.deepClone(exchangeResponse) }]
      );

      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'http://sometest.com/sync/1234567?coppa=1',
        },
      ]);
    });

    it('should append GDPR consent data to url', () => {
      sandbox.stub(common, 'getConfig').withArgs('coppa').returns(false);
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: false,
          iframeEnabled: true,
        },
        [{ body: utils.deepClone(exchangeResponse) }],
        { gdprApplies: true, consentString: 'gdprConsentString' }
      );

      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'http://sometest.com/sync/1234567?gdpr=1&consentString=gdprConsentString',
        },
      ]);
    });

    it('should append USP (CCPA) consent string to url', () => {
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: false,
          iframeEnabled: true,
        },
        [{ body: utils.deepClone(exchangeResponse) }],
        undefined,
        'uspConsentString'
      );

      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'http://sometest.com/sync/1234567?us_privacy=uspConsentString',
        },
      ]);
    });

    it('should append COPPA, GDPR and USP (CCPA) url params', () => {
      sandbox.stub(common, 'getConfig').withArgs('coppa').returns(true);
      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: true,
          iframeEnabled: true,
        },
        [{ body: utils.deepClone(exchangeResponse) }],
        { gdprApplies: true, consentString: 'gdprConsentString' },
        'uspConsentString'
      );

      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'http://sometest.com/sync/1234567?gdpr=1&consentString=gdprConsentString&us_privacy=uspConsentString&coppa=1',
        },
        {
          type: 'iframe',
          url: 'http://sometest.com/sync/1234567?gdpr=1&consentString=gdprConsentString&us_privacy=uspConsentString&coppa=1',
        },
      ]);
    });

    it('should respect url param syntax when appending params', () => {
      sandbox.stub(common, 'getConfig').withArgs('coppa').returns(true);

      const response = utils.deepClone(exchangeResponse);

      response.ext.sync[0] = {
        type: 'image',
        url: 'http://sometest.com/sync/1234567?horseCount=4',
      };

      const syncs = spec.getUserSyncs(
        {
          pixelEnabled: true,
          iframeEnabled: false,
        },
        [{ body: response }],
        { gdprApplies: true, consentString: 'gdprConsentString' },
        'uspConsentString'
      );

      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'http://sometest.com/sync/1234567?horseCount=4&gdpr=1&consentString=gdprConsentString&us_privacy=uspConsentString&coppa=1',
        },
      ]);
    });
  });

  describe('onBidWon()', () => {
    it('should track win if win tracking is enabled', () => {
      const spy = sandbox.spy(utils, 'triggerPixel');

      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.winTrackingEnabled')
        .returns(true)
        .withArgs('adbookpsp.winTrackingUrl')
        .returns('https://ev.fattail.com/wins');

      spec.onBidWon({
        requestId: 'requestId',
        bidderRequestId: 'bidderRequestId',
        bidId: 'bidId',
      });

      expect(
        spy.calledWith(
          'https://ev.fattail.com/wins?impId=requestId&reqId=bidderRequestId&bidId=bidId'
        )
      ).to.equal(true);
    });
    it('should call bid.nurl if win tracking is enabled', () => {
      const spy = sandbox.spy(utils, 'triggerPixel');

      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.winTrackingEnabled')
        .returns(true)
        .withArgs('adbookpsp.winTrackingUrl')
        .returns('https://ev.fattail.com/wins');

      spec.onBidWon({
        requestId: 'requestId',
        bidderRequestId: 'bidderRequestId',
        bidId: 'bidId',
        nurl: 'http://win.example.url',
      });

      expect(spy.calledWith('http://win.example.url')).to.equal(true);
    });
    it('should not track win nor call bid.nurl if win tracking is disabled', () => {
      const spy = sandbox.spy(utils, 'triggerPixel');

      sandbox
        .stub(common, 'getConfig')
        .withArgs('adbookpsp.winTrackingEnabled')
        .returns(false)
        .withArgs('adbookpsp.winTrackingUrl')
        .returns('https://ev.fattail.com/wins');

      spec.onBidWon({
        requestId: 'requestId',
        bidderRequestId: 'bidderRequestId',
        bidId: 'bidId',
        nurl: 'http://win.example.url',
      });

      expect(spy.notCalled).to.equal(true);
    });
  });
});

const bidderRequest = {
  auctionId: 'aaccee333311',
  bidderRequestId: '999ccceeee11',
  timeout: 200,
  refererInfo: {
    page: 'http://mock-page.com',
    domain: 'mock-page.com',
    ref: 'http://example-domain.com/foo',
  },
  gdprConsent: {
    gdprApplies: 1,
    consentString: 'gdprConsentString',
  },
  uspConsent: 'uspConsentString',
};

const bannerBid = {
  bidder: 'adbookpsp',
  params: {
    placementId: '12390123',
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600],
      ],
    },
  },
  adUnitCode: 'div-gpt-ad-837465923534-0',
  transactionId: 'sfsf89e-mck3-asf3-fe45-feksjfi123mfs',
  bidId: '9873kfse',
  bidderRequestId: '999ccceeee11',
  auctionId: 'aaccee333311',
  lineItemId: 123123123,
};

const bannerExchangeRequest = {
  id: '999ccceeee11',
  device: {
    h: 100,
    w: 100,
    js: true,
    ua: navigator.userAgent,
    dnt: 0,
  },
  regs: {
    coppa: 0,
    ext: {
      gdpr: 1,
      gdprConsentString: 'gdprConsentString',
      us_privacy: 'uspConsentString',
    },
  },
  site: {
    domain: 'mock-page.com',
    page: 'http://mock-page.com',
    ref: 'http://example-domain.com/foo',
  },
  source: {
    fd: 1,
    tid: 'aaccee333311',
  },
  tmax: 200,
  user: {
    gdprConsentString: 'gdprConsentString',
    id: '54444444-5444-4444-9444-544444444444',
  },
  imp: [
    {
      banner: {
        format: [
          {
            w: 300,
            h: 250,
          },
          {
            w: 300,
            h: 600,
          },
        ],
        w: 300,
        h: 250,
        topframe: 0,
        pos: 0,
      },
      ext: {
        adbook: {
          placementId: '12390123',
        },
      },
      id: '9873kfse',
      tagid: 'div-gpt-ad-837465923534-0',
    },
  ],
  ext: {
    adbook: {
      version: {
        adapter: VERSION,
        prebid: '$prebid.version$',
      },
    },
  },
};

const videoBid = {
  bidder: 'adbookpsp',
  params: {
    placementId: '129576',
  },
  mediaTypes: {
    video: {
      api: [1, 2, 4, 6],
      mimes: ['video/mp4'],
      playbackmethod: [2, 4, 6],
      playerSize: [[400, 300]],
      protocols: [3, 4, 7, 8, 10],
    },
  },
  adUnitCode: 'div-gpt-ad-9383743831-6',
  transactionId: 'aacc3fasf-fere-1335-8m1s-785393mc3fj',
  bidId: '120kfeske',
  bidderRequestId: '999ccceeee11',
  auctionId: 'aaccee333311',
  lineItemId: 321321321,
};

const videoExchangeRequest = {
  id: '999ccceeee11',
  device: {
    h: 100,
    w: 100,
    js: true,
    ua: navigator.userAgent,
    dnt: 0,
  },
  regs: {
    coppa: 0,
    ext: {
      gdpr: 1,
      gdprConsentString: 'gdprConsentString',
      us_privacy: 'uspConsentString',
    },
  },
  site: {
    domain: 'mock-page.com',
    page: 'http://mock-page.com',
    ref: 'http://example-domain.com/foo',
  },
  source: {
    fd: 1,
    tid: 'aaccee333311',
  },
  tmax: 200,
  user: {
    gdprConsentString: 'gdprConsentString',
    id: '54444444-5444-4444-9444-544444444444',
  },
  imp: [
    {
      video: {
        api: [1, 2, 4, 6],
        h: 300,
        mimes: ['video/mp4'],
        playbackmethod: [2, 4, 6],
        protocols: [3, 4, 7, 8, 10],
        w: 400,
      },
      ext: {
        adbook: {
          placementId: '129576',
        },
      },
      id: '120kfeske',
      tagid: 'div-gpt-ad-9383743831-6',
    },
  ],
  ext: {
    adbook: {
      version: {
        adapter: VERSION,
        prebid: '$prebid.version$',
      },
    },
  },
};

const mixedBid = {
  bidder: 'adbookpsp',
  params: {
    orgId: '129576',
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 600]],
    },
    video: {
      mimes: ['video/mp4'],
      playerSize: [[300, 600]],
    },
  },
  adUnitCode: 'div-gpt-ad-9383743831-5',
  transactionId: 'aacc3fasf-fere-1335-8m1s-785393mc3fj',
  bidId: '120kfeske',
  bidderRequestId: '999ccceeee11',
  auctionId: 'aaccee333311',
  lineItemId: 12341234,
};

const mixedExchangeRequest = {
  id: '999ccceeee11',
  device: {
    h: 100,
    w: 100,
    js: true,
    ua: navigator.userAgent,
    dnt: 0,
  },
  regs: {
    coppa: 0,
    ext: {
      gdpr: 1,
      gdprConsentString: 'gdprConsentString',
      us_privacy: 'uspConsentString',
    },
  },
  site: {
    domain: 'mock-page.com',
    page: 'http://mock-page.com',
    ref: 'http://example-domain.com/foo',
  },
  source: {
    fd: 1,
    tid: 'aaccee333311',
  },
  tmax: 200,
  user: {
    gdprConsentString: 'gdprConsentString',
    id: '54444444-5444-4444-9444-544444444444',
  },
  imp: [
    {
      banner: {
        format: [
          {
            w: 300,
            h: 600,
          },
        ],
        w: 300,
        h: 600,
        topframe: 0,
        pos: 0,
      },
      video: {
        h: 600,
        mimes: ['video/mp4'],
        w: 300,
      },
      ext: {
        adbook: {
          orgId: '129576',
        },
      },
      id: '120kfeske',
      tagid: 'div-gpt-ad-9383743831-5',
    },
  ],
  ext: {
    adbook: {
      version: {
        adapter: VERSION,
        prebid: '$prebid.version$',
      },
    },
  },
};

const exchangeBidRequest = {
  id: '999ccceeee11',
  tmax: 200,
  imp: [
    {
      id: '9873kfse',
      banner: {
        format: [
          {
            w: 300,
            h: 250,
          },
        ],
      },
      video: {
        w: 300,
        h: 250,
      },
      tagid: 'div-gpt-ad-837465923534-0',
    },
    {
      id: '120kfeske',
      banner: {
        format: [
          {
            w: 300,
            h: 250,
          },
        ],
      },
      video: {
        w: 300,
        h: 250,
      },
      tagid: 'div-gpt-ad-837465923534-0',
    },
  ],
  source: {
    fd: 1,
    tid: 'aaccee333311',
  },
  site: {
    domain: location.hostname,
    page: location.href,
    ref: 'http://prebid-test-page.io:8080/banner.html',
  },
};

const exchangeResponse = {
  id: '999ccceeee11',
  seatbid: [
    {
      seat: 'adbookpsp',
      group: 0,
      bid: [
        {
          id: 'bid123456',
          w: 300,
          h: 250,
          impid: '9873kfse',
          price: 0.5,
          exp: 300,
          crid: '123456789',
          adm: '<div>ad</div>',
          adid: '5',
          dealid: 'werwetwerw',
          nurl: 'http://win.example.url',
          ext: {
            liid: '2342345',
            ordid: '567843',
          },
          cat: ['IAB2-1', 'IAB2-2', 'IAB2-3'],
          adomain: ['advertiser.com'],
        },
      ],
    },
    {
      seat: 'adbookpsp',
      group: 0,
      bid: [
        {
          id: 'bid4321',
          impid: '120kfeske',
          price: 0.45,
          exp: 300,
          crid: '543123',
          adm: '<VAST version="4.2" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="http://www.iab.com/VAST"></VAST>',
          adid: '10',
          dealid: 'dsfxcxcvxc',
          nurl: 'http://win.example.url',
          ext: {
            liid: '2121221',
            ordid: '5678234',
          },
          cat: ['IAB2-3'],
          adomain: ['advertiser.com', 'campaign.advertiser.com'],
        },
      ],
    },
  ],
  ext: {
    sync: [
      {
        type: 'image',
        url: 'http://sometest.com/sync/1234567',
      },
      {
        type: 'iframe',
        url: 'http://sometest.com/sync/1234567',
      },
    ],
  },
};
