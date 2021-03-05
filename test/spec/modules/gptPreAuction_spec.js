import {
  appendGptSlots,
  appendPbAdSlot,
  _currentConfig,
  makeBidRequestsHook
} from 'modules/gptPreAuction.js';
import { config } from 'src/config.js';
import { makeSlot } from '../integration/faker/googletag.js';

describe('GPT pre-auction module', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
    config.setConfig({ gptPreAuction: { enabled: false } });
  });

  const testSlots = [
    makeSlot({ code: 'slotCode1', divId: 'div1' }),
    makeSlot({ code: 'slotCode2', divId: 'div2' }),
    makeSlot({ code: 'slotCode3', divId: 'div3' })
  ];

  describe('appendPbAdSlot', () => {
    // sets up our document body to test the pbAdSlot dom actions against
    document.body.innerHTML = '<div id="foo1" data-adslotid="bar1">test1</div>' +
          '<div id="foo2" data-adslotid="bar2">test2</div>' +
          '<div id="foo3">test2</div>';

    it('should be unchanged if already defined on adUnit', () => {
      const adUnit = { ortb2Imp: { ext: { data: { pbadslot: '12345' } } } };
      appendPbAdSlot(adUnit);
      expect(adUnit.ortb2Imp.ext.data.pbadslot).to.equal('12345');
    });

    it('should use adUnit.code if matching id exists', () => {
      const adUnit = { code: 'foo1', ortb2Imp: { ext: { data: {} } } };
      appendPbAdSlot(adUnit);
      expect(adUnit.ortb2Imp.ext.data.pbadslot).to.equal('bar1');
    });

    it('should use the gptSlot.adUnitPath if the adUnit.code matches a div id but does not have a data-adslotid', () => {
      const adUnit = { code: 'foo3', mediaTypes: { banner: { sizes: [[250, 250]] } }, ortb2Imp: { ext: { data: { adserver: { name: 'gam', adslot: '/baz' } } } } };
      appendPbAdSlot(adUnit);
      expect(adUnit.ortb2Imp.ext.data.pbadslot).to.equal('/baz');
    });

    it('should use the video adUnit.code (which *should* match the configured "adSlotName", but is not being tested) if there is no matching div with "data-adslotid" defined', () => {
      const adUnit = { code: 'foo4', mediaTypes: { video: { sizes: [[250, 250]] } }, ortb2Imp: { ext: { data: {} } } };
      adUnit.code = 'foo5';
      appendPbAdSlot(adUnit, undefined);
      expect(adUnit.ortb2Imp.ext.data.pbadslot).to.equal('foo5');
    });

    it('should use the adUnit.code if all other sources failed', () => {
      const adUnit = { code: 'foo4', ortb2Imp: { ext: { data: {} } } };
      appendPbAdSlot(adUnit, undefined);
      expect(adUnit.ortb2Imp.ext.data.pbadslot).to.equal('foo4');
    });

    it('should use the customPbAdSlot function if one is given', () => {
      config.setConfig({
        gptPreAuction: {
          customPbAdSlot: () => 'customPbAdSlotName'
        }
      });

      const adUnit = { code: 'foo1', ortb2Imp: { ext: { data: {} } } };
      appendPbAdSlot(adUnit);
      expect(adUnit.ortb2Imp.ext.data.pbadslot).to.equal('customPbAdSlotName');
    });
  });

  describe('appendGptSlots', () => {
    it('should not add adServer object to context if no slots defined', () => {
      const adUnit = { code: 'adUnitCode', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.undefined;
    });

    it('should not add adServer object to context if no slot matches', () => {
      window.googletag.pubads().setSlots(testSlots);
      const adUnit = { code: 'adUnitCode', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.undefined;
    });

    it('should add adServer object to context if matching slot is found', () => {
      window.googletag.pubads().setSlots(testSlots);
      const adUnit = { code: 'slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode2' });
    });

    it('should use the customGptSlotMatching function if one is given', () => {
      config.setConfig({
        gptPreAuction: {
          customGptSlotMatching: slot =>
            adUnitCode => adUnitCode.toUpperCase() === slot.getAdUnitPath().toUpperCase()
        }
      });

      window.googletag.pubads().setSlots(testSlots);
      const adUnit = { code: 'SlOtCoDe1', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode1' });
    });
  });

  describe('handleSetGptConfig', () => {
    it('should enable the module by default', () => {
      config.setConfig({ gptPreAuction: {} });
      expect(_currentConfig.enabled).to.equal(true);
    });

    it('should disable the module if told to in set config', () => {
      config.setConfig({ gptPreAuction: { enabled: false } });
      expect(_currentConfig).to.be.an('object').that.is.empty;
    });

    it('should accept custom functions in config', () => {
      config.setConfig({
        gptPreAuction: {
          customGptSlotMatching: () => 'customGptSlot',
          customPbAdSlot: () => 'customPbAdSlot'
        }
      });

      expect(_currentConfig.enabled).to.equal(true);
      expect(_currentConfig.customGptSlotMatching).to.a('function');
      expect(_currentConfig.customPbAdSlot).to.a('function');
      expect(_currentConfig.customGptSlotMatching()).to.equal('customGptSlot');
      expect(_currentConfig.customPbAdSlot()).to.equal('customPbAdSlot');
    });

    it('should check that custom functions in config are type function', () => {
      config.setConfig({
        gptPreAuction: {
          customGptSlotMatching: 12345,
          customPbAdSlot: 'test'
        }
      });
      expect(_currentConfig).to.deep.equal({
        enabled: true,
        customGptSlotMatching: false,
        customPbAdSlot: false
      });
    });
  });

  describe('makeBidRequestsHook', () => {
    let returnedAdUnits;
    const runMakeBidRequests = adUnits => {
      const next = adUnits => {
        returnedAdUnits = adUnits;
      };
      makeBidRequestsHook(next, adUnits);
    };

    it('should append PB Ad Slot and GPT Slot info to first-party data in each ad unit', () => {
      const testAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: { ext: { data: { pbadslot: '12345' } } }
      }, {
        code: 'slotCode1',
        ortb2Imp: { ext: { data: { pbadslot: '67890' } } }
      }, {
        code: 'slotCode3',
      }];

      const expectedAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: { ext: { data: { pbadslot: '12345' } } }
      }, {
        code: 'slotCode1',
        ortb2Imp: { ext: { data: { pbadslot: '67890', adserver: { name: 'gam', adslot: 'slotCode1' } } } }
      }, {
        code: 'slotCode3',
        ortb2Imp: { ext: { data: { pbadslot: 'slotCode3', adserver: { name: 'gam', adslot: 'slotCode3' } } } }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });
  });
});
