import { expect } from 'chai';
import sinon from 'sinon';
import { config } from 'src/config.js';
import * as gdprUtils from 'src/utils/gdpr.js';
import { spec } from 'modules/optoutBidAdapter.js';

describe('optoutAdapterTest', function () {
  afterEach(function () {
    config.resetConfig();
    sinon.restore();
  });

  describe('isBidRequestValid', function () {
    it('valid when publisher + adSlot exist', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: { adSlot: 'prebid_demo', publisher: '8' }
      })).to.equal(true);
    });

    it('valid when publisher + adslot (lowercase) exist', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: { adslot: 'prebid_demo', publisher: '8' }
      })).to.equal(true);
    });

    it('invalid when adSlot missing', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: { publisher: '8' }
      })).to.equal(false);
    });

    it('invalid when publisher missing', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: { adSlot: 'prebid_demo' }
      })).to.equal(false);
    });

    it('invalid when params missing', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: {}
      })).to.equal(false);
    });

    it('invalid when bid is null', function () {
      expect(spec.isBidRequestValid(null)).to.equal(false);
    });

    it('invalid when bid is undefined', function () {
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'optout',
        params: { adSlot: 'prebid_demo', publisher: '8' },
        bidId: 'bidA'
      },
      {
        bidder: 'optout',
        params: { adSlot: 'testslot2', publisher: '8' },
        bidId: 'bidB'
      }
    ];

    it('returns [] when no validBidRequests', function () {
      const requests = spec.buildRequests([], {});
      expect(requests).to.deep.equal([]);
    });

    it('returns a single POST request', function () {
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
    });

    it('uses optout endpoint when no gdprConsent', function () {
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].url).to.match(/optoutadserving\.com\/prebid\/display/);
    });

    it('uses optin endpoint when gdprApplies is false', function () {
      const bidderRequest = {
        gdprConsent: {
          gdprApplies: false,
          consentString: 'test',
          apiVersion: 2
        }
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.match(/optinadserving\.com\/prebid\/display/);
      expect(requests[0].data.gdpr).to.equal(0);
    });

    it('handles gdprConsent with apiVersion 1 (no special branching)', function () {
      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          consentString: '',
          apiVersion: 1
        }
      };

      // purpose1 not stubbed; safest expected is still optout when gdprApplies true & hasPurpose1Consent false/unknown
      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(false);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.gdpr).to.equal(1);
      expect(requests[0].data.consent).to.equal('');
      expect(requests[0].url).to.match(/optoutadserving\.com\/prebid\/display/);
    });

    it('always includes sdk_version=prebid', function () {
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.sdk_version).to.equal('prebid');
    });

    it('currency defaults to EUR when not configured', function () {
      config.resetConfig();
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.cur.adServerCurrency).to.equal('EUR');
    });

    it('currency uses config when provided', function () {
      config.setConfig({
        currency: { adServerCurrency: 'USD', granularityMultiplier: 1 }
      });

      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.cur.adServerCurrency).to.equal('USD');
    });

    it('builds slots with id and requestId', function () {
      const requests = spec.buildRequests(bidRequests, {});
      const slots = requests[0].data.slots;

      expect(slots[0].id).to.equal('prebid_demo');
      expect(slots[0].requestId).to.equal('bidA');
      expect(slots[1].id).to.equal('testslot2');
      expect(slots[1].requestId).to.equal('bidB');
    });

    it('uses refererInfo.canonicalUrl when present (sanitized to origin+pathname)', function () {
      const bidderRequest = { refererInfo: { canonicalUrl: 'https://example.com/path?secret=1#frag' } };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.url).to.equal('https://example.com/path');
    });

    it('falls back to refererInfo.page when canonicalUrl missing (sanitized)', function () {
      const bidderRequest = { refererInfo: { page: 'https://example.com/page?x=1#y' } };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.url).to.equal('https://example.com/page');
    });

    it('falls back to window.location (sanitized) when refererInfo missing', function () {
      const requests = spec.buildRequests(bidRequests, {});
      // The adapter sanitizes to origin+pathname
      expect(requests[0].data.url).to.equal(window.location.origin + window.location.pathname);
    });

    it('uses publisher from the first bid when batching, even if later bids differ', function () {
      const br = [
        { bidder: 'optout', params: { adSlot: 'slot1', publisher: 'PUB1' }, bidId: '1' },
        { bidder: 'optout', params: { adSlot: 'slot2', publisher: 'PUB2' }, bidId: '2' }
      ];

      const requests = spec.buildRequests(br, {});
      expect(requests[0].data.publisher).to.equal('PUB1');
      // Slots are still batched into one request
      expect(requests[0].data.slots).to.have.lengthOf(2);
    });

    it('normalizes customs to strings, flattens arrays, stringifies objects, and drops invalid (circular omitted)', function () {
      const circular = {};
      circular.self = circular;

      const br = [{
        bidder: 'optout',
        params: {
          adSlot: 'slot',
          publisher: '8',
          customs: { foo: 'bar', obj: { k: 'v' }, bad: circular }
        },
        bidId: '1'
      }];

      const bidderRequest = {
        ortb2: {
          ext: { data: { a: ['x', 'y'], b: 123, c: null } }
        }
      };

      const requests = spec.buildRequests(br, bidderRequest);
      const customs = requests[0].data.customs;

      expect(customs.foo).to.equal('bar');
      expect(customs.a).to.equal('x,y');
      expect(customs.b).to.equal('123');
      expect(customs.obj).to.equal(JSON.stringify({ k: 'v' }));
      expect(customs).to.not.have.property('c');
      // 'bad' was circular, so it must be dropped
      expect(customs).to.not.have.property('bad');
    });

    it('handles customs as null/undefined without throwing', function () {
      const br = [{
        bidder: 'optout',
        params: {
          adSlot: 'slot',
          publisher: '8',
          customs: null
        },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      // customs absent -> no slot.customs
      expect(requests[0].data.slots[0]).to.not.have.property('customs');
    });

    it('does not mutate input customs objects', function () {
      const original = { a: ['x', 'y'], obj: { k: 'v' } };

      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8', customs: original },
        bidId: '1'
      }];

      spec.buildRequests(br, {});
      expect(original.a).to.deep.equal(['x', 'y']);
      expect(original.obj).to.deep.equal({ k: 'v' });
    });

    it('includes per-slot customs when provided in bid params', function () {
      const br = [{
        bidder: 'optout',
        params: {
          adSlot: 'slot',
          publisher: '8',
          customs: { x: 1, arr: ['a', 'b'], obj: { p: true } }
        },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      const slotCustoms = requests[0].data.slots[0].customs;

      expect(slotCustoms.x).to.equal('1');
      expect(slotCustoms.arr).to.equal('a,b');
      expect(slotCustoms.obj).to.equal(JSON.stringify({ p: true }));
    });

    it('includes ortb2 payload when any bid sets includeOrtb2', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8', includeOrtb2: true },
        bidId: '1'
      }];

      const bidderRequest = { ortb2: { site: { domain: 'example.com' } } };
      const requests = spec.buildRequests(br, bidderRequest);

      expect(requests[0].data.ortb2).to.equal(JSON.stringify(bidderRequest.ortb2));
    });

    it('does not include ortb2 payload when includeOrtb2 is false/absent', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const bidderRequest = { ortb2: { site: { domain: 'example.com' } } };
      const requests = spec.buildRequests(br, bidderRequest);

      expect(requests[0].data).to.not.have.property('ortb2');
    });

    it('includes slot id when params.id is explicitly set', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8', id: 'customId123' },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      expect(requests[0].data.slots[0].id).to.equal('customId123');
    });

    it('handles when validBidRequests is null', function () {
      const requests = spec.buildRequests(null, {});
      expect(requests).to.deep.equal([]);
    });

    it('handles when validBidRequests is not an array', function () {
      const requests = spec.buildRequests('not-an-array', {});
      expect(requests).to.deep.equal([]);
    });

    it('handles when bidderRequest is null', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, null);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.gdpr).to.equal(0);
    });

    it('handles when gdprConsent is a non-object truthy value', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const bidderRequest = { gdprConsent: 'some-string' };
      const requests = spec.buildRequests(br, bidderRequest);
      expect(requests[0].data.gdpr).to.equal(0);
      expect(requests[0].url).to.match(/optoutadserving\.com\/prebid\/display/);
    });

    it('merges customs from ortb2.site.ext.data', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const bidderRequest = {
        ortb2: {
          site: { ext: { data: { siteKey: 'siteValue' } } }
        }
      };

      const requests = spec.buildRequests(br, bidderRequest);
      expect(requests[0].data.customs.siteKey).to.equal('siteValue');
    });

    it('merges customs from ortb2.app.ext.data', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const bidderRequest = {
        ortb2: {
          app: { ext: { data: { appKey: 'appValue' } } }
        }
      };

      const requests = spec.buildRequests(br, bidderRequest);
      expect(requests[0].data.customs.appKey).to.equal('appValue');
    });

    it('merges customs from ortb2.user.ext.data', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const bidderRequest = {
        ortb2: {
          user: { ext: { data: { userKey: 'userValue' } } }
        }
      };

      const requests = spec.buildRequests(br, bidderRequest);
      expect(requests[0].data.customs.userKey).to.equal('userValue');
    });

    it('does not include slot.customs when params.customs is empty/undefined', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      expect(requests[0].data.slots[0]).to.not.have.property('customs');
    });

    it('builds slots with lowercase adslot param', function () {
      const br = [{
        bidder: 'optout',
        params: { adslot: 'lowercase_slot', publisher: '8' },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      const slot = requests[0].data.slots[0];

      expect(slot.adSlot).to.equal('lowercase_slot');
      expect(slot.requestId).to.equal('1');
    });

    it('normalizes customs with non-object input (returns empty object)', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8', customs: 'not-an-object' },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      expect(requests[0].data.slots[0]).to.not.have.property('customs');
    });

    it('normalizes customs with undefined input', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8', customs: undefined },
        bidId: '1'
      }];

      const requests = spec.buildRequests(br, {});
      expect(requests[0].data.slots[0]).to.not.have.property('customs');
    });

    it('handles gdprConsent.consentString as empty when missing', function () {
      const br = [{
        bidder: 'optout',
        params: { adSlot: 'slot', publisher: '8' },
        bidId: '1'
      }];

      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          apiVersion: 2
        }
      };

      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(false);

      const requests = spec.buildRequests(br, bidderRequest);
      expect(requests[0].data.consent).to.equal('');
    });
  });

  describe('buildRequests (GDPR Purpose 1)', function () {
    const bidRequests = [
      { bidder: 'optout', params: { adSlot: 'slot', publisher: '8' }, bidId: '1' }
    ];

    it('routes to optin when purpose1 consent is true', function () {
      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(true);

      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CONSENT',
          apiVersion: 2
        }
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.match(/optinadserving\.com\/prebid\/display/);
      expect(requests[0].data.gdpr).to.equal(1);
    });

    it('routes to optout when purpose1 consent is false', function () {
      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(false);

      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CONSENT',
          apiVersion: 2
        }
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.match(/optoutadserving\.com\/prebid\/display/);
      expect(requests[0].data.gdpr).to.equal(1);
    });
  });

  describe('interpretResponse', function () {
    // Helper to create standard bidRequest structure
    const createBidRequest = (slots) => ({ data: { slots } });

    // Helper to create standard serverResponse structure
    const createServerResponse = (bids) => ({ body: { bids } });

    // Standard slot and bid for reuse
    const standardSlot = { id: 'slotA', requestId: 'bidA' };
    const standardBid = { requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>' };

    it('maps bids correctly using slot id or requestId', function () {
      const bidRequest = createBidRequest([
        { id: 'slotA', requestId: 'bidA' },
        { id: 'slotB', requestId: 'bidB' }
      ]);

      const serverResponse = createServerResponse([
        { requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>', ttl: 300, creativeId: 'c1' },
        { requestId: 'slotB', cpm: 2, currency: 'EUR', width: 728, height: 90, ad: '<div/>', ttl: 300, creativeId: 'c2' }
      ]);

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(2);
      expect(out[0].netRevenue).to.equal(true);
    });

    it('filters bids whose requestId does not map to a sent slot/requestId', function () {
      const bidRequest = createBidRequest([standardSlot]);
      const serverResponse = createServerResponse([
        { requestId: 'unknown', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>', ttl: 300, creativeId: 'c1' }
      ]);

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('supports serverResponse.body as an array (defensive parsing)', function () {
      // This also verifies numeric coercion is robust if server returns strings.
      const bidRequest = createBidRequest([standardSlot]);
      const serverResponse = {
        body: [{ requestId: 'bidA', cpm: '1.2', currency: 'EUR', width: '300', height: '250', ad: '<div/>', ttl: '120', creativeId: 'c1' }]
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(1);
      expect(out[0].cpm).to.equal(1.2);
      expect(out[0].ttl).to.equal(120);
    });

    it('drops bids with missing/invalid requestId', function () {
      const bidRequest = createBidRequest([standardSlot]);
      const serverResponse = createServerResponse([
        { requestId: null, cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>' },
        { /* missing requestId */ cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>' }
      ]);

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops incomplete bids missing required fields', function () {
      const bidRequest = createBidRequest([standardSlot]);
      const serverResponse = createServerResponse([
        { requestId: 'bidA', cpm: 1, /* currency missing */ width: 300, height: 250, ad: '<div/>' },
        { requestId: 'bidA', cpm: 1, currency: 'EUR', /* width missing */ height: 250, ad: '<div/>' },
        { requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, /* height missing */ ad: '<div/>' },
        { requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 250 /* ad missing */ }
      ]);

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with cpm = 0', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 0, currency: 'EUR', width: 300, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with negative cpm', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: -1, currency: 'EUR', width: 300, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with NaN cpm', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: NaN, currency: 'EUR', width: 300, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with cpm = null', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: null, currency: 'EUR', width: 300, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with width = 0', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: 0, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with negative width', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: -300, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with non-finite width', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: Infinity, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with height = 0', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 0, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with negative height', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: -250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('drops bids with non-finite height', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: Infinity, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('defaults ttl to 300 when missing', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>', creativeId: 'c1' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out[0].ttl).to.equal(300);
    });

    it('passes through optOutExt and meta when present', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{
            requestId: 'bidA',
            cpm: 1,
            currency: 'EUR',
            width: 300,
            height: 250,
            ad: '<div/>',
            ttl: 300,
            creativeId: 'c1',
            optOutExt: { foo: 'bar' },
            meta: { advertiserDomains: ['example.com'] }
          }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out[0].optOutExt).to.deep.equal({ foo: 'bar' });
      expect(out[0].meta).to.deep.equal({ advertiserDomains: ['example.com'] });
    });

    it('uses requestId as creativeId fallback when creativeId is missing', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const serverResponse = {
        body: {
          bids: [{
            requestId: 'bidA',
            cpm: 1,
            currency: 'EUR',
            width: 300,
            height: 250,
            ad: '<div/>',
            ttl: 300
            // creativeId intentionally missing
          }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(1);
      expect(out[0].creativeId).to.equal('bidA'); // falls back to requestId
    });

    it('handles when serverResponse is null', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const out = spec.interpretResponse(null, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('handles when serverResponse is undefined', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const out = spec.interpretResponse(undefined, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('handles when serverResponse.body is null', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const out = spec.interpretResponse({ body: null }, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('handles when serverResponse.body is undefined', function () {
      const bidRequest = {
        data: { slots: [{ id: 'slotA', requestId: 'bidA' }] }
      };

      const out = spec.interpretResponse({ body: undefined }, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('handles when bidRequest.data.slots is missing', function () {
      const bidRequest = { data: {} };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('returns [] when gdprConsent missing', function () {
      const out = spec.getUserSyncs({ iframeEnabled: true }, [], null);
      expect(out).to.deep.equal([]);
    });

    it('returns [] when gdprConsent is a non-object truthy value', function () {
      const out = spec.getUserSyncs({ iframeEnabled: true }, [], 'CONSENTSTRING');
      expect(out).to.deep.equal([]);
    });

    it('returns [] when iframeEnabled is false', function () {
      const out = spec.getUserSyncs(
        { iframeEnabled: false },
        [],
        { gdprApplies: false, consentString: 'abc' }
      );
      expect(out).to.deep.equal([]);
    });

    it('returns iframe sync when iframeEnabled and gdprApplies is false', function () {
      const out = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: false, consentString: 'abc' }
      );

      expect(out).to.have.lengthOf(1);
      expect(out[0].type).to.equal('iframe');
      expect(out[0].url).to.include('gdpr=0');
      expect(out[0].url).to.include('gdpr_consent=' + encodeURIComponent('abc'));
    });

    it('returns iframe sync when gdprApplies true and purpose1 consent true', function () {
      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(true);

      const out = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT' }
      );

      expect(out).to.have.lengthOf(1);
      expect(out[0].type).to.equal('iframe');
      expect(out[0].url).to.include('gdpr=1');
      expect(out[0].url).to.include('gdpr_consent=' + encodeURIComponent('CONSENT'));
    });

    it('returns [] when gdprApplies true and purpose1 consent false', function () {
      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(false);

      const out = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT' }
      );

      expect(out).to.deep.equal([]);
    });

    it('handles missing consentString gracefully', function () {
      sinon.stub(gdprUtils, 'hasPurpose1Consent').returns(true);

      const out = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true }
      );

      expect(out).to.have.lengthOf(1);
      expect(out[0].url).to.include('gdpr_consent=');
    });

    it('handles empty consentString', function () {
      const out = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: false, consentString: '' }
      );

      expect(out).to.have.lengthOf(1);
      expect(out[0].url).to.include('gdpr_consent=');
    });

    it('handles gdprApplies as non-boolean (converts to 0)', function () {
      const out = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: 'not-a-boolean', consentString: 'abc' }
      );

      expect(out).to.have.lengthOf(1);
      expect(out[0].url).to.include('gdpr=0');
    });
  });
});
