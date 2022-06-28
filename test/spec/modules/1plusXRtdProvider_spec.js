import { config } from 'src/config';
import { logMessage } from 'src/utils';
import { server } from 'test/mocks/xhr.js';
import {
  onePlusXSubmodule,
  buildOrtb2Updates,
  updateBidderConfig,
  setTargetingDataToConfig
} from 'modules/1plusXRtdProvider';

describe('1plusXRtdProvider', () => {
  const reqBidsConfigObj = {};
  let fakeServer;
  const fakeResponseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  const fakeResponse = {
    s: ['segment1', 'segment2', 'segment3'],
    t: ['targeting1', 'targeting2', 'targeting3']
  };

  const bidderConfigInitial = {
    ortb2: {
      user: { keywords: '' },
      site: { content: { data: [] } }
    }
  }
  const bidderConfigInitialWith1plusXEntry = {
    ortb2: {
      user: {
        data: [{ name: '1plusX.com', segment: [{ id: 'initial' }] }]
      },
      site: { content: { data: [] } }
    }
  }
  const bidderConfigInitialWithUserData = {
    ortb2: {
      user: {
        data: [{ name: 'hello.world', segment: [{ id: 'initial' }] }]
      },
      site: { content: { data: [] } }
    }
  }

  before(() => {
    config.resetConfig();
  })

  after(() => { })

  beforeEach(() => {
    fakeServer = sinon.createFakeServer();
    fakeServer.respondWith('GET', '*', [200, fakeResponseHeaders, JSON.stringify(fakeResponse)]);
    fakeServer.respondImmediately = true;
    fakeServer.autoRespond = true;
  })

  describe('onePlusXSubmodule', () => {
    it('init is successfull', () => {
      const initResult = onePlusXSubmodule.init();
      expect(initResult).to.be.true;
    })

    it('callback is called after getBidRequestData', () => {
      // Nice case; everything runs as expected
      {
        const callbackSpy = sinon.spy();
        const config = { params: { customerId: 'test' } };
        onePlusXSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, config);
        setTimeout(() => {
          expect(callbackSpy.calledOnce).to.be.true
        }, 100)
      }
      // No customer id in config => error but still callback called
      {
        const callbackSpy = sinon.spy();
        const config = {}
        onePlusXSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, config);
        setTimeout(() => {
          expect(callbackSpy.calledOnce).to.be.true
        }, 100);
      }
    })
  })

  describe('buildOrtb2Updates', () => {
    it('fills site.keywords & user.data in the ortb2 config', () => {
      const rtdData = { segments: fakeResponse.s, topics: fakeResponse.t };
      const ortb2Updates = buildOrtb2Updates(rtdData);

      const expectedOutput = {
        site: {
          keywords: rtdData.topics.join(','),
        },
        userData: {
          name: '1plusX.com',
          segment: rtdData.segments.map((segmentId) => ({ id: segmentId }))
        }
      }
      expect([ortb2Updates]).to.deep.include.members([expectedOutput]);
    });

    it('defaults to empty array if no segment is given', () => {
      const rtdData = { topics: fakeResponse.t };
      const ortb2Updates = buildOrtb2Updates(rtdData);

      const expectedOutput = {
        site: {
          keywords: rtdData.topics.join(','),
        },
        userData: {
          name: '1plusX.com',
          segment: []
        }
      }
      expect(ortb2Updates).to.deep.include(expectedOutput);
    })

    it('defaults to empty string if no topic is given', () => {
      const rtdData = { segments: fakeResponse.s };
      const ortb2Updates = buildOrtb2Updates(rtdData);

      const expectedOutput = {
        site: {
          keywords: '',
        },
        userData: {
          name: '1plusX.com',
          segment: rtdData.segments.map((segmentId) => ({ id: segmentId }))
        }
      }
      expect(ortb2Updates).to.deep.include(expectedOutput);
    })
  })

  describe('updateBidderConfig', () => {
    const ortb2Updates = {
      site: {
        keywords: fakeResponse.t.join(','),
      },
      userData: {
        name: '1plusX.com',
        segment: fakeResponse.s.map((segmentId) => ({ id: segmentId }))
      }
    }


    it("doesn't write in config of unsupported bidder", () => {
      const unsupportedBidder = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5);
      // Set initial config for this bidder
      config.setBidderConfig({
        bidders: [unsupportedBidder],
        config: bidderConfigInitial
      })
      // Call my own setBidderConfig with targeting data
      const newBidderConfig = updateBidderConfig(unsupportedBidder, ortb2Updates, config.getBidderConfig());
      // Check that the config has not been changed for unsupported bidder
      expect(newBidderConfig).to.be.null;
    })

    it('merges config for supported bidders (appnexus)', () => {
      const bidder = 'appnexus';
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitial
      });
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());

      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.site).to.deep.include(ortb2Updates.site);
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      // Check that existing config didn't get erased
      expect(newBidderConfig.ortb2.site).to.deep.include(bidderConfigInitial.ortb2.site);
      expect(newBidderConfig.ortb2.user).to.deep.include(bidderConfigInitial.ortb2.user);
    })

    it('merges config for supported bidders (rubicon)', () => {
      const bidder = 'rubicon';
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitial
      });
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.site).to.deep.include(ortb2Updates.site);
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      // Check that existing config didn't get erased
      expect(newBidderConfig.ortb2.site).to.deep.include(bidderConfigInitial.ortb2.site);
      expect(newBidderConfig.ortb2.user).to.deep.include(bidderConfigInitial.ortb2.user);
    })

    it('overwrites an existing 1plus.com entry in ortb2.user.data', () => {
      const bidder = 'appnexus';
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitialWith1plusXEntry
      });
      // Save previous user.data entry
      const previousUserData = bidderConfigInitialWithUserData.ortb2.user.data[0]
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.ortb2.user.data).not.to.include(previousUserData);
    })

    it("doesn't overwrite entries in ortb2.user.data that aren't 1plusx.com", () => {
      const bidder = 'appnexus';
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitialWithUserData
      });
      // Save previous user.data entry
      const previousUserData = bidderConfigInitialWithUserData.ortb2.user.data[0]
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.ortb2.user.data).to.deep.include(previousUserData);
    })

  })

  describe('setTargetingDataToConfig', () => {
    const expectedOrtb2 = {
      site: {
        keywords: fakeResponse.t.join(',')
      },
      user: {
        data: [{
          name: '1plusX.com',
          segment: fakeResponse.s.map((segmentId) => ({ id: segmentId }))
        }]
      }
    }

    it("doesn't set config for unsupported bidders", () => {
      const unsupportedBidder = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5);
      // setting initial config for this bidder
      config.setBidderConfig({
        bidders: [unsupportedBidder],
        config: bidderConfigInitial
      })
      // call setTargetingDataToConfig
      setTargetingDataToConfig(fakeResponse, { bidders: [unsupportedBidder] });
      // Check that the config has not been changed for unsupported bidder
      const newConfig = config.getBidderConfig()[unsupportedBidder];
      expect(newConfig.ortb2.user.data).to.be.undefined;
      expect(newConfig.ortb2.site).to.not.have.any.keys('keywords')
      expect(newConfig).to.deep.include(bidderConfigInitial);
    })

    it('sets the config for the selected bidders', () => {
      const bidders = ['appnexus', 'rubicon'];
      // setting initial config for those bidders
      config.setBidderConfig({
        bidders,
        config: bidderConfigInitial
      })
      // call setTargetingDataToConfig
      setTargetingDataToConfig(fakeResponse, { bidders });

      // Check that the targeting data has been set in both configs
      for (const bidder of bidders) {
        const newConfig = config.getBidderConfig()[bidder];
        expect(newConfig.ortb2.site).to.deep.include(expectedOrtb2.site);
        expect(newConfig.ortb2.user).to.deep.include(expectedOrtb2.user);
        // Check that existing config didn't get erased
        expect(newConfig.ortb2.site).to.deep.include(bidderConfigInitial.ortb2.site);
        expect(newConfig.ortb2.user).to.deep.include(bidderConfigInitial.ortb2.user);
      }
    })
    it('ignores unsupported bidders', () => {
      const unsupportedBidder = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5);
      const bidders = ['appnexus', unsupportedBidder];
      // setting initial config for those bidders
      config.setBidderConfig({
        bidders,
        config: bidderConfigInitial
      })
      // call setTargetingDataToConfig
      setTargetingDataToConfig(fakeResponse, { bidders });

      // Check that the targeting data has been set for supported bidder
      const appnexusConfig = config.getBidderConfig()['appnexus'];
      expect(appnexusConfig.ortb2.site).to.deep.include(expectedOrtb2.site);
      expect(appnexusConfig.ortb2.user).to.deep.include(expectedOrtb2.user);
      // Check that existing config didn't get erased
      expect(appnexusConfig.ortb2.site).to.deep.include(bidderConfigInitial.ortb2.site);
      expect(appnexusConfig.ortb2.user).to.deep.include(bidderConfigInitial.ortb2.user);

      // Check that config for unsupported bidder remained unchanged
      const newConfig = config.getBidderConfig()[unsupportedBidder];
      expect(newConfig.ortb2.user.data).to.be.undefined;
      expect(newConfig.ortb2.site).to.not.have.any.keys('keywords')
      expect(newConfig).to.deep.include(bidderConfigInitial);
    })
  })
})
