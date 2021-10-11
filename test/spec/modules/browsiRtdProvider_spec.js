import * as browsiRTD from '../../../modules/browsiRtdProvider.js';
import {makeSlot} from '../integration/faker/googletag.js';
import * as utils from '../../../src/utils'

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
    const slot = makeSlot({code: '/57778053/Browsi_Demo_300x250', divId: 'browsiAd_1'});

    const test1 = browsiRTD.isIdMatchingAdUnit(slot, ['/57778053/Browsi_Demo_300x250']); // true
    const test2 = browsiRTD.isIdMatchingAdUnit(slot, ['/57778053/Browsi_Demo_300x250', '/57778053/Browsi']); // true
    const test3 = browsiRTD.isIdMatchingAdUnit(slot, ['/57778053/Browsi_Demo_Low']); // false
    const test4 = browsiRTD.isIdMatchingAdUnit(slot, []); // true

    expect(test1).to.equal(true);
    expect(test2).to.equal(true);
    expect(test3).to.equal(false);
    expect(test4).to.equal(true);
  });

  it('should return correct macro values', function () {
    const slot = makeSlot({code: '/57778053/Browsi_Demo_300x250', divId: 'browsiAd_1'});

    slot.setTargeting('test', ['test', 'value']);
    // slot getTargeting doesn't act like GPT so we can't expect real value
    const macroResult = browsiRTD.getMacroId({p: '<AD_UNIT>/<KEY_test>'}, slot);
    expect(macroResult).to.equal('/57778053/Browsi_Demo_300x250/NA');

    const macroResultB = browsiRTD.getMacroId({}, slot);
    expect(macroResultB).to.equal('browsiAd_1');

    const macroResultC = browsiRTD.getMacroId({p: '<AD_UNIT>', s: {s: 0, e: 1}}, slot);
    expect(macroResultC).to.equal('/');
  });

  describe('should return data to RTD module', function () {
    it('should return empty if no ad units defined', function () {
      browsiRTD.setData({});
      expect(browsiRTD.browsiSubmodule.getTargetingData([])).to.eql({});
    });

    it('should return NA if no prediction for ad unit', function () {
      makeSlot({code: 'adMock', divId: 'browsiAd_2'});
      browsiRTD.setData({});
      expect(browsiRTD.browsiSubmodule.getTargetingData(['adMock'])).to.eql({adMock: {bv: 'NA'}});
    });

    it('should return prediction from server', function () {
      makeSlot({code: 'hasPrediction', divId: 'hasPrediction'});
      const data = {
        p: {'hasPrediction': {ps: {0: 0.234}}},
        kn: 'bv',
        pmd: undefined
      };
      browsiRTD.setData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['hasPrediction'])).to.eql({hasPrediction: {bv: '0.20'}});
    })
  })

  describe('should return prediction according to refresh count', function () {
    const predictions = {
      0: 0.123,
      1: 0.254,
      3: 0,
      4: 0.8
    }
    const singlePrediction = {
      0: 0.123
    }
    it('should return raw value for valid refresh count', function () {
      expect(browsiRTD.getPredictionByRefreshCount(predictions, 0)).to.equal(0.123);
      expect(browsiRTD.getPredictionByRefreshCount(predictions, 1)).to.equal(0.254);
    })
    it('should return 0 for prediction = 0', function () {
      expect(browsiRTD.getPredictionByRefreshCount(predictions, 3)).to.equal(0);
    })
    it('should return -1 for invalid params', function () {
      expect(browsiRTD.getPredictionByRefreshCount(null, 3)).to.equal(-1);
      expect(browsiRTD.getPredictionByRefreshCount(predictions, null)).to.equal(-1);
    })
    it('should return -1 for refresh count > 0 if prediction object length is 1 ', function () {
      expect(browsiRTD.getPredictionByRefreshCount(singlePrediction, 0)).to.equal(0.123);
      expect(browsiRTD.getPredictionByRefreshCount(singlePrediction, 1)).to.equal(-1);
      expect(browsiRTD.getPredictionByRefreshCount(singlePrediction, 2)).to.equal(-1);
    })
    it('should return last refresh prediction if there is no value for the refresh count', function () {
      expect(browsiRTD.getPredictionByRefreshCount(predictions, 4)).to.equal(0.8);
      expect(browsiRTD.getPredictionByRefreshCount(predictions, 5)).to.equal(0.8);
      expect(browsiRTD.getPredictionByRefreshCount(predictions, 8)).to.equal(0.8);
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
      expect(utils.deepAccess(fakeAdUnits[0], 'ortb2Imp.ext.data.browsi')).to.eql({browsiViewability: '0.20'});
      expect(utils.deepAccess(fakeAdUnits[1], 'ortb2Imp.ext.data.browsi')).to.eql({browsiViewability: '0.10'});
    })
  })
});
