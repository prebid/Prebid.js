import * as bidViewability from 'modules/bidViewability.js';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import * as sinon from 'sinon';
import {expect} from 'chai';

const GPT_SLOT = {
  getAdUnitPath() {
    return '/harshad/Jan/2021/';
  },

  getSlotElementId() {
    return 'DIV-1';
  }
};

const PBJS_WINNING_BID = {
  'adUnitCode': '/harshad/Jan/2021/',
  'bidderCode': 'pubmatic',
  'width': 300,
  'height': 250,
  'statusMessage': 'Bid available',
  'adId': 'id',
  'requestId': 1024,
  'source': 'client',
  'no_bid': false,
  'cpm': '1.1495',
  'ttl': 180,
  'creativeId': 'id',
  'netRevenue': true,
  'currency': 'USD'
};

describe('#bidViewability', function() {
  let gptSlot;
  let pbjsWinningBid;

  beforeEach(function() {
    gptSlot = Object.assign({}, GPT_SLOT);
    pbjsWinningBid = Object.assign({}, PBJS_WINNING_BID);
  });

  describe('isBidAdUnitCodeMatchingSlot', function() {
    it('match found by GPT Slot getAdUnitPath', function() {
      expect(bidViewability.isBidAdUnitCodeMatchingSlot(pbjsWinningBid, gptSlot)).to.equal(true);
    });

    it('match found by GPT Slot getSlotElementId', function() {
      pbjsWinningBid.adUnitCode = 'DIV-1';
      expect(bidViewability.isBidAdUnitCodeMatchingSlot(pbjsWinningBid, gptSlot)).to.equal(true);
    });

    it('match not found', function() {
      pbjsWinningBid.adUnitCode = 'DIV-10';
      expect(bidViewability.isBidAdUnitCodeMatchingSlot(pbjsWinningBid, gptSlot)).to.equal(false);
    });
  });
});
