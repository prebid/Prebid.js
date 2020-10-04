import * as browsiRTD from '../../../modules/browsiRtdProvider.js';
import {makeSlot} from '../integration/faker/googletag.js';

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
        p: {'hasPrediction': {p: 0.234}},
        kn: 'bv',
        pmd: undefined
      };
      browsiRTD.setData(data);
      expect(browsiRTD.browsiSubmodule.getTargetingData(['hasPrediction'])).to.eql({hasPrediction: {bv: '0.20'}});
    })
  })
});
