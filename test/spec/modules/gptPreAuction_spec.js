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
    makeSlot({ code: 'slotCode3', divId: 'div3' }),
    makeSlot({ code: 'slotCode4', divId: 'div4' }),
    makeSlot({ code: 'slotCode4', divId: 'div5' })
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

    it('will trim child id if mcmEnabled is set to true', () => {
      config.setConfig({ gptPreAuction: { enabled: true, mcmEnabled: true } });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slotCode1', divId: 'div1' }),
        makeSlot({ code: '/12345,21212/slotCode2', divId: 'div2' }),
        makeSlot({ code: '/12345,21212/slotCode3', divId: 'div3' })
      ]);
      const adUnit = { code: '/12345,21212/slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: '/12345/slotCode2' });
    });

    it('will not trim child id if mcmEnabled is not set to true', () => {
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slotCode1', divId: 'div1' }),
        makeSlot({ code: '/12345,21212/slotCode2', divId: 'div2' }),
        makeSlot({ code: '/12345,21212/slotCode3', divId: 'div3' })
      ]);
      const adUnit = { code: '/12345,21212/slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit]);
      expect(adUnit.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: '/12345,21212/slotCode2' });
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
        customPbAdSlot: false,
        customPreAuction: false,
        useDefaultPreAuction: false
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

      // first two adUnits directly pass in pbadslot => gpid is same
      const expectedAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: '12345'
            },
            gpid: '12345'
          }
        }
      },
      // second adunit
      {
        code: 'slotCode1',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: '67890',
              adserver: {
                name: 'gam',
                adslot: 'slotCode1'
              }
            },
            gpid: '67890'
          }
        }
      }, {
        code: 'slotCode3',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: 'slotCode3',
              adserver: {
                name: 'gam',
                adslot: 'slotCode3'
              }
            },
            gpid: 'slotCode3'
          }
        }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });

    it('should not apply gpid if pbadslot was set by adUnitCode', () => {
      const testAdUnits = [{
        code: 'noMatchCode',
      }];

      // first two adUnits directly pass in pbadslot => gpid is same
      const expectedAdUnits = [{
        code: 'noMatchCode',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: 'noMatchCode'
            },
          }
        }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });

    it('should use the passed customPreAuction logic', () => {
      let counter = 0;
      config.setConfig({
        gptPreAuction: {
          enabled: true,
          customPreAuction: (adUnit, slotName) => {
            counter += 1;
            return `${adUnit.code}-${slotName || counter}`;
          }
        }
      });
      const testAdUnits = [
        {
          code: 'adUnit1',
          ortb2Imp: { ext: { data: { pbadslot: '12345' } } }
        },
        {
          code: 'adUnit2',
        },
        {
          code: 'slotCode3',
        },
        {
          code: 'div4',
        }
      ];

      // all slots should be passed in same time and have slot-${index}
      const expectedAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: {
          ext: {
            // no slotname match so uses adUnit.code-counter
            data: {
              pbadslot: 'adUnit1-1'
            },
            gpid: 'adUnit1-1'
          }
        }
      },
      // second adunit
      {
        code: 'adUnit2',
        ortb2Imp: {
          ext: {
            // no slotname match so uses adUnit.code-counter
            data: {
              pbadslot: 'adUnit2-2'
            },
            gpid: 'adUnit2-2'
          }
        }
      }, {
        code: 'slotCode3',
        ortb2Imp: {
          ext: {
            // slotname found, so uses code + slotname (which is same)
            data: {
              pbadslot: 'slotCode3-slotCode3',
              adserver: {
                name: 'gam',
                adslot: 'slotCode3'
              }
            },
            gpid: 'slotCode3-slotCode3'
          }
        }
      }, {
        code: 'div4',
        ortb2Imp: {
          ext: {
            // slotname found, so uses code + slotname
            data: {
              pbadslot: 'div4-slotCode4',
              adserver: {
                name: 'gam',
                adslot: 'slotCode4'
              }
            },
            gpid: 'div4-slotCode4'
          }
        }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });

    it('should use useDefaultPreAuction logic', () => {
      config.setConfig({
        gptPreAuction: {
          enabled: true,
          useDefaultPreAuction: true
        }
      });
      const testAdUnits = [
        // First adUnit should use the preset pbadslot
        {
          code: 'adUnit1',
          ortb2Imp: { ext: { data: { pbadslot: '12345' } } }
        },
        // Second adUnit should not match a gam slot, so no slot set
        {
          code: 'adUnit2',
        },
        // third adunit matches a single slot so uses it
        {
          code: 'slotCode3',
        },
        // fourth adunit matches multiple slots so combination
        {
          code: 'div4',
        }
      ];

      const expectedAdUnits = [{
        code: 'adUnit1',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: '12345'
            },
            gpid: '12345'
          }
        }
      },
      // second adunit
      {
        code: 'adUnit2',
        ortb2Imp: {
          ext: {
            data: {
            },
          }
        }
      }, {
        code: 'slotCode3',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: 'slotCode3',
              adserver: {
                name: 'gam',
                adslot: 'slotCode3'
              }
            },
            gpid: 'slotCode3'
          }
        }
      }, {
        code: 'div4',
        ortb2Imp: {
          ext: {
            data: {
              pbadslot: 'slotCode4#div4',
              adserver: {
                name: 'gam',
                adslot: 'slotCode4'
              }
            },
            gpid: 'slotCode4#div4'
          }
        }
      }];

      window.googletag.pubads().setSlots(testSlots);
      runMakeBidRequests(testAdUnits);
      expect(returnedAdUnits).to.deep.equal(expectedAdUnits);
    });
  });
});
