import { config } from 'src/config';
import {
  onePlusXSubmodule,
  segtaxes,
  extractConfig,
  buildOrtb2Updates,
  updateBidderConfig,
  setTargetingDataToConfig
} from 'modules/1plusXRtdProvider';

describe('1plusXRtdProvider', () => {
  // Fake server config
  let fakeServer;
  const fakeResponseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  const fakeResponse = {
    s: ['segment1', 'segment2', 'segment3'],
    t: ['targeting1', 'targeting2', 'targeting3']
  };

  // Bid request config
  const reqBidsConfigObj = {
    adUnits: [{
      bids: [
        { bidder: 'appnexus' }
      ]
    }]
  };

  // Bidder configs
  const bidderConfigInitial = {
    ortb2: {
      user: { keywords: '' },
      site: { ext: {} }
    }
  }
  const bidderConfigInitialWith1plusXUserData = {
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
  const bidderConfigInitialWith1plusXSiteContent = {
    ortb2: {
      user: { data: [] },
      site: {
        content: {
          data: [{
            name: '1plusX.com', segment: [{ id: 'initial' }], ext: { segtax: 525 }
          }]
        }
      },
    }
  }
  const bidderConfigInitialWithSiteContent = {
    ortb2: {
      user: { data: [] },
      site: {
        content: {
          data: [{ name: 'hello.world', segment: [{ id: 'initial' }] }]
        }
      },
    }
  }
  // Util functions
  const randomBidder = (len = 5) => Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, len);

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
        const config = { params: { customerId: 'test', bidders: ['appnexus'] } };
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
      // No bidders in config => error but still callback called
      {
        const callbackSpy = sinon.spy();
        const config = { customerId: 'test' }
        onePlusXSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, config);
        setTimeout(() => {
          expect(callbackSpy.calledOnce).to.be.true
        }, 100);
      }
    })
  })

  describe('extractConfig', () => {
    const customerId = 'test';
    const timeout = 1000;
    const bidders = ['appnexus'];

    it('Throws an error if no customerId is specified', () => {
      const moduleConfig = { params: { timeout, bidders } };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    })
    it('Throws an error if no bidder is specified', () => {
      const moduleConfig = { params: { customerId, timeout } };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    })
    it("Throws an error if there's no bidder in reqBidsConfigObj", () => {
      const moduleConfig = { params: { customerId, timeout, bidders } };
      const reqBidsConfigEmpty = { adUnits: [{ bids: [] }] };
      expect(() => extractConfig(moduleConfig, reqBidsConfigEmpty)).to.throw();
    })
    it('Returns an object containing the parameters specified', () => {
      const moduleConfig = { params: { customerId, timeout, bidders } };
      const expectedKeys = ['customerId', 'timeout', 'bidders']
      const extractedConfig = extractConfig(moduleConfig, reqBidsConfigObj);
      expect(extractedConfig).to.be.an('object').and.to.have.all.keys(expectedKeys);
      expect(extractedConfig.customerId).to.equal(customerId);
      expect(extractedConfig.timeout).to.equal(timeout);
      expect(extractedConfig.bidders).to.deep.equal(bidders);
    })
    /* 1plusX RTD module may only use bidders that are both specified in :
        - the bid request configuration
        - AND in the 1plusX RTD module configuration
      Below 2 tests are enforcing those rules
    */
    it('Returns the intersection of bidders found in bid request config & module config', () => {
      const bidders = ['appnexus', 'rubicon'];
      const moduleConfig = { params: { customerId, timeout, bidders } };
      const { bidders: extractedBidders } = extractConfig(moduleConfig, reqBidsConfigObj);
      expect(extractedBidders).to.be.an('array').and.to.have.length(1); 7
      expect(extractedBidders[0]).to.equal('appnexus');
    })
    it('Throws an error if no bidder can be used by the module', () => {
      const bidders = ['rubicon'];
      const moduleConfig = { params: { customerId, timeout, bidders } };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    })
  })

  describe('buildOrtb2Updates', () => {
    it('fills site.content.data & user.data in the ortb2 config', () => {
      const rtdData = { segments: fakeResponse.s, topics: fakeResponse.t };
      const ortb2Updates = buildOrtb2Updates(rtdData, randomBidder());

      const expectedOutput = {
        siteContentData: {
          name: '1plusX.com',
          segment: rtdData.topics.map((topicId) => ({ id: topicId })),
          ext: { segtax: segtaxes.CONTENT }
        },
        userData: {
          name: '1plusX.com',
          segment: rtdData.segments.map((segmentId) => ({ id: segmentId }))
        }
      }
      expect([ortb2Updates]).to.deep.include.members([expectedOutput]);
    });
    it('fills site.keywords in the ortb2 config (appnexus specific)', () => {
      const rtdData = { segments: fakeResponse.s, topics: fakeResponse.t };
      const ortb2Updates = buildOrtb2Updates(rtdData, 'appnexus');

      const expectedOutput = {
        site: {
          keywords: rtdData.topics.join(','),
        }
      }
      expect([ortb2Updates]).to.deep.include.members([expectedOutput]);
    });

    it('defaults to empty array if no segment is given', () => {
      const rtdData = { topics: fakeResponse.t };
      const ortb2Updates = buildOrtb2Updates(rtdData, randomBidder());

      const expectedOutput = {
        siteContentData: {
          name: '1plusX.com',
          segment: rtdData.topics.map((topicId) => ({ id: topicId })),
          ext: { segtax: segtaxes.CONTENT }
        },
        userData: {
          name: '1plusX.com',
          segment: []
        }
      }
      expect(ortb2Updates).to.deep.include(expectedOutput);
    })

    it('defaults to empty array if no topic is given', () => {
      const rtdData = { segments: fakeResponse.s };
      const ortb2Updates = buildOrtb2Updates(rtdData, randomBidder());

      const expectedOutput = {
        siteContentData: {
          name: '1plusX.com',
          segment: [],
          ext: { segtax: segtaxes.CONTENT }
        },
        userData: {
          name: '1plusX.com',
          segment: rtdData.segments.map((segmentId) => ({ id: segmentId }))
        }
      }
      expect(ortb2Updates).to.deep.include(expectedOutput);
    })
    it('defaults to empty string if no topic is given (appnexus specific)', () => {
      const rtdData = { segments: fakeResponse.s };
      const ortb2Updates = buildOrtb2Updates(rtdData, 'appnexus');

      const expectedOutput = {
        site: {
          keywords: '',
        }
      }
      expect(ortb2Updates).to.deep.include(expectedOutput);
    })
  })

  describe('updateBidderConfig', () => {
    const ortb2UpdatesAppNexus = {
      site: {
        keywords: fakeResponse.t.join(','),
      },
      userData: {
        name: '1plusX.com',
        segment: fakeResponse.s.map((segmentId) => ({ id: segmentId }))
      }
    }
    const ortb2Updates = {
      siteContentData: {
        name: '1plusX.com',
        segment: fakeResponse.t.map((topicId) => ({ id: topicId })),
        ext: { segtax: segtaxes.CONTENT }
      },
      userData: {
        name: '1plusX.com',
        segment: fakeResponse.s.map((segmentId) => ({ id: segmentId }))
      }
    }

    it('merges fetched data in bidderConfig for configured bidders', () => {
      const bidder = randomBidder();
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitial
      });
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.site.content.data).to.deep.include(ortb2Updates.siteContentData);
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      // Check that existing config didn't get erased
      expect(newBidderConfig.ortb2.site).to.deep.include(bidderConfigInitial.ortb2.site);
      expect(newBidderConfig.ortb2.user).to.deep.include(bidderConfigInitial.ortb2.user);
    })

    it('merges fetched data in bidderConfig for configured bidders (appnexus specific)', () => {
      const bidder = 'appnexus';
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitial
      });
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2UpdatesAppNexus, config.getBidderConfig());

      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.site).to.deep.include(ortb2UpdatesAppNexus.site);
      // Check that existing config didn't get erased
      expect(newBidderConfig.ortb2.site).to.deep.include(bidderConfigInitial.ortb2.site);
      expect(newBidderConfig.ortb2.user).to.deep.include(bidderConfigInitial.ortb2.user);
    })

    it('overwrites an existing 1plus.com entry in ortb2.user.data', () => {
      const bidder = randomBidder();
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitialWith1plusXUserData
      });
      // Save previous user.data entry
      const previousUserData = bidderConfigInitialWith1plusXUserData.ortb2.user.data[0];
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.ortb2.user.data).not.to.include(previousUserData);
    })
    it("doesn't overwrite entries in ortb2.user.data that aren't 1plusx.com", () => {
      const bidder = randomBidder();
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitialWithUserData
      });
      // Save previous user.data entry
      const previousUserData = bidderConfigInitialWithUserData.ortb2.user.data[0];
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.ortb2.user.data).to.deep.include(previousUserData);
    })

    it('overwrites an existing 1plus.com entry in ortb2.site.content.data', () => {
      const bidder = randomBidder();
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitialWith1plusXSiteContent
      });
      // Save previous user.data entry
      const previousSiteContent = bidderConfigInitialWith1plusXSiteContent.ortb2.site.content.data[0];
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.site.content.data).to.deep.include(ortb2Updates.siteContentData);
      expect(newBidderConfig.ortb2.site.content.data).not.to.include(previousSiteContent);
    })
    it("doesn't overwrite entries in ortb2.site.content.data that aren't 1plusx.com", () => {
      const bidder = randomBidder();
      // Set initial config
      config.setBidderConfig({
        bidders: [bidder],
        config: bidderConfigInitialWithSiteContent
      });
      // Save previous user.data entry
      const previousSiteContent = bidderConfigInitialWithSiteContent.ortb2.site.content.data[0];
      // Call submodule's setBidderConfig
      const newBidderConfig = updateBidderConfig(bidder, ortb2Updates, config.getBidderConfig());
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.ortb2.site.content.data).to.deep.include(ortb2Updates.siteContentData);
      expect(newBidderConfig.ortb2.site.content.data).to.deep.include(previousSiteContent);
    })
  })

  describe('setTargetingDataToConfig', () => {
    const expectedKeywords = fakeResponse.t.join(',');
    const expectedSiteContentObj = {
      data: [{
        name: '1plusX.com',
        segment: fakeResponse.t.map((topicId) => ({ id: topicId })),
        ext: { segtax: segtaxes.CONTENT }
      }]
    }
    const expectedUserObj = {
      data: [{
        name: '1plusX.com',
        segment: fakeResponse.s.map((segmentId) => ({ id: segmentId }))
      }]
    }
    const expectedOrtb2 = {
      appnexus: {
        site: { keywords: expectedKeywords }
      },
      rubicon: {
        site: { content: expectedSiteContentObj },
        user: expectedUserObj
      }
    }

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
        // Check that we got what we expect
        const expectedConfErr = (prop) => `New config for ${bidder} doesn't comply with expected at ${prop}`;
        expect(newConfig.ortb2.site, expectedConfErr('site')).to.deep.include(expectedOrtb2[bidder].site);
        if (expectedOrtb2[bidder].user) {
          expect(newConfig.ortb2.user, expectedConfErr('user')).to.deep.include(expectedOrtb2[bidder].user);
        }
        // Check that existing config didn't get erased
        const existingConfErr = (prop) => `Existing config for ${bidder} got unlawfully overwritten at ${prop}`;
        expect(newConfig.ortb2.site, existingConfErr('site')).to.deep.include(bidderConfigInitial.ortb2.site);
        expect(newConfig.ortb2.user, existingConfErr('user')).to.deep.include(bidderConfigInitial.ortb2.user);
      }
    })
  })
})
