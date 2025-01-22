import { expect } from 'chai';

import {convertAnParams} from '../../../modules/anPspParamsConverter';
import { config } from '../../../src/config.js';
import { deepClone } from '../../../src/utils';
import adapterManager from '../../../src/adapterManager.js';

describe('anPspParamsConverter', function () {
  let configStub;
  let resolveAliasStub;
  let didHookRun = false;

  const bidderRequests = [{
    bidderCode: 'appnexus',
    bids: [{
      bidder: 'appnexus',
      src: 's2s',
      params: {
        member: 958,
        invCode: 12345,
        placementId: '10001',
        keywords: {
          music: 'rock',
          genre: ['80s', '90s']
        },
        publisherId: '111',
        use_payment_rule: true
      }
    }]
  }];

  beforeEach(function () {
    configStub = sinon.stub(config, 'getConfig');
    resolveAliasStub = sinon.stub(adapterManager, 'resolveAlias').callsFake(function (tarBidder) {
      return (tarBidder === 'rubicon') ? 'rubicon' : 'appnexus';
    });
  });

  afterEach(function () {
    didHookRun = false;
    configStub.restore();
    resolveAliasStub.restore();
  });

  it('does not modify params when appnexus is not in s2sconfig', function () {
    configStub.callsFake(function () {
      return {
        bidders: ['rubicon']
      };
    });

    const testBidderRequests = deepClone(bidderRequests);

    convertAnParams(function () {
      didHookRun = true;
    }, testBidderRequests);

    expect(didHookRun).to.equal(true);
    const resultParams = testBidderRequests[0].bids[0].params;
    expect(resultParams.member).to.equal(958);
    expect(resultParams.invCode).to.equal(12345);
    expect(resultParams.placementId).to.equal('10001');
    expect(resultParams.keywords).to.deep.equal({
      music: 'rock',
      genre: ['80s', '90s']
    });
    expect(resultParams.publisherId).to.equal('111');
    expect(resultParams.use_payment_rule).to.equal(true);
  });

  const tests = [{
    testName: 'modifies params when appnexus is the bidder',
    fakeConfigFn: function () {
      return {
        bidders: ['appnexus']
      };
    },
    applyBidderRequestChanges: function () {
      const testBidderRequests = deepClone(bidderRequests);

      return testBidderRequests;
    }
  }, {
    testName: 'modifies params when a registered appnexus alias is used',
    fakeConfigFn: function () {
      return {
        bidders: ['beintoo']
      };
    },
    applyBidderRequestChanges: function () {
      const testBidderRequests = deepClone(bidderRequests);
      testBidderRequests.bidderCode = 'beintoo';
      testBidderRequests[0].bids[0].bidder = 'beintoo';

      return testBidderRequests;
    }
  }, {
    testName: 'modifies params when pbjs.aliasBidder alias is used',
    fakeConfigFn: function () {
      return {
        bidders: ['aliasBidderTest'],
      };
    },
    applyBidderRequestChanges: function () {
      const testBidderRequests = deepClone(bidderRequests);
      testBidderRequests.bidderCode = 'aliasBidderTest';
      testBidderRequests[0].bids[0].bidder = 'aliasBidderTest';

      return testBidderRequests;
    }
  }];

  tests.forEach((testCfg) => {
    it(testCfg.testName, function () {
      configStub.callsFake(testCfg.fakeConfigFn);

      const testBidderRequests = testCfg.applyBidderRequestChanges();

      convertAnParams(function () {
        didHookRun = true;
      }, testBidderRequests);

      expect(didHookRun).to.equal(true);
      const resultParams = testBidderRequests[0].bids[0].params;
      expect(resultParams.member).to.equal('958');
      expect(resultParams.inv_code).to.equal('12345');
      expect(resultParams.placement_id).to.equal(10001);
      expect(resultParams.keywords).to.equal('music=rock,genre=80s,genre=90s');
      expect(resultParams.publisher_id).to.equal(111);
      expect(resultParams.use_pmt_rule).to.equal(true);
    });
  });
});
