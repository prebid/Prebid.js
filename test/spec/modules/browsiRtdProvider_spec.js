import * as browsiRTD from '../../../modules/browsiRtdProvider.js';
import {makeSlot} from '../integration/faker/googletag.js';
import * as utils from '../../../src/utils'
import * as events from '../../../src/events';
import * as sinon from 'sinon';
import {sendPageviewEvent} from '../../../modules/browsiRtdProvider.js';

describe('browsi Real time  data sub module', function () {
  const conf = {
    'auctionDelay': 250,
    dataProviders: [{
      'name': 'browsi',
      'params': {
        'url': 'testUrl.com',
        'siteKey': 'testKey',
        'pubKey': 'testPub',
        'keyName': 'bv'
      }
    }]
  };
  const auction = {adUnits: [
    {
      code: 'adMock',
      transactionId: 1
    },
    {
      code: 'hasPrediction',
      transactionId: 1
    }
  ]};

  let sandbox;
  let eventsEmitSpy;

  before(() => {
    sandbox = sinon.sandbox.create();
    eventsEmitSpy = sandbox.spy(events, ['emit']);
  });

  after(() => {
    sandbox.restore();
  });

  it('should init and return true', function () {
    browsiRTD.collectData();
    expect(browsiRTD.browsiSubmodule.init(conf.dataProviders[0])).to.equal(true)
  });

  it('should create browsi script', function () {
    const script = browsiRTD.addBrowsiTag('scriptUrl.com');
    expect(script.getAttribute('data-sitekey')).to.equal('testKey');
    expect(script.getAttribute('data-pubkey')).to.equal('testPub');
    expect(script.async).to.equal(true);
    expect(script.prebidData.kn).to.equal(conf.dataProviders[0].params.keyName);
  });

  it('should match placement with ad unit', function () {
    const slot = makeSlot({code: '/123/abc', divId: 'browsiAd_1'});

    const test1 = browsiRTD.isIdMatchingAdUnit(slot, ['/123/abc']); // true
    const test2 = browsiRTD.isIdMatchingAdUnit(slot, ['/123/abc', '/456/def']); // true
    const test3 = browsiRTD.isIdMatchingAdUnit(slot, ['/123/def']); // false
    const test4 = browsiRTD.isIdMatchingAdUnit(slot, []); // true

    expect(test1).to.equal(true);
    expect(test2).to.equal(true);
    expect(test3).to.equal(false);
    expect(test4).to.equal(true);
  });

  it('should return correct macro values', function () {
    const slot = makeSlot({code: '/123/abc', divId: 'browsiAd_1'});

    slot.setTargeting('test', ['test', 'value']);
    // slot getTargeting doesn't act like GPT so we can't expect real value
    const macroResult = browsiRTD.getMacroId({p: '<AD_UNIT>/<KEY_test>'}, slot);
    expect(macroResult).to.equal('/123/abc/NA');

    const macroResultB = browsiRTD.getMacroId({}, slot);
    expect(macroResultB).to.equal('browsiAd_1');

    const macroResultC = browsiRTD.getMacroId({p: '<AD_UNIT>', s: {s: 0, e: 1}}, slot);
    expect(macroResultC).to.equal('/');
  });

  describe('should return data to RTD module', function () {
    it('should return empty if no ad units defined', function () {
      browsiRTD.setData({});
      expect(browsiRTD.browsiSubmodule.getTargetingData([], null, null, auction)).to.eql({});
    });

    it('should return NA if no prediction for ad unit', function () {
      makeSlot({code: 'adMock', divId: 'browsiAd_2'});
      browsiRTD.setData({});
      expect(browsiRTD.browsiSubmodule.getTargetingData(['adMock'], null, null, auction)).to.eql({adMock: {bv: 'NA'}});
    });

    it('should return prediction from server', function () {
      makeSlot({code: 'hasPrediction', divId: 'hasPrediction'});
      const data = {
        p: {'hasPrediction': {ps: {0: 0.234}}},
        kn: 'bv',
        pmd: undefined
      };
      browsiRTD.setData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['hasPrediction'], null, null, auction)).to.eql({hasPrediction: {bv: '0.20'}});
    })
  })

  describe('should return matching prediction', function () {
    const predictions = {
      0: 0.123,
      1: 0.254,
      3: 0,
      4: 0.8
    }
    const singlePrediction = {
      0: 0.123
    }
    it('should return raw value if valid', function () {
      expect(browsiRTD.getCurrentData(predictions, 0)).to.equal(0.123);
      expect(browsiRTD.getCurrentData(predictions, 1)).to.equal(0.254);
    })
    it('should return 0 for prediction = 0', function () {
      expect(browsiRTD.getCurrentData(predictions, 3)).to.equal(0);
    })
    it('should return -1 for invalid params', function () {
      expect(browsiRTD.getCurrentData(null, 3)).to.equal(-1);
      expect(browsiRTD.getCurrentData(predictions, null)).to.equal(-1);
    })
    it('should return prediction according to object keys length ', function () {
      expect(browsiRTD.getCurrentData(singlePrediction, 0)).to.equal(0.123);
      expect(browsiRTD.getCurrentData(singlePrediction, 1)).to.equal(-1);
      expect(browsiRTD.getCurrentData(singlePrediction, 2)).to.equal(-1);
      expect(browsiRTD.getCurrentData(predictions, 4)).to.equal(0.8);
      expect(browsiRTD.getCurrentData(predictions, 5)).to.equal(0.8);
      expect(browsiRTD.getCurrentData(predictions, 8)).to.equal(0.8);
    })
  })
  describe('should set bid request data', function () {
    const data = {
      p: {
        'adUnit1': {ps: {0: 0.234}},
        'adUnit2': {ps: {0: 0.134}}},
      kn: 'bv',
      pmd: undefined
    };
    browsiRTD.setData(data);
    const fakeAdUnits = [
      {
        code: 'adUnit1'
      },
      {
        code: 'adUnit2'
      }
    ]
    browsiRTD.browsiSubmodule.getBidRequestData({adUnits: fakeAdUnits}, () => {}, {}, null);
    it('should set ad unit params with prediction values', function () {
      expect(utils.deepAccess(fakeAdUnits[0], 'ortb2Imp.ext.data.browsi')).to.eql({bv: '0.20'});
      expect(utils.deepAccess(fakeAdUnits[1], 'ortb2Imp.ext.data.browsi')).to.eql({bv: '0.10'});
    })
  })

  describe('should emit ad request billable event', function () {
    before(() => {
      const data = {
        p: {
          'adUnit1': {ps: {0: 0.234}},
          'adUnit2': {ps: {0: 0.134}}},
        kn: 'bv',
        pmd: undefined,
        bet: 'AD_REQUEST'
      };
      browsiRTD.setData(data);
    })

    beforeEach(() => {
      eventsEmitSpy.resetHistory();
    })
    it('should send one event per ad unit code', function () {
      const auction = {adUnits: [
        {
          code: 'a',
          transactionId: 1
        },
        {
          code: 'b',
          transactionId: 2
        },
        {
          code: 'a',
          transactionId: 3
        },
      ]};

      browsiRTD.browsiSubmodule.getTargetingData(['a', 'b'], null, null, auction);
      expect(eventsEmitSpy.callCount).to.equal(2);
    })
    it('should send events only for received ad unit codes', function () {
      const auction = {adUnits: [
        {
          code: 'a',
          transactionId: 1
        },
        {
          code: 'b',
          transactionId: 2
        },
        {
          code: 'c',
          transactionId: 3
        },
      ]};

      browsiRTD.browsiSubmodule.getTargetingData(['a'], null, null, auction);
      expect(eventsEmitSpy.callCount).to.equal(1);
      browsiRTD.browsiSubmodule.getTargetingData(['b'], null, null, auction);
      expect(eventsEmitSpy.callCount).to.equal(2);
    })
    it('should use 1st transaction ID in case of twin ad unit codes', function () {
      const auction = {
        auctionId: '123',
        adUnits: [
          {
            code: 'a',
            transactionId: 1
          },
          {
            code: 'a',
            transactionId: 3
          },
        ]};

      const expectedCall = {
        vendor: 'browsi',
        type: 'adRequest',
        transactionId: 1,
        auctionId: '123'
      }

      browsiRTD.browsiSubmodule.getTargetingData(['a'], null, null, auction);
      const callArguments = eventsEmitSpy.getCalls()[0].args[1];
      // billing id is random, we can't check its value
      delete callArguments['billingId'];
      expect(callArguments).to.eql(expectedCall);
    })
  })

  describe('should emit pageveiw billable event', function () {
    beforeEach(() => {
      eventsEmitSpy.resetHistory();
    })
    it('should send event if type is correct', function () {
      sendPageviewEvent('PAGEVIEW')

      const expectedCall = {
        vendor: 'browsi',
        type: 'pageview',
      }

      expect(eventsEmitSpy.callCount).to.equal(1);
      const callArguments = eventsEmitSpy.getCalls()[0].args[1];
      // billing id is random, we can't check its value
      delete callArguments['billingId'];
      expect(callArguments).to.eql(expectedCall);
    })
    it('should not send event if type is incorrect', function () {
      sendPageviewEvent('AD_REQUEST');
      sendPageviewEvent('INACTIVE');
      sendPageviewEvent(undefined);
      expect(eventsEmitSpy.callCount).to.equal(0);
    })
  })
});
