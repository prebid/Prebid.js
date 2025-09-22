import {
  appendGptSlots,
  _currentConfig,
  makeBidRequestsHook,
  getAuctionsIdsFromTargeting,
  getSegments,
  getSignals,
  getSignalsArrayByAuctionsIds,
  getSignalsIntersection
} from 'modules/gptPreAuction.js';
import { config } from 'src/config.js';
import { makeSlot } from '../integration/faker/googletag.js';
import { taxonomies } from '../../../libraries/gptUtils/gptUtils.js';

describe('GPT pre-auction module', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
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

  const mockTargeting = {'/123456/header-bid-tag-0': {'hb_deal_rubicon': '1234', 'hb_deal': '1234', 'hb_pb': '0.53', 'hb_adid': '148018fe5e', 'hb_bidder': 'rubicon', 'foobar': '300x250', 'hb_pb_rubicon': '0.53', 'hb_adid_rubicon': '148018fe5e', 'hb_bidder_rubicon': 'rubicon', 'hb_deal_appnexus': '4321', 'hb_pb_appnexus': '0.1', 'hb_adid_appnexus': '567891011', 'hb_bidder_appnexus': 'appnexus'}}

  const mockAuctionManager = {
    findBidByAdId(adId) {
      const bidsMap = {
        '148018fe5e': {
          auctionId: mocksAuctions[0].auctionId
        },
        '567891011': {
          auctionId: mocksAuctions[1].auctionId
        },
      };
      return bidsMap[adId];
    },
    index: {
      getAuction({ auctionId }) {
        return mocksAuctions.find(auction => auction.auctionId === auctionId);
      }
    }
  }

  const mocksAuctions = [
    {
      auctionId: '1111',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '1'
              }, {
                id: '2'
              }]
            }],
          }
        }
      })
    },
    {
      auctionId: '234234',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '2'
              }]
            }]
          }
        }
      }),
    }, {
      auctionId: '234324234',
      getFPD: () => ({
        global: {
          user: {
            data: [{
              name: 'dataprovider.com',
              ext: {
                segtax: 4
              },
              segment: [{
                id: '2'
              }, {
                id: '3'
              }]
            }]
          }
        }
      })
    },
  ]

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

    it('should add adServer object to context if matching slot is found (in case of twin ad unit)', () => {
      window.googletag.pubads().setSlots(testSlots);
      const adUnit1 = { code: 'slotCode2', ortb2Imp: { ext: { data: {} } } };
      const adUnit2 = { code: 'slotCode2', ortb2Imp: { ext: { data: {} } } };
      appendGptSlots([adUnit1, adUnit2]);
      expect(adUnit1.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit1.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode2' });

      expect(adUnit2.ortb2Imp.ext.data.adserver).to.be.an('object');
      expect(adUnit2.ortb2Imp.ext.data.adserver).to.deep.equal({ name: 'gam', adslot: 'slotCode2' });
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

    it('returns full ad unit path even if mcmEnabled is true', () => {
      config.setConfig({ gptPreAuction: { enabled: true, mcmEnabled: true } });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slot', divId: 'div1' }),
      ]);
      const adUnit = {code: '/12345,21212/slot'};
      expect(appendGptSlots([adUnit])).to.eql({
        '/12345,21212/slot': '/12345,21212/slot'
      })
    })

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
        }
      });

      expect(_currentConfig.enabled).to.equal(true);
      expect(_currentConfig.customGptSlotMatching).to.a('function');
      expect(_currentConfig.customGptSlotMatching()).to.equal('customGptSlot');
    });

    it('should check that custom functions in config are type function', () => {
      config.setConfig({
        gptPreAuction: {
          customGptSlotMatching: 12345,
        }
      });
      expect(_currentConfig).to.deep.equal({
        enabled: true,
        customGptSlotMatching: false,
        customPreAuction: false,
        useDefaultPreAuction: true
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
          ortb2Imp: { ext: { data: {} } }
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
            data: {},
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
            data: {},
            gpid: 'adUnit2-2'
          }
        }
      }, {
        code: 'slotCode3',
        ortb2Imp: {
          ext: {
            // slotname found, so uses code + slotname (which is same)
            data: {
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

    it('should pass full slot path to customPreAuction when mcmEnabled is true', () => {
      const customPreAuction = sinon.stub();
      config.setConfig({
        gptPreAuction: {
          enabled: true,
          mcmEnabled: true,
          customPreAuction
        }
      });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slot', divId: 'div1' }),
      ]);
      const adUnit = {code: '/12345,21212/slot'};
      makeBidRequestsHook(sinon.stub(), [adUnit]);
      sinon.assert.calledWith(customPreAuction, adUnit, '/12345/slot', adUnit.code);
    });

    it('should not choke if gpt is not available', () => {
      config.setConfig({
        gptPreAuction: {
          enabled: true
        }
      });
      sandbox.stub(window, 'googletag').value(null);
      makeBidRequestsHook(sinon.stub(), [{}]);
    })

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
          ortb2Imp: { ext: { data: {} } }
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
            data: {},
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

    it('sets gpid when mcmEnabled: true', () => {
      config.setConfig({ gptPreAuction: { enabled: true, mcmEnabled: true } });
      window.googletag.pubads().setSlots([
        makeSlot({ code: '/12345,21212/slot', divId: 'div1' }),
      ]);
      const adUnit = {code: '/12345,21212/slot'};
      makeBidRequestsHook(sinon.stub(), [adUnit]);
      expect(adUnit.ortb2Imp.ext.gpid).to.eql('/12345/slot');
    });
  });

  describe('pps gpt config', () => {
    it('should parse segments from fpd', () => {
      const twoSegments = getSegments(mocksAuctions[0].getFPD().global, ['user.data'], 4);
      expect(JSON.stringify(twoSegments)).to.equal(JSON.stringify(['1', '2']));
      const zeroSegments = getSegments(mocksAuctions[0].getFPD().global, ['user.data'], 6);
      expect(zeroSegments).to.length(0);
    });

    it('should return signals from fpd', () => {
      const signals = getSignals(mocksAuctions[0].getFPD().global);
      const expectedSignals = [{ taxonomy: taxonomies[0], values: ['1', '2'] }];
      expect(signals).to.eql(expectedSignals);
    });

    it('should properly get auctions ids from targeting', () => {
      const auctionsIds = getAuctionsIdsFromTargeting(mockTargeting, mockAuctionManager);
      expect(auctionsIds).to.eql([mocksAuctions[0].auctionId, mocksAuctions[1].auctionId])
    });

    it('should filter out adIds that do not map to any auction', () => {
      const auctionsIds = getAuctionsIdsFromTargeting({
        ...mockTargeting,
        'au': {'hb_adid': 'missing'},
      }, mockAuctionManager);
      expect(auctionsIds).to.eql([mocksAuctions[0].auctionId, mocksAuctions[1].auctionId]);
    })

    it('should properly return empty array of auction ids for invalid targeting', () => {
      let auctionsIds = getAuctionsIdsFromTargeting({}, mockAuctionManager);
      expect(Array.isArray(auctionsIds)).to.equal(true);
      expect(auctionsIds).to.length(0);
      auctionsIds = getAuctionsIdsFromTargeting({'/123456/header-bid-tag-0/bg': {'invalidContent': '123'}}, mockAuctionManager);
      expect(Array.isArray(auctionsIds)).to.equal(true);
      expect(auctionsIds).to.length(0);
    });

    it('should properly get signals from auctions', () => {
      const signals = getSignalsArrayByAuctionsIds(['1111', '234234', '234324234'], mockAuctionManager.index);
      const intersection = getSignalsIntersection(signals);
      const expectedResult = { IAB_AUDIENCE_1_1: { values: ['2'] }, IAB_CONTENT_2_2: { values: [] } };
      expect(JSON.stringify(intersection)).to.be.equal(JSON.stringify(expectedResult));
    });

    it('should return empty signals array for empty auctions ids array', () => {
      const signals = getSignalsArrayByAuctionsIds([], mockAuctionManager.index);
      expect(Array.isArray(signals)).to.equal(true);
      expect(signals).to.length(0);
    });

    it('should return properly formatted object for getSignalsIntersection invoked with empty array', () => {
      const signals = getSignalsIntersection([]);
      expect(Object.keys(signals)).to.contain.members(taxonomies);
    });
  });
});
