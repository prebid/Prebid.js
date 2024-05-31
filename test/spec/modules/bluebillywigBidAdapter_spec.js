import {expect} from 'chai';
import {spec} from 'modules/bluebillywigBidAdapter.js';
import {deepAccess, deepClone} from 'src/utils.js';
import {config} from 'src/config.js';
import {VIDEO} from 'src/mediaTypes.js';

const BB_CONSTANTS = {
  BIDDER_CODE: 'bluebillywig',
  AUCTION_URL: '$$URL_STARTpbs.bluebillywig.com/openrtb2/auction?pub=$$PUBLICATION',
  SYNC_URL: '$$URL_STARTpbs.bluebillywig.com/static/cookie-sync.html?pub=$$PUBLICATION',
  RENDERER_URL: 'https://$$PUBLICATION.bbvms.com/r/$$RENDERER.js',
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_TTL: 300,
  DEFAULT_WIDTH: 768,
  DEFAULT_HEIGHT: 432,
  DEFAULT_NET_REVENUE: true
};

describe('BlueBillywigAdapter', () => {
  describe('isBidRequestValid', () => {
    const baseValidBid = {
      bidder: BB_CONSTANTS.BIDDER_CODE,
      params: {
        accountId: 123,
        publicationName: 'bbprebid.dev',
        rendererCode: 'glorious_renderer',
        connections: [ BB_CONSTANTS.BIDDER_CODE ],
        bluebillywig: {}
      },
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      }
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(baseValidBid)).to.equal(true);
    });

    it('should return false when params missing', () => {
      const bid = deepClone(baseValidBid);
      delete bid.params;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publicationName is missing', () => {
      const bid = deepClone(baseValidBid);
      delete bid.params.publicationName;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publicationName is not a string', () => {
      const bid = deepClone(baseValidBid);

      bid.params.publicationName = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.publicationName = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.publicationName = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.publicationName = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publicationName is formatted poorly', () => {
      const bid = deepClone(baseValidBid);

      bid.params.publicationName = 'bb.';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.publicationName = 'bb-test';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.publicationName = '?';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when renderer is not specified', () => {
      const bid = deepClone(baseValidBid);

      delete bid.params.rendererCode;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when renderer is not a string', () => {
      const bid = deepClone(baseValidBid);

      bid.params.rendererCode = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererCode = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererCode = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererCode = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when renderer is formatted poorly', () => {
      const bid = deepClone(baseValidBid);

      bid.params.rendererCode = 'bb.';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererCode = 'bb-test';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererCode = '?';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when accountId is not specified', () => {
      const bid = deepClone(baseValidBid);

      delete bid.params.accountId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when connections is not specified', () => {
      const bid = deepClone(baseValidBid);

      delete bid.params.connections;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when connections is not an array', () => {
      const bid = deepClone(baseValidBid);

      bid.params.connections = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.connections = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.connections = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.connections = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.connections = 'string';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when a connection is missing', () => {
      const bid = deepClone(baseValidBid);

      bid.params.connections.push('potatoes');
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.connections.pop();

      delete bid.params[BB_CONSTANTS.BIDDER_CODE];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if bid has no mediaTypes', () => {
      const bid = deepClone(baseValidBid);

      delete bid.mediaTypes;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if bid has no mediaTypes.video', () => {
      const bid = deepClone(baseValidBid);

      delete bid.mediaTypes[VIDEO];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if bid has no mediaTypes.video.context', () => {
      const bid = deepClone(baseValidBid);

      delete bid.mediaTypes[VIDEO].context;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if mediaTypes.video.context is not "outstream"', () => {
      const bid = deepClone(baseValidBid);

      bid.mediaTypes[VIDEO].context = 'instream';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if video is specified but is not an object', () => {
      const bid = deepClone(baseValidBid);

      bid.params.video = null;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.video = 'string';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.video = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.video = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.video = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if rendererSettings is specified but is not an object', () => {
      const bid = deepClone(baseValidBid);

      bid.params.rendererSettings = null;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererSettings = 'string';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererSettings = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererSettings = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.rendererSettings = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const publicationName = 'bbprebid.dev';
    const rendererCode = 'glorious_renderer';

    const baseValidBid = {
      bidder: BB_CONSTANTS.BIDDER_CODE,
      params: {
        accountId: 123,
        publicationName: publicationName,
        rendererCode: rendererCode,
        connections: [ BB_CONSTANTS.BIDDER_CODE ],
        bluebillywig: {}
      },
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      }
    };

    const baseValidBidRequests = [baseValidBid];

    const validBidderRequest = {
      ortb2: {
        source: {
          tid: '12abc345-67d8-9012-e345-6f78901a2b34',
        }
      },
      auctionStart: 1585918458868,
      bidderCode: BB_CONSTANTS.BIDDER_CODE,
      bidderRequestId: '1a2345b67c8d9e0',
      bids: [{
        adUnitCode: 'ad-unit-test',
        auctionId: '12abc345-67d8-9012-e345-6f78901a2b34',
        bidId: '1234ab567c89de0',
        bidRequestsCount: 1,
        bidder: BB_CONSTANTS.BIDDER_CODE,
        bidderRequestId: '1a2345b67c8d9e0',
        params: baseValidBid.params,
        sizes: [[768, 432], [640, 480], [630, 360]],
        transactionId: '2b34c5de-f67a-8901-bcd2-34567efabc89'
      }],
      start: 11585918458869,
      timeout: 3000
    };

    it('sends bid request to AUCTION_URL via POST', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      expect(request.url).to.equal(`https://pbs.bluebillywig.com/openrtb2/auction?pub=${publicationName}`);
      expect(request.method).to.equal('POST');
    });

    it('sends data as a string', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      expect(request.data).to.be.a('string');
    });

    it('sends all bid parameters', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('builds the base request properly', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.id).to.exist;
      expect(payload.source).to.be.an('object');
      expect(payload.source.tid).to.equal(validBidderRequest.ortb2.source.tid);
      expect(payload.tmax).to.equal(3000);
      expect(payload.imp).to.be.an('array');
      expect(payload.test).to.be.a('number');
      expect(payload).to.have.nested.property('ext.prebid.targeting');
      expect(payload.ext.prebid.targeting).to.be.an('object');
      expect(payload.ext.prebid.targeting.includewinners).to.equal(true);
      expect(payload.ext.prebid.targeting.includebidderkeys).to.equal(false);
    });

    it('adds an impression to the payload', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.imp.length).to.equal(1);
    });

    it('adds connections to ext', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].ext).to.have.all.keys(['bluebillywig']);
    });

    it('adds gdpr when present', () => {
      const newValidBidderRequest = deepClone(validBidderRequest);
      newValidBidderRequest.gdprConsent = {
        consentString: 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
        gdprApplies: true
      };

      const request = spec.buildRequests(baseValidBidRequests, newValidBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('regs.ext.gdpr');
      expect(payload.regs.ext.gdpr).to.be.a('number');
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload).to.have.nested.property('user.ext.consent');
      expect(payload.user.ext.consent).to.equal(newValidBidderRequest.gdprConsent.consentString);
    });

    it('sets gdpr to 0 when explicitly gdprApplies: false', () => {
      const newValidBidderRequest = deepClone(validBidderRequest);
      newValidBidderRequest.gdprConsent = {
        gdprApplies: false
      };

      const request = spec.buildRequests(baseValidBidRequests, newValidBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('regs.ext.gdpr');
      expect(payload.regs.ext.gdpr).to.be.a('number');
      expect(payload.regs.ext.gdpr).to.equal(0);
    });

    it('adds usp_consent when present', () => {
      const newValidBidderRequest = deepClone(validBidderRequest);
      newValidBidderRequest.uspConsent = '1YYY';

      const request = spec.buildRequests(baseValidBidRequests, newValidBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('regs.ext.us_privacy');
      expect(payload.regs.ext.us_privacy).to.equal(newValidBidderRequest.uspConsent);
    });

    it('sets coppa to 1 when specified in config', () => {
      config.setConfig({'coppa': true});

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('regs.coppa');
      expect(payload.regs.coppa).to.equal(1);

      config.resetConfig();
    });

    it('does not set coppa when disabled in the config', () => {
      config.setConfig({'coppa': false});

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(payload, 'regs.coppa')).to.be.undefined;

      config.resetConfig();
    });

    it('does not set coppa when not specified in config', () => {
      config.resetConfig();

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(payload, 'regs.coppa')).to.be.undefined;
    });

    it('should add window size to request by default', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('device.w');
      expect(payload).to.have.nested.property('device.h');
      expect(payload.device.w).to.be.a('number');
      expect(payload.device.h).to.be.a('number');
    });

    it('should add site when specified in config', () => {
      config.setConfig({ site: { name: 'Blue Billywig', domain: 'bluebillywig.com', page: 'https://bluebillywig.com/', publisher: { id: 'abc', name: 'Blue Billywig', domain: 'bluebillywig.com' } } });

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.property('site');
      expect(payload).to.have.nested.property('site.name');
      expect(payload).to.have.nested.property('site.domain');
      expect(payload).to.have.nested.property('site.page');
      expect(payload).to.have.nested.property('site.publisher');
      expect(payload).to.have.nested.property('site.publisher.id');
      expect(payload).to.have.nested.property('site.publisher.name');
      expect(payload).to.have.nested.property('site.publisher.domain');

      config.resetConfig();
    });

    it('should add app when specified in config', () => {
      config.setConfig({ app: { bundle: 'org.prebid.mobile.demoapp', domain: 'prebid.org' } });

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.property('app');
      expect(payload).to.have.nested.property('app.bundle');
      expect(payload).to.have.nested.property('app.domain');
      expect(payload.app.bundle).to.equal('org.prebid.mobile.demoapp');
      expect(payload.app.domain).to.equal('prebid.org');

      config.resetConfig();
    });

    it('should add referrerInfo as site when no app is set', () => {
      const newValidBidderRequest = deepClone(validBidderRequest);

      newValidBidderRequest.refererInfo = { page: 'https://www.bluebillywig.com' };

      const request = spec.buildRequests(baseValidBidRequests, newValidBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('site.page');
      expect(payload.site.page).to.equal('https://www.bluebillywig.com');
    });

    it('should not add referrerInfo as site when app is set', () => {
      config.setConfig({ app: { bundle: 'org.prebid.mobile.demoapp', domain: 'prebid.org' } });

      const newValidBidderRequest = deepClone(validBidderRequest);
      newValidBidderRequest.refererInfo = { referer: 'https://www.bluebillywig.com' };

      const request = spec.buildRequests(baseValidBidRequests, newValidBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.site).to.be.undefined;
      config.resetConfig();
    });

    it('should add device size to request when specified in config', () => {
      config.setConfig({ device: { w: 1, h: 1 } });

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('device.w');
      expect(payload).to.have.nested.property('device.h');
      expect(payload.device.w).to.be.a('number');
      expect(payload.device.h).to.be.a('number');
      expect(payload.device.w).to.equal(1);
      expect(payload.device.h).to.equal(1);

      config.resetConfig();
    });

    it('should set schain on the request when set on config', () => {
      const schain = {
        validation: 'lax',
        config: {
          ver: '1.0',
          complete: 1,
	  nodes: [
            {
              asi: 'indirectseller.com',
	      sid: '00001',
              hp: 1
            }
          ]
        }
      };

      const newBaseValidBidRequests = deepClone(baseValidBidRequests);
      newBaseValidBidRequests[0].schain = schain;

      const request = spec.buildRequests(newBaseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('source.ext.schain');
      expect(payload.source.ext.schain).to.deep.equal(schain);
    });

    it('should add currency when specified on the config', () => {
      config.setConfig({ currency: { adServerCurrency: 'USD' } });

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.property('cur');
      expect(payload.cur).to.eql(['USD']); // NB not equal, eql to check for same array because [1] === [1] fails normally

      config.resetConfig();
    });

    it('should also take in array for currency on the config', () => {
      config.setConfig({ currency: { adServerCurrency: ['USD', 'PHP'] } });

      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.property('cur');
      expect(payload.cur).to.eql(['USD']); // NB not equal, eql to check for same array because [1] === [1] fails normally

      config.resetConfig();
    });

    it('should not set cur when currency is not specified on the config', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.cur).to.be.undefined;
    });

    it('should set user ids when present', () => {
      const newBaseValidBidRequests = deepClone(baseValidBidRequests);
      newBaseValidBidRequests[0].userIdAsEids = [ {} ];

      const request = spec.buildRequests(newBaseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.have.nested.property('user.ext.eids');
      expect(payload.user.ext.eids).to.be.an('array');
      expect(payload.user.ext.eids.length).to.equal(1);
    });

    it('should not set user ids when none present', () => {
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(payload, 'user.ext.eids')).to.be.undefined;
    });

    it('should set imp.0.video.[w|h|placement] by default', () => {
      const newBaseValidBidRequests = deepClone(baseValidBidRequests);

      const request = spec.buildRequests(newBaseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(payload, 'imp.0.video.w')).to.equal(768);
      expect(deepAccess(payload, 'imp.0.video.h')).to.equal(432);
      expect(deepAccess(payload, 'imp.0.video.placement')).to.equal(3);
    });

    it('should update imp0.video.[w|h] when present in config', () => {
      const newBaseValidBidRequests = deepClone(baseValidBidRequests);
      newBaseValidBidRequests[0].mediaTypes.video.playerSize = [1, 1];

      const request = spec.buildRequests(newBaseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(payload, 'imp.0.video.w')).to.equal(1);
      expect(deepAccess(payload, 'imp.0.video.h')).to.equal(1);
    });

    it('should allow overriding any imp0.video key through params.video', () => {
      const newBaseValidBidRequests = deepClone(baseValidBidRequests);
      newBaseValidBidRequests[0].params.video = {
        w: 2,
        h: 2,
        placement: 1,
        minduration: 15,
        maxduration: 30
      };

      const request = spec.buildRequests(newBaseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(payload, 'imp.0.video.w')).to.equal(2);
      expect(deepAccess(payload, 'imp.0.video.h')).to.equal(2);
      expect(deepAccess(payload, 'imp.0.video.placement')).to.equal(1);
      expect(deepAccess(payload, 'imp.0.video.minduration')).to.equal(15);
      expect(deepAccess(payload, 'imp.0.video.maxduration')).to.equal(30);
    });

    it('should not allow placing any non-OpenRTB 2.5 keys on imp.0.video through params.video', () => {
      const newBaseValidBidRequests = deepClone(baseValidBidRequests);
      newBaseValidBidRequests[0].params.video = {
        'true': true,
        'testing': 'some',
        123: {},
        '': 'values'
      };

      const request = spec.buildRequests(newBaseValidBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);

      expect(deepAccess(request, 'imp.0.video.true')).to.be.undefined;
      expect(deepAccess(payload, 'imp.0.video.testing')).to.be.undefined;
      expect(deepAccess(payload, 'imp.0.video.123')).to.be.undefined;
      expect(deepAccess(payload, 'imp.0.video.')).to.be.undefined;
    });
  });
  describe('interpretResponse', () => {
    const publicationName = 'bbprebid.dev';
    const rendererCode = 'glorious_renderer';

    const baseValidBid = {
      bidder: BB_CONSTANTS.BIDDER_CODE,
      params: {
        accountId: 123,
        publicationName: publicationName,
        rendererCode: rendererCode,
        connections: [ BB_CONSTANTS.BIDDER_CODE ],
        bluebillywig: {}
      },
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      }
    };

    const baseValidBidRequests = [baseValidBid];

    const validBidderRequest = {
      auctionId: '12abc345-67d8-9012-e345-6f78901a2b34',
      auctionStart: 1585918458868,
      bidderCode: BB_CONSTANTS.BIDDER_CODE,
      bidderRequestId: '1a2345b67c8d9e0',
      bids: [{
        adUnitCode: 'ad-unit-test',
        auctionId: '12abc345-67d8-9012-e345-6f78901a2b34',
        bidId: '1234ab567c89de0',
        bidRequestsCount: 1,
        bidder: BB_CONSTANTS.BIDDER_CODE,
        bidderRequestId: '1a2345b67c8d9e0',
        params: baseValidBid.params,
        sizes: [[640, 480], [630, 360]],
        transactionId: '2b34c5de-f67a-8901-bcd2-34567efabc89'
      }],
      start: 11585918458869,
      timeout: 3000
    };

    const validResponse = {
      id: 'a12abc345-67d8-9012-e345-6f78901a2b34',
      seatbid: [
        {
          bid: [
            {
              id: '1',
              impid: '1234ab567c89de0',
              price: 1,
              adm: '<?xml version="1.0" encoding="UTF-8"?>\r\n<VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0" xsi:noNamespaceSchemaLocation="vast.xsd"><Ad id="3707967"><InLine><AdSystem>BB Adserver</AdSystem><AdTitle><![CDATA[DO NOT DELETE - PREBID E2E TEST CLIP]]></AdTitle><Impression><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=it]]></Impression><Creatives><Creative><Linear><Duration>00:00:51</Duration><TrackingEvents><Tracking event="firstQuartile"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=25]]></Tracking><Tracking event="midpoint"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=50]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=75]]></Tracking><Tracking event="complete"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=100]]></Tracking><Tracking event="start"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=st]]></Tracking></TrackingEvents><VideoClicks><ClickTracking><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xcl]]></ClickTracking><ClickThrough><![CDATA[]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="2000" height="720" width="1280"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358872305594.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="1600" height="432" width="768"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358872983333.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="400" height="288" width="512"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358873227458.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="800" height="432" width="768"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358873595994.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="3000" height="1080" width="1920"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358874138607.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
              adid: '67069817',
              adomain: [
                'bluebillywig.com'
              ],
              cid: '3535',
              crid: '67069817',
              w: 1,
              h: 1,
	      publicationName: 'bbprebid',
	      accountId: 123,
              ext: {
                prebid: {
                  targeting: {
                    hb_bidder: 'bluebillywig',
                    hb_pb: '1.00',
                    hb_size: '1x1'
                  },
                  type: 'video'
                },
                bidder: {
                  prebid: {
                    targeting: {
                      hb_bidder: 'bluebillywig',
                      hb_pb: '10.00',
                      hb_size: '1x1'
                    },
                    type: 'video',
                    video: {
                      duration: 51,
                      primary_category: ''
                    }
                  },
                  bidder: {
                    bluebillywig: {
                      brand_id: 1,
                      auction_id: 1,
                      bid_ad_type: 1,
                      creative_info: {
                        video: {
                          duration: 51,
                          mimes: [
                            'video/x-flv',
                            'video/mp4',
                            'video/webm'
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          seat: 'bluebillywig'
        }
      ],
      cur: 'USD',
      ext: {
        responsetimemillis: {
          bluebillywig: 0
        },
        tmaxrequest: 5000
      }
    };

    const serverResponse = { body: validResponse };

    it('should build bid array', () => {
      const response = deepClone(serverResponse);
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', () => {
      const response = deepClone(serverResponse);
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);
      const bid = result[0];

      // BB_HELPERS.transformRTBToPrebidProps
      expect(bid.cpm).to.equal(serverResponse.body.seatbid[0].bid[0].price);
      expect(bid.bidId).to.equal(serverResponse.body.seatbid[0].bid[0].impid);
      expect(bid.requestId).to.equal(serverResponse.body.seatbid[0].bid[0].impid);
      expect(bid.width).to.equal(serverResponse.body.seatbid[0].bid[0].w || BB_CONSTANTS.DEFAULT_WIDTH);
      expect(bid.height).to.equal(serverResponse.body.seatbid[0].bid[0].h || BB_CONSTANTS.DEFAULT_HEIGHT);
      expect(bid.ad).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
      expect(bid.netRevenue).to.equal(BB_CONSTANTS.DEFAULT_NET_REVENUE);
      expect(bid.creativeId).to.equal(serverResponse.body.seatbid[0].bid[0].crid);
      expect(bid.currency).to.equal(serverResponse.body.cur);
      expect(bid.ttl).to.equal(BB_CONSTANTS.DEFAULT_TTL);

      expect(bid).to.have.property('meta');
      expect(bid.meta).to.have.property('advertiserDomains');
      expect(bid.meta.advertiserDomains[0]).to.equal('bluebillywig.com');

      expect(bid.publicationName).to.equal(validBidderRequest.bids[0].params.publicationName);
      expect(bid.rendererCode).to.equal(validBidderRequest.bids[0].params.rendererCode);
      expect(bid.accountId).to.equal(validBidderRequest.bids[0].params.accountId);
    });

    it('should not give anything when seatbid is an empty array', () => {
      const seatbidEmptyArray = deepClone(serverResponse);
      seatbidEmptyArray.body.seatbid = [];

      const response = seatbidEmptyArray;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(result.length).to.equal(0);
    });

    it('should not give anything when seatbid is missing', () => {
      const seatbidMissing = deepClone(serverResponse);
      delete seatbidMissing.body.seatbid;

      const response = seatbidMissing;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(result.length).to.equal(0);
    });

    const seatbidNotArrayResponse = deepClone(serverResponse);
    it('should not give anything when seatbid is not an array', () => {
      const invalidValues = [ false, null, {}, void (0), 123, 'string' ];

      for (const invalidValue of invalidValues) {
        seatbidNotArrayResponse.body.seatbid = invalidValue
        const response = deepClone(seatbidNotArrayResponse); // interpretResponse is destructive
        const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
        const result = spec.interpretResponse(response, request);

        expect(result.length).to.equal(0);
      }
    });

    it('should not give anything when seatbid.bid is an empty array', () => {
      const seatbidBidEmpty = deepClone(serverResponse);
      seatbidBidEmpty.body.seatbid[0].bid = [];

      const response = seatbidBidEmpty;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(result.length).to.equal(0);
    });

    it('should not give anything when seatbid.bid is missing', () => {
      const seatbidBidMissing = deepClone(serverResponse);
      delete seatbidBidMissing.body.seatbid[0].bid;

      const response = seatbidBidMissing;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(result.length).to.equal(0);
    });

    it('should not give anything when seatbid.bid is not an array', () => {
      const seatbidBidNotArray = deepClone(serverResponse);

      const invalidValues = [ false, null, {}, void (0), 123, 'string' ];

      for (const invalidValue of invalidValues) {
        seatbidBidNotArray.body.seatbid[0].bid = invalidValue;

        const response = deepClone(seatbidBidNotArray); // interpretResponse is destructive
        const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
        const result = spec.interpretResponse(response, request);

        expect(result.length).to.equal(0);
      }
    });

    it('should take default width and height when w/h not present', () => {
      const bidSizesMissing = deepClone(serverResponse);

      delete bidSizesMissing.body.seatbid[0].bid[0].w;
      delete bidSizesMissing.body.seatbid[0].bid[0].h;

      const response = bidSizesMissing;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(deepAccess(result, '0.width')).to.equal(768);
      expect(deepAccess(result, '0.height')).to.equal(432);
    });

    it('should take nurl value when adm not present', () => {
      const bidAdmMissing = deepClone(serverResponse);

      delete bidAdmMissing.body.seatbid[0].bid[0].adm;
      bidAdmMissing.body.seatbid[0].bid[0].nurl = 'https://bluebillywig.com';

      const response = bidAdmMissing;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(deepAccess(result, '0.vastXml')).to.be.undefined;
      expect(deepAccess(result, '0.vastUrl')).to.equal('https://bluebillywig.com');
    });

    it('should not take nurl value when adm present', () => {
      const bidAdmNurlPresent = deepClone(serverResponse);

      bidAdmNurlPresent.body.seatbid[0].bid[0].nurl = 'https://bluebillywig.com';

      const response = bidAdmNurlPresent;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(deepAccess(result, '0.vastXml')).to.equal(bidAdmNurlPresent.body.seatbid[0].bid[0].adm);
      expect(deepAccess(result, '0.vastUrl')).to.be.undefined;
    });

    it('should take ext.prebid.cache data when present, ignore ext.prebid.targeting and nurl', () => {
      const bidExtPrebidCache = deepClone(serverResponse);

      delete bidExtPrebidCache.body.seatbid[0].bid[0].adm;
      bidExtPrebidCache.body.seatbid[0].bid[0].nurl = 'https://notnurl.com';

      bidExtPrebidCache.body.seatbid[0].bid[0].ext = {
        prebid: {
          cache: {
            vastXml: {
              url: 'https://bluebillywig.com',
              cacheId: '12345'
            }
          },
          targeting: {
            hb_uuid: '23456',
            hb_cache_host: 'bluebillywig.com',
            hb_cache_path: '/cache'
          }
        }
      };

      const response = bidExtPrebidCache;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(deepAccess(result, '0.vastUrl')).to.equal('https://bluebillywig.com');
      expect(deepAccess(result, '0.videoCacheKey')).to.equal('12345');
    });

    it('should take ext.prebid.targeting data when ext.prebid.cache not present, and ignore nurl', () => {
      const bidExtPrebidTargeting = deepClone(serverResponse);

      delete bidExtPrebidTargeting.body.seatbid[0].bid[0].adm;
      bidExtPrebidTargeting.body.seatbid[0].bid[0].nurl = 'https://notnurl.com';

      bidExtPrebidTargeting.body.seatbid[0].bid[0].ext = {
        prebid: {
          targeting: {
            hb_uuid: '34567',
            hb_cache_host: 'bluebillywig.com',
            hb_cache_path: '/cache'
          }
        }
      };

      const response = bidExtPrebidTargeting;
      const request = spec.buildRequests(baseValidBidRequests, validBidderRequest);
      const result = spec.interpretResponse(response, request);

      expect(deepAccess(result, '0.vastUrl')).to.equal('https://bluebillywig.com/cache?uuid=34567');
      expect(deepAccess(result, '0.videoCacheKey')).to.equal('34567');
    });
  });
  describe('getUserSyncs', () => {
    const publicationName = 'bbprebid.dev';
    const rendererCode = 'glorious_renderer';

    const baseValidBid = {
      bidder: BB_CONSTANTS.BIDDER_CODE,
      params: {
        accountId: 123,
        publicationName: publicationName,
        rendererCode: rendererCode,
        connections: [ BB_CONSTANTS.BIDDER_CODE ],
        bluebillywig: {}
      },
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      }
    };

    const validBidRequests = [baseValidBid];

    const validBidderRequest = {
      auctionId: '12abc345-67d8-9012-e345-6f78901a2b34',
      auctionStart: 1585918458868,
      bidderCode: BB_CONSTANTS.BIDDER_CODE,
      bidderRequestId: '1a2345b67c8d9e0',
      bids: [{
        adUnitCode: 'ad-unit-test',
        auctionId: '12abc345-67d8-9012-e345-6f78901a2b34',
        bidId: '1234ab567c89de0',
        bidRequestsCount: 1,
        bidder: BB_CONSTANTS.BIDDER_CODE,
        bidderRequestId: '1a2345b67c8d9e0',
        params: baseValidBid.params,
        sizes: [[768, 432], [640, 480], [630, 360]],
        transactionId: '2b34c5de-f67a-8901-bcd2-34567efabc89'
      }],
      start: 11585918458869,
      timeout: 3000
    };
    const validResponse = {
      id: 'a12abc345-67d8-9012-e345-6f78901a2b34',
      seatbid: [
        {
          bid: [
            {
              id: '1',
              impid: '1234ab567c89de0',
              price: 1,
              adm: '<?xml version="1.0" encoding="UTF-8"?>\r\n<VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0" xsi:noNamespaceSchemaLocation="vast.xsd"><Ad id="3707967"><InLine><AdSystem>BB Adserver</AdSystem><AdTitle><![CDATA[DO NOT DELETE - PREBID E2E TEST CLIP]]></AdTitle><Impression><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=it]]></Impression><Creatives><Creative><Linear><Duration>00:00:51</Duration><TrackingEvents><Tracking event="firstQuartile"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=25]]></Tracking><Tracking event="midpoint"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=50]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=75]]></Tracking><Tracking event="complete"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xpg&pct=100]]></Tracking><Tracking event="start"><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=st]]></Tracking></TrackingEvents><VideoClicks><ClickTracking><![CDATA[https://stats.bluebillywig.com?et=vasttracker&pd=&ct=DO NOT DELETE - PREBID E2E TEST CLIP&du=51&sot=on_demand&pm=external&sid=1eb6e953-360a-4655-9bc8-3378e691a077&pp=ovp&ts=1586359000&id=3707967&cid=3707967&pt=vasttracker&mt=vast&ev=xcl]]></ClickTracking><ClickThrough><![CDATA[]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="2000" height="720" width="1280"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358872305594.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="1600" height="432" width="768"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358872983333.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="400" height="288" width="512"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358873227458.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="800" height="432" width="768"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358873595994.mp4]]></MediaFile><MediaFile delivery="progressive" type="video/mp4" bitrate="3000" height="1080" width="1920"><![CDATA[https://d736l0py1kx0s.cloudfront.net/ovp/media/2020/04/08/asset-3707967-1586358874138607.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
              adid: '67069817',
              adomain: [
                'bluebillywig.com'
              ],
              cid: '3535',
              crid: '67069817',
              w: 1,
              h: 1,
	      publicationName: 'bbprebid',
	      accountId: 123,
              ext: {
                prebid: {
                  targeting: {
                    hb_bidder: 'bluebillywig',
                    hb_pb: '1.00',
                    hb_size: '1x1'
                  },
                  type: 'video'
                },
                bidder: {
                  prebid: {
                    targeting: {
                      hb_bidder: 'bluebillywig',
                      hb_pb: '10.00',
                      hb_size: '1x1'
                    },
                    type: 'video',
                    video: {
                      duration: 51,
                      primary_category: ''
                    }
                  },
                  bidder: {
                    bluebillywig: {
                      brand_id: 1,
                      auction_id: 1,
                      bid_ad_type: 1,
                      creative_info: {
                        video: {
                          duration: 51,
                          mimes: [
                            'video/x-flv',
                            'video/mp4',
                            'video/webm'
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          seat: 'bluebillywig'
        }
      ],
      cur: 'USD',
      ext: {
        responsetimemillis: {
          bluebillywig: 0
        },
        tmaxrequest: 5000
      }
    };

    const serverResponse = { body: validResponse };

    const gdpr = {
      consentString: 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAA  AAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
      gdprApplies: true
    };

    it('should return empty if no server response', function () {
      const result = spec.getUserSyncs({}, false, gdpr);
      expect(result).to.be.empty;
    });

    it('should return empty if server response is empty', function () {
      const result = spec.getUserSyncs({}, [], gdpr);
      expect(result).to.be.empty;
    });

    it('should return empty if iframeEnabled is not true', () => {
      const result = spec.getUserSyncs({iframeEnabled: false}, [serverResponse], gdpr);
      expect(result).to.be.empty;
    });

    it('should append the various values if they exist', function() {
      // push data to syncStore
      spec.buildRequests(validBidRequests, validBidderRequest);

      const result = spec.getUserSyncs({iframeEnabled: true}, [serverResponse], gdpr);

      expect(result).to.not.be.empty;

      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include(gdpr.consentString);
      expect(result[0].url).to.include('accountId=123');
      expect(result[0].url).to.include(`bidders=${btoa(JSON.stringify(validBidRequests[0].params.connections))}`);
      expect(result[0].url).to.include('cb=');
    });
  });
});
