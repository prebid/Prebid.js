import { pbjsTestOnly } from 'test/helpers/pbjs-test-only.js';

describe('Publisher API _ Alias Bidder', function () {
  let assert = require('chai').assert;
  let expect = require('chai').expect;
  let should = require('chai').should();
  let prebid = require('../../src/prebid');

  before(function () {
    let topSlotCode = '/19968336/header-bid-tag1';
    let topSlotSizes = [[728, 90], [970, 90]];
    let adUnit = {
      code: topSlotCode,
      sizes: topSlotSizes,
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: '5215561'
          }
        }
      ]
    };

    $$PREBID_GLOBAL$$.addAdUnits(adUnit);
  });

  after(function () {
    pbjsTestOnly.clearAllAdUnits();
  });

  describe('set Alias Bidder', function () {
    it('should have both of target bidder and alias bidder', function () {
      $$PREBID_GLOBAL$$.aliasBidder('appnexus', 'bRealTime1');
    });
  });
});
