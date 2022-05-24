describe('Publisher API _ AdUnits', function () {
  var assert = require('chai').assert;
  var expect = require('chai').expect;
  var pbjsTestOnly = require('../helpers/pbjs-test-only').pbjsTestOnly;

  before(function () {
    var adUnits = [{
      code: '/1996833/slot-1',
      sizes: [[300, 250], [728, 90]],
      bids: [
        {
          bidder: 'openx',
          params: {
            pgid: '2342353',
            unit: '234234',
            jstag_url: 'http://'
          }
        }, {
          bidder: 'appnexus',
          params: {
            placementId: '234235'
          }
        }
      ]
    }, {
      fpd: {
        context: {
          pbAdSlot: 'adSlotTest',
          data: {
            inventory: [4],
            keywords: 'foo,bar',
            visitor: [1, 2, 3],
          }
        }
      },
      code: '/1996833/slot-2',
      sizes: [[468, 60]],
      bids: [
        {
          bidder: 'rubicon',
          params: {
            rp_account: '4934',
            rp_site: '13945',
            rp_zonesize: '23948-15'
          }
        }, {
          bidder: 'appnexus',
          params: {
            placementId: '827326'
          }
        }
      ]
    }];
    pbjsTestOnly.clearAllAdUnits();
    $$PREBID_GLOBAL$$.addAdUnits(adUnits);
  });

  after(function () {
    pbjsTestOnly.clearAllAdUnits();
  });

  describe('addAdUnits', function () {
    var adUnits, adUnit1, bids1, adUnit2, bids2;

    it('should have two adUnits', function () {
      adUnits = pbjsTestOnly.getAdUnits();
      adUnit1 = adUnits[0];
      bids1 = adUnit1.bids;
      adUnit2 = adUnits[1];
      bids2 = adUnit2.bids;
    });

    it('the first adUnits value should be same with the adUnits that is added by $$PREBID_GLOBAL$$.addAdUnits();', function () {
      assert.strictEqual(adUnit1.code, '/1996833/slot-1', 'adUnit1 code');
      assert.deepEqual(adUnit1.sizes, [[300, 250], [728, 90]], 'adUnit1 sizes');
      assert.strictEqual(bids1[0].bidder, 'openx', 'adUnit1 bids1 bidder');
      assert.strictEqual(bids1[0].params.pgid, '2342353', 'adUnit1 bids1 params.pgid');
      assert.strictEqual(bids1[0].params.unit, '234234', 'adUnit1 bids1 params.unit');
      assert.strictEqual(bids1[0].params.jstag_url, 'http://', 'adUnit1 bids1 params.jstag_url');

      assert.strictEqual(bids1[1].bidder, 'appnexus', 'adUnit1 bids2 bidder');
      assert.strictEqual(bids1[1].params.placementId, '234235', 'adUnit1 bids2 params.placementId');

      assert.strictEqual(adUnit2.code, '/1996833/slot-2', 'adUnit2 code');
      assert.deepEqual(adUnit2.sizes, [[468, 60]], 'adUnit2 sizes');
      assert.strictEqual(bids2[0].bidder, 'rubicon', 'adUnit2 bids1 bidder');
      assert.strictEqual(bids2[0].params.rp_account, '4934', 'adUnit2 bids1 params.rp_account');
      assert.strictEqual(bids2[0].params.rp_zonesize, '23948-15', 'adUnit2 bids1 params.rp_zonesize');
      assert.strictEqual(bids2[0].params.rp_site, '13945', 'adUnit2 bids1 params.rp_site');

      assert.strictEqual(bids2[1].bidder, 'appnexus', 'adUnit2 bids2 bidder');
      assert.strictEqual(bids2[1].params.placementId, '827326', 'adUnit2 bids2 params.placementId');
    });

    it('the second adUnits value should be same with the adUnits that is added by $$PREBID_GLOBAL$$.addAdUnits();', function () {
      assert.strictEqual(adUnit2.code, '/1996833/slot-2', 'adUnit2 code');
      assert.deepEqual(adUnit2.sizes, [[468, 60]], 'adUnit2 sizes');
      assert.deepEqual(adUnit2['ortb2Imp'], {'ext': {'data': {'pbadslot': 'adSlotTest', 'inventory': [4], 'keywords': 'foo,bar', 'visitor': [1, 2, 3]}}}, 'adUnit2 ortb2Imp');
      assert.strictEqual(bids2[0].bidder, 'rubicon', 'adUnit2 bids1 bidder');
      assert.strictEqual(bids2[0].params.rp_account, '4934', 'adUnit2 bids1 params.rp_account');
      assert.strictEqual(bids2[0].params.rp_zonesize, '23948-15', 'adUnit2 bids1 params.rp_zonesize');
      assert.strictEqual(bids2[0].params.rp_site, '13945', 'adUnit2 bids1 params.rp_site');

      assert.strictEqual(bids2[1].bidder, 'appnexus', 'adUnit2 bids2 bidder');
      assert.strictEqual(bids2[1].params.placementId, '827326', 'adUnit2 bids2 params.placementId');
    });
  });

  describe('removeAdUnit', function () {
    var adUnits, adUnit2, bids2;

    it('the first adUnit should be not existed', function () {
      $$PREBID_GLOBAL$$.removeAdUnit('/1996833/slot-1');
      adUnits = pbjsTestOnly.getAdUnits();
      adUnit2 = adUnits[0];
      bids2 = adUnit2.bids;
      expect(adUnits[1]).not.exist;
    });

    it('the second adUnit should be still existed', function () {
      assert.strictEqual(adUnit2.code, '/1996833/slot-2', 'adUnit2 code');
      assert.deepEqual(adUnit2.sizes, [[468, 60]], 'adUnit2 sizes');
      assert.strictEqual(bids2[0].bidder, 'rubicon', 'adUnit2 bids1 bidder');
      assert.strictEqual(bids2[0].params.rp_account, '4934', 'adUnit2 bids1 params.rp_account');
      assert.strictEqual(bids2[0].params.rp_zonesize, '23948-15', 'adUnit2 bids1 params.rp_zonesize');
      assert.strictEqual(bids2[0].params.rp_site, '13945', 'adUnit2 bids1 params.rp_site');

      assert.strictEqual(bids2[1].bidder, 'appnexus', 'adUnit2 bids2 bidder');
      assert.strictEqual(bids2[1].params.placementId, '827326', 'adUnit2 bids2 params.placementId');
    });
  });
});
