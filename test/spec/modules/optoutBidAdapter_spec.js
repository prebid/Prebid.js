import { expect } from 'chai';
import sinon from 'sinon';
import { config } from 'src/config.js';
import * as gdprUtils from 'src/utils/gdpr.js';
import { spec } from 'modules/optoutBidAdapter.js';

describe('optoutAdapterTest (new adapter)', function () {
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

    it('uses refererInfo.canonicalUrl when present', function () {
      const bidderRequest = { refererInfo: { canonicalUrl: 'https://example.com/canonical' } };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.url).to.equal('https://example.com/canonical');
    });

    it('falls back to refererInfo.page when canonicalUrl missing', function () {
      const bidderRequest = { refererInfo: { page: 'https://example.com/page' } };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.url).to.equal('https://example.com/page');
    });

    it('falls back to window.location.href when refererInfo missing', function () {
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.url).to.equal(window.location.href);
    });

    it('normalizes customs to strings, flattens arrays, stringifies objects, and drops invalid', function () {
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
      expect(customs).to.not.have.property('bad');
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
    it('maps bids correctly using slot id or requestId', function () {
      const bidRequest = {
        data: {
          slots: [
            { id: 'slotA', requestId: 'bidA' },
            { id: 'slotB', requestId: 'bidB' }
          ]
        }
      };

      const serverResponse = {
        body: {
          bids: [
            { requestId: 'bidA', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>', ttl: 300, creativeId: 'c1' },
            { requestId: 'slotB', cpm: 2, currency: 'EUR', width: 728, height: 90, ad: '<div/>', ttl: 300, creativeId: 'c2' }
          ]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(2);
      expect(out[0].netRevenue).to.equal(true);
    });

    it('filters bids whose requestId does not map to a sent slot/requestId', function () {
      const bidRequest = {
        data: {
          slots: [{ id: 'slotA', requestId: 'bidA' }]
        }
      };

      const serverResponse = {
        body: {
          bids: [{ requestId: 'unknown', cpm: 1, currency: 'EUR', width: 300, height: 250, ad: '<div/>', ttl: 300, creativeId: 'c1' }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.deep.equal([]);
    });

    it('supports serverResponse.body as an array (fallback behavior)', function () {
      const bidRequest = {
        data: {
          slots: [{ id: 'slotA', requestId: 'bidA' }]
        }
      };

      const serverResponse = {
        body: [{ requestId: 'bidA', cpm: '1.2', currency: 'EUR', width: '300', height: '250', ad: '<div/>', ttl: '120', creativeId: 'c1' }]
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(1);
      expect(out[0].cpm).to.equal(1.2);
      expect(out[0].ttl).to.equal(120);
    });
  });

  describe('getUserSyncs', function () {
    it('returns [] when gdprConsent missing', function () {
      const out = spec.getUserSyncs({ iframeEnabled: true }, [], null);
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
  });
});

