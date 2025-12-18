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

    it('normalizes customs to strings and flattens arrays', function () {
      const br = [{
        bidder: 'optout',
        params: {
          adSlot: 'slot',
          publisher: '8',
          customs: { foo: 'bar' }
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
      expect(customs).to.not.have.property('c');
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
  });
});
