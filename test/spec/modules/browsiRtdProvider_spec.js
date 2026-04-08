import * as browsiRTD from '../../../modules/browsiRtdProvider.js';
import * as browsiUtils from '../../../libraries/browsiUtils/browsiUtils.js';
import * as utils from '../../../src/utils.js'
import * as events from '../../../src/events.js';
import * as sinon from 'sinon';
import * as mockGpt from 'test/spec/integration/faker/googletag.js';
import * as Global from '../../../src/prebidGlobal.js';

describe('browsi Real time data sub module', function () {
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
  const auction = {
    adUnits: [
      {
        code: 'adMock',
        transactionId: 1
      },
      {
        code: 'hasPrediction',
        transactionId: 1
      }
    ]
  };
  const msPerDay = 24 * 60 * 60 * 1000;

  let sandbox;
  let eventsEmitSpy;
  let timestampStub;

  before(() => {
    sandbox = sinon.createSandbox();
    eventsEmitSpy = sandbox.spy(events, ['emit']);
    timestampStub = sandbox.stub(utils, 'timestamp');
    sandbox.stub(Global, 'getGlobal').callsFake(() => {
      return {
        enableAnalytics: () => { },
      }
    });
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

  it('should return correct macro values', function () {
    const slot = mockGpt.makeSlot({ code: '/123/abc', divId: 'browsiAd_1' });

    slot.setTargeting('test', ['test', 'value']);
    // slot getTargeting doesn't act like GPT so we can't expect real value
    const macroResult = browsiUtils.getMacroId({ p: '<AD_UNIT>/<KEY_test>' }, slot);
    expect(macroResult).to.equal('/123/abc/NA');

    const macroResultB = browsiUtils.getMacroId({}, slot);
    expect(macroResultB).to.equal('browsiAd_1');

    const macroResultC = browsiUtils.getMacroId({ p: '<AD_UNIT>', s: { s: 0, e: 1 } }, slot);
    expect(macroResultC).to.equal('/');
  });

  describe('should return data to RTD module', function () {
    it('should return empty if no ad units defined', function () {
      browsiRTD.setBrowsiData({});
      expect(browsiRTD.browsiSubmodule.getTargetingData([], null, null, auction)).to.eql({});
    });
    it('should return empty if GAM is not defined', function () {
      mockGpt.makeSlot({ code: 'slot1', divId: 'slot1' });
      const data = {
        plc: { 'slot1': { viewability: { 0: 0.234 } } },
        pmd: undefined,
        sg: false
      };
      browsiRTD.setBrowsiData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['slotId'], null, null, auction)).to.eql({});
    });
    it('should return empty if viewability key is not defined', function () {
      mockGpt.makeSlot({ code: 'slot2', divId: 'slot2' });
      const data = {
        plc: { 'slot2': { someKey: { 0: 0.234 } } },
        pmd: undefined,
        sg: true
      };
      browsiRTD.setBrowsiData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['slot2'], null, null, auction)).to.eql({ 'slot2': {} });
    });
    it('should return all predictions from server', function () {
      mockGpt.makeSlot({ code: 'slot3', divId: 'slot3' });
      const data = {
        pg: { scrollDepth: 0.456 },
        plc: { 'slot3': { viewability: { 0: 0.234 }, revenue: { 0: 0.567 } } },
        pmd: undefined,
        sg: true
      };
      browsiRTD.setBrowsiData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['slot3'], null, null, auction)).to.eql({
        'slot3': { bv: '0.20', browsiRevenue: 'medium', browsiScroll: '0.40' }
      });
    });
    it('should return the available prediction', function () {
      mockGpt.makeSlot({ code: 'slot4', divId: 'slot4' });
      const data = {
        pg: { scrollDepth: 0.456 },
        plc: { 'slot4': { someKey: { 0: 0.234 } } },
        pmd: undefined,
        sg: true
      };
      browsiRTD.setBrowsiData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['slot4'], null, null, auction)).to.eql({ 'slot4': { browsiScroll: '0.40' } });
    });
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
    const numbericPrediction = 0.456;
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
    it('should return prediction if it is a number', function () {
      expect(browsiRTD.getCurrentData(numbericPrediction, 0)).to.equal(0.456);
    })
  })

  describe('should handle bid request data', function () {
    const data = {
      plc: {
        'adUnit1': { keyA: { 0: 0.234 } },
        'adUnit2': { keyB: { 0: 0.134 } }
      },
      pr: ['bidder1'],
      pmd: undefined
    }
    const fakeAdUnits = [
      {
        code: 'adUnit1',
        bids: [
          { bidder: 'bidder1' },
          { bidder: 'bidder2' }
        ]
      },
      {
        code: 'adUnit2',
        bids: [
          { bidder: 'bidder1' },
          { bidder: 'bidder2' }
        ]
      }
    ]
    before(async () => {
      browsiRTD.setBrowsiData(data);
      browsiRTD.browsiSubmodule.getBidRequestData({ adUnits: fakeAdUnits }, () => { }, {}, null);
    });
    it('should set bidder params with prediction values', function () {
      expect(utils.deepAccess(fakeAdUnits[0].bids[0], 'ortb2Imp.ext.data.browsi')).to.eql({ keyA: 0.234 });
      expect(utils.deepAccess(fakeAdUnits[1].bids[0], 'ortb2Imp.ext.data.browsi')).to.eql({ keyB: 0.134 });
    })
    it('should not set bidder params if bidder is not in pr', function () {
      expect(utils.deepAccess(fakeAdUnits[0].bids[1], 'ortb2Imp.ext.data.browsi')).to.eql(undefined);
      expect(utils.deepAccess(fakeAdUnits[1].bids[1], 'ortb2Imp.ext.data.browsi')).to.eql(undefined);
    })
  })

  describe('should not set bid request data', function () {
    const data = {
      plc: {
        'adUnit1': { keyA: { 0: 0.234 } },
        'adUnit2': { keyB: { 0: 0.134 } }
      },
      pr: [],
      pmd: undefined
    }
    const fakeAdUnits = [
      {
        code: 'adUnit1',
        bids: [
          { bidder: 'bidder1' },
          { bidder: 'bidder2' }
        ]
      },
      {
        code: 'adUnit2',
        bids: [
          { bidder: 'bidder1' },
          { bidder: 'bidder2' }
        ]
      }
    ]
    before(() => {
      browsiRTD.setBrowsiData(data);
      browsiRTD.browsiSubmodule.getBidRequestData({ adUnits: fakeAdUnits }, () => { }, {}, null);
    });
    it('should not set bidder params if pr is empty', function () {
      expect(utils.deepAccess(fakeAdUnits[0].bids[0], 'ortb2Imp.ext.data.browsi')).to.eql(undefined);
      expect(utils.deepAccess(fakeAdUnits[1].bids[0], 'ortb2Imp.ext.data.browsi')).to.eql(undefined);
      expect(utils.deepAccess(fakeAdUnits[0].bids[1], 'ortb2Imp.ext.data.browsi')).to.eql(undefined);
      expect(utils.deepAccess(fakeAdUnits[1].bids[1], 'ortb2Imp.ext.data.browsi')).to.eql(undefined);
    })
  })

  describe('should emit ad request billable event', function () {
    before(() => {
      const data = {
        p: {
          'adUnit1': { ps: { 0: 0.234 } },
          'adUnit2': { ps: { 0: 0.134 } }
        },
        pmd: undefined,
        bet: 'AD_REQUEST'
      };
      browsiRTD.setBrowsiData(data);
    })
    beforeEach(() => {
      eventsEmitSpy.resetHistory();
    })
    it('should send one event per ad unit code', function () {
      const auction = {
        adUnits: [
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
        ]
      };

      browsiRTD.browsiSubmodule.getTargetingData(['a', 'b'], null, null, auction);
      expect(eventsEmitSpy.callCount).to.equal(2);
    })
    it('should send events only for received ad unit codes', function () {
      const auction = {
        adUnits: [
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
        ]
      };

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
        ]
      };

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
      browsiRTD.sendPageviewEvent('PAGEVIEW')
      const pageViewEvent = new CustomEvent('browsi_pageview', {});
      window.dispatchEvent(pageViewEvent);
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
      browsiRTD.sendPageviewEvent('AD_REQUEST');
      browsiRTD.sendPageviewEvent('INACTIVE');
      browsiRTD.sendPageviewEvent(undefined);
      expect(eventsEmitSpy.callCount).to.equal(0);
    })
  })

  describe('set targeting - invalid params', function () {
    const random = Math.floor(Math.random() * 10) + 1;
    it('should return false if key is undefined', function () {
      expect(browsiUtils.setKeyValue(undefined, random)).to.equal(false);
    })
    it('should return false if key is not string', function () {
      expect(browsiUtils.setKeyValue(1, random)).to.equal(false);
    })
  })

  describe('set targeting - valid params', function () {
    let slot;
    const splitKey = 'splitTest';
    const random = Math.floor(Math.random() * 10) + 1;
    before(() => {
      mockGpt.reset();
      window.googletag.pubads().clearTargeting();
      slot = mockGpt.makeSlot({ code: '/123/split', divId: 'split' });
      browsiUtils.setKeyValue(splitKey, random);
      window.googletag.cmd.forEach(cmd => cmd());
    })
    it('should place numeric key value on all slots', function () {
      const targetingValue = window.googletag.pubads().getTargeting(splitKey);
      expect(targetingValue).to.be.an('array').that.is.not.empty;
      expect(targetingValue[0]).to.be.a('string');
    })
  })

  describe('should get latest avg highest bid', function () {
    it('should return lahb', function () {
      const currentTimestemp = new Date().getTime();
      const storageTimestemp = currentTimestemp - (msPerDay);

      const diffInMilliseconds = Math.abs(storageTimestemp - currentTimestemp);
      const diffInDays = diffInMilliseconds / msPerDay;

      const lahb = {
        avg: 0.02,
        smp: 3,
        time: storageTimestemp
      };

      timestampStub.returns(currentTimestemp);

      expect(browsiUtils.getLahb(lahb, currentTimestemp)).to.deep.equal({ avg: 0.02, age: diffInDays });
    });
  })

  describe('should get recent avg highest bid', function () {
    it('should return rahb', function () {
      const currentTimestemp = new Date().getTime();
      const oneDayAgoTimestemp = currentTimestemp - (msPerDay);
      const twoDayAgoTimestemp = currentTimestemp - (2 * msPerDay);
      const rahb = {
        [currentTimestemp]: { 'sum': 20, 'smp': 8 },
        [oneDayAgoTimestemp]: { 'sum': 25, 'smp': 10 },
        [twoDayAgoTimestemp]: { 'sum': 30, 'smp': 12 }
      };
      expect(browsiUtils.getRahb(rahb, currentTimestemp)).to.deep.equal({ avg: 2.5 });
    });
    it('should return rahb without timestamps older than a week', function () {
      const currentTimestemp = new Date().getTime();
      const oneDayAgoTimestemp = currentTimestemp - (msPerDay);
      const twoDayAgoTimestemp = currentTimestemp - (2 * msPerDay);
      const twoWeekAgoTimestemp = currentTimestemp - (14 * msPerDay);
      const rahb = {
        [currentTimestemp]: { 'sum': 20, 'smp': 8 },
        [oneDayAgoTimestemp]: { 'sum': 25, 'smp': 10 },
        [twoDayAgoTimestemp]: { 'sum': 30, 'smp': 12 },
        [twoWeekAgoTimestemp]: { 'sum': 35, 'smp': 20 }
      };
      const expected = {
        [currentTimestemp]: { 'sum': 20, 'smp': 8 },
        [oneDayAgoTimestemp]: { 'sum': 25, 'smp': 10 },
        [twoDayAgoTimestemp]: { 'sum': 30, 'smp': 12 },
      };
      expect(browsiUtils.getRahbByTs(rahb, currentTimestemp)).to.deep.equal(expected);
    });
    it('should return an empty object if all timestamps are older than a week', function () {
      const currentTimestemp = new Date().getTime();
      const eightDaysAgoTimestemp = currentTimestemp - (8 * msPerDay);
      const twoWeekAgoTimestemp = currentTimestemp - (14 * msPerDay);
      const rahb = {
        [eightDaysAgoTimestemp]: { 'sum': 20, 'smp': 8 },
        [twoWeekAgoTimestemp]: { 'sum': 25, 'smp': 10 }
      };
      expect(browsiUtils.getRahbByTs(rahb, currentTimestemp)).to.deep.equal({});
    });
  })

  describe('should get avg highest bid metrics', function () {
    const currentTimestemp = new Date().getTime();
    const oneDayAgoTimestemp = currentTimestemp - (msPerDay);
    const twoWeekAgoTimestemp = currentTimestemp - (14 * msPerDay);

    const uahb = { avg: 0.2991556234740213, smp: 28 };
    const lahb = { avg: 0.02, smp: 3, time: oneDayAgoTimestemp };
    const rahb = { [currentTimestemp]: { sum: 20, smp: 8 }, [oneDayAgoTimestemp]: { sum: 25, smp: 10 }, };

    const getExpected = function (bus) {
      return {
        uahb: +bus.uahb?.avg.toFixed(3),
        rahb: +(2.5).toFixed(3),
        lahb: +bus.lahb?.avg.toFixed(3),
        lbsa: +(1).toFixed(3),
      }
    }

    before(() => {
      timestampStub.returns(currentTimestemp);
      browsiRTD.setTimestamp();
    });
    it('should return undefined if bus is not defined', function () {
      expect(browsiUtils.getHbm(undefined)).to.equal(undefined);
    });
    it('should return metrics if bus is defined', function () {
      const bus = { uahb, lahb, rahb };
      expect(browsiUtils.getHbm(bus, currentTimestemp)).to.deep.equal({
        uahb: getExpected(bus).uahb,
        rahb: getExpected(bus).rahb,
        lahb: getExpected(bus).lahb,
        lbsa: getExpected(bus).lbsa
      });
    });
    it('should return metrics without lahb if its not defined', function () {
      const bus = { uahb, rahb };
      expect(browsiUtils.getHbm(bus, currentTimestemp)).to.deep.equal({
        uahb: getExpected(bus).uahb,
        rahb: getExpected(bus).rahb,
        lahb: undefined,
        lbsa: undefined
      });
    });
    it('should return metrics without rahb if its not defined', function () {
      const bus = { uahb, lahb };
      expect(browsiUtils.getHbm(bus, currentTimestemp)).to.deep.equal({
        uahb: getExpected(bus).uahb,
        rahb: undefined,
        lahb: getExpected(bus).lahb,
        lbsa: getExpected(bus).lbsa
      });
    });
    it('should return metrics without uahb if its not defined', function () {
      const bus = { lahb, rahb };
      expect(browsiUtils.getHbm(bus, currentTimestemp)).to.deep.equal({
        uahb: undefined,
        rahb: getExpected(bus).rahb,
        lahb: getExpected(bus).lahb,
        lbsa: getExpected(bus).lbsa
      });
    });
    it('should return metrics without rahb if timestamps are older than a week', function () {
      const bus = { uahb, lahb, rahb: { [twoWeekAgoTimestemp]: { sum: 25, smp: 10 } } };
      expect(browsiUtils.getHbm(bus, currentTimestemp)).to.deep.equal({
        uahb: getExpected(bus).uahb,
        rahb: undefined,
        lahb: getExpected(bus).lahb,
        lbsa: getExpected(bus).lbsa
      });
    });
  })
});
