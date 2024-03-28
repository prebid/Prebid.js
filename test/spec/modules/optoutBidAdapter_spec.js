import { expect } from 'chai';
import { spec } from 'modules/optoutBidAdapter.js';
import {config} from 'src/config.js';

describe('optoutAdapterTest', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with adslot param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: {
          'adslot': 'prebid_demo',
          'publisher': '8'
        }
      })).to.equal(true);
    });

    it('bidRequest with no adslot param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: {
          'publisher': '8'
        }
      })).to.equal(false);
    });

    it('bidRequest with no publisher param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: {
          'adslot': 'prebid_demo'
        }
      })).to.equal(false);
    });

    it('bidRequest without params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optout',
        params: { }
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const bidRequests = [{
      'bidder': 'optout',
      'params': {
        'adslot': 'prebid_demo',
        'publisher': '8'
      },
      'adUnitCode': 'aaa',
      'transactionId': '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      'bidId': '9304jr394ddfj',
      'bidderRequestId': '70deaff71c281d',
      'auctionId': '5c66da22-426a-4bac-b153-77360bef5337'
    },
    {
      'bidder': 'optout',
      'params': {
        'adslot': 'testslot2',
        'publisher': '2'
      },
      'adUnitCode': 'bbb',
      'transactionId': '193995b4-7122-4739-959b-2463282a138b',
      'bidId': '893j4f94e8jei',
      'bidderRequestId': '70deaff71c281d',
      'gdprConsent': {
        consentString: '',
        gdprApplies: true,
        apiVersion: 2
      },
      'auctionId': 'e97cafd0-ebfc-4f5c-b7c9-baa0fd335a4a'
    }];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });

    it('bidRequest url without consent', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.url).to.match(new RegExp('adscience-nocookie\\.nl/prebid/display'));
      });
    });

    it('bidRequest id', function () {
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.requestId).to.equal('9304jr394ddfj');
      expect(requests[1].data.requestId).to.equal('893j4f94e8jei');
    });

    it('bidRequest with config for currency', function () {
      config.setConfig({
        currency: {
       	    adServerCurrency: 'USD',
          granularityMultiplier: 1
        }
      })

      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.cur.adServerCurrency).to.equal('USD');
      expect(requests[1].data.cur.adServerCurrency).to.equal('USD');
    });

    it('bidRequest without config for currency', function () {
      config.resetConfig();

      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].data.cur.adServerCurrency).to.equal('EUR');
      expect(requests[1].data.cur.adServerCurrency).to.equal('EUR');
    });
  });
});
