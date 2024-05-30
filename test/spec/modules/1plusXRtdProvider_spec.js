import assert from 'assert';
import {config} from 'src/config';
import {
  buildOrtb2Updates,
  extractConfig,
  extractConsent,
  extractFpid,
  getPapiUrl,
  onePlusXSubmodule,
  segtaxes,
  setTargetingDataToConfig,
  updateBidderConfig,
} from 'modules/1plusXRtdProvider';
import {deepClone} from '../../../src/utils.js';
import { STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE } from 'src/storageManager.js';

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
    user: { keywords: '' },
    site: { ext: {} }
  }
  const bidderConfigInitialWith1plusXUserData = {
    user: {
      data: [{ name: '1plusX.com', segment: [{ id: 'initial' }] }]
    },
    site: { content: { data: [] } }
  }
  const bidderConfigInitialWithUserData = {
    user: {
      data: [{ name: 'hello.world', segment: [{ id: 'initial' }] }]
    },
    site: { content: { data: [] } }
  }
  const bidderConfigInitialWith1plusXSiteContent = {
    user: { data: [] },
    site: {
      content: {
        data: [{
          name: '1plusX.com', segment: [{ id: 'initial' }], ext: { segtax: 525 }
        }]
      }
    }
  }
  const bidderConfigInitialWithSiteContent = {
    user: { data: [] },
    site: {
      content: {
        data: [{ name: 'hello.world', segment: [{ id: 'initial' }] }]
      }
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
    const fpidStorageType = STORAGE_TYPE_LOCALSTORAGE

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
      const moduleConfig = { params: { customerId, timeout, bidders, fpidStorageType } };
      const expectedKeys = ['customerId', 'timeout', 'bidders', 'fpidStorageType']
      const extractedConfig = extractConfig(moduleConfig, reqBidsConfigObj);
      expect(extractedConfig).to.be.an('object').and.to.have.all.keys(expectedKeys);
      expect(extractedConfig.customerId).to.equal(customerId);
      expect(extractedConfig.timeout).to.equal(timeout);
      expect(extractedConfig.bidders).to.deep.equal(bidders);
      expect(extractedConfig.fpidStorageType).to.equal(fpidStorageType)
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
    it('Throws an error if wrong fpidStorageType is provided', () => {
      const moduleConfig = { params: { customerId, timeout, bidders, fpidStorageType: 'bogus' } };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj).to.throw())
    })
    it('Defaults fpidStorageType to localStorage', () => {
      const moduleConfig = { params: { customerId, timeout, bidders } };
      const extractedConfig = extractConfig(moduleConfig, reqBidsConfigObj);
      expect(extractedConfig.fpidStorageType).to.equal(STORAGE_TYPE_LOCALSTORAGE)
    })
    it('Correctly instantiates fpidStorageType to cookie store if instructed', () => {
      const moduleConfig = { params: { customerId, timeout, bidders, fpidStorageType: STORAGE_TYPE_COOKIES } };
      const extractedConfig = extractConfig(moduleConfig, reqBidsConfigObj);
      expect(extractedConfig.fpidStorageType).to.equal(STORAGE_TYPE_COOKIES)
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
          segment: rtdData.segments.map((segmentId) => ({ id: segmentId })),
          ext: { segtax: segtaxes.AUDIENCE }
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
          segment: [],
          ext: { segtax: segtaxes.AUDIENCE }
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
          segment: rtdData.segments.map((segmentId) => ({ id: segmentId })),
          ext: { segtax: segtaxes.AUDIENCE }
        },
      }
      expect(ortb2Updates, `${JSON.stringify(ortb2Updates, null, 2)}`).to.deep.include(expectedOutput);
    })
  })

  describe('extractConsent', () => {
    it('extracts consent strings correctly if given', () => {
      const consent = {
        gdpr: {
          gdprApplies: 1,
          consentString: 'myConsent'
        }
      }
      const output = extractConsent(consent)
      const expectedOutput = {
        gdpr_applies: 1,
        consent_string: 'myConsent'
      }
      expect(expectedOutput).to.deep.include(output)
      expect(output).to.deep.include(expectedOutput)
    })

    it('extracts null if consent object is empty', () => {
      const consent1 = {}
      expect(extractConsent(consent1)).to.equal(null)
    })

    it('throws an error if the consent is malformed', () => {
      const consent1 = {
        gdpr: {
          consentString: 'myConsent'
        }
      }
      const consent2 = {
        gdpr: {
          gdprApplies: 1,
          consentString: 3
        }
      }
      const consent3 = {
        gdpr: {
          gdprApplies: 'yes',
          consentString: 'myConsent'
        }
      }
      const consent4 = {
        gdpr: {}
      }

      for (const consent of [consent1, consent2, consent3, consent4]) {
        var failed = false;
        try {
          extractConsent(consent)
        } catch (e) {
          failed = true;
        } finally {
          assert(failed, 'Should be throwing an exception')
        }
      }
    })
  })

  describe('getPapiUrl', () => {
    const customer = 'acme'
    const consent = {
      gdpr: {
        gdprApplies: 1,
        consentString: 'myConsent'
      }
    }

    it('correctly builds URLs if gdpr parameters are present', () => {
      const url1 = getPapiUrl(customer);
      const url2 = getPapiUrl(customer, extractConsent(consent));
      expect(['&consent_string=myConsent&gdpr_applies=1', '&gdpr_applies=1&consent_string=myConsent']).to.contain(url2.replace(url1, ''));
    })

    it('correctly builds URLs if fpid parameters are present', () => {
      const url1 = getPapiUrl(customer);
      const url2 = getPapiUrl(customer, {}, 'my_first_party_id');
      expect(url2.replace(url1, '')).to.equal('&fpid=my_first_party_id');
    })
  })

  describe('updateBidderConfig', () => {
    const ortb2Updates = {
      siteContentData: {
        name: '1plusX.com',
        segment: fakeResponse.t.map((topicId) => ({ id: topicId })),
        ext: { segtax: segtaxes.CONTENT }
      },
      userData: {
        name: '1plusX.com',
        segment: fakeResponse.s.map((segmentId) => ({ id: segmentId }))
      },
    }

    it('merges fetched data in bidderConfig for configured bidders', () => {
      // Set initial config
      const bidder = randomBidder();
      const ortb2Fragments = { [bidder]: deepClone(bidderConfigInitial) }
      // Call submodule's setBidderConfig
      updateBidderConfig(bidder, ortb2Updates, ortb2Fragments);
      const newBidderConfig = ortb2Fragments[bidder];
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null.and.not.to.be.undefined;
      expect(newBidderConfig.user).not.to.be.null.and.not.to.be.undefined;
      expect(newBidderConfig.site).not.to.be.null.and.not.to.be.undefined;
      expect(newBidderConfig.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.site.content.data).to.deep.include(ortb2Updates.siteContentData);
      // Check that existing config didn't get erased
      expect(newBidderConfig.site).to.deep.include(bidderConfigInitial.site);
      expect(newBidderConfig.user).to.deep.include(bidderConfigInitial.user);
    })

    it('overwrites an existing 1plus.com entry in ortb2.user.data', () => {
      // Set initial config
      const bidder = randomBidder();
      const ortb2Fragments = { [bidder]: { ...bidderConfigInitialWith1plusXUserData } }
      // Save previous user.data entry
      const previousUserData = bidderConfigInitialWith1plusXUserData.user.data[0];
      // Call submodule's setBidderConfig
      updateBidderConfig(bidder, ortb2Updates, ortb2Fragments);
      const newBidderConfig = ortb2Fragments[bidder];
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.site).not.to.be.null;
      expect(newBidderConfig.user).not.to.be.null;
      expect(newBidderConfig.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.user.data).not.to.include(previousUserData);
    })
    it("doesn't overwrite entries in ortb2.user.data that aren't 1plusx.com", () => {
      // Set initial config
      const bidder = randomBidder();
      const ortb2Fragments = { [bidder]: { ...bidderConfigInitialWithUserData } }
      // Save previous user.data entry
      const previousUserData = bidderConfigInitialWithUserData.user.data[0];
      // Call submodule's setBidderConfig
      updateBidderConfig(bidder, ortb2Updates, ortb2Fragments);
      const newBidderConfig = ortb2Fragments[bidder];
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.site).not.to.be.null;
      expect(newBidderConfig.user).not.to.be.null;
      expect(newBidderConfig.user.data).to.deep.include(ortb2Updates.userData);
      expect(newBidderConfig.user.data).to.deep.include(previousUserData);
    })

    it('overwrites an existing 1plus.com entry in ortb2.site.content.data', () => {
      // Set initial config
      const bidder = randomBidder();
      const ortb2Fragments = { [bidder]: { ...bidderConfigInitialWith1plusXSiteContent } }
      // Save previous user.data entry
      const previousSiteContent = bidderConfigInitialWith1plusXSiteContent.site.content.data[0];
      // Call submodule's setBidderConfig
      updateBidderConfig(bidder, ortb2Updates, ortb2Fragments);
      const newBidderConfig = ortb2Fragments[bidder];
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.site).not.to.be.null;
      expect(newBidderConfig.user).not.to.be.null;
      expect(newBidderConfig.site.content.data).to.deep.include(ortb2Updates.siteContentData);
      expect(newBidderConfig.site.content.data).not.to.include(previousSiteContent);
    })
    it("doesn't overwrite entries in ortb2.site.content.data that aren't 1plusx.com", () => {
      // Set initial config
      const bidder = randomBidder();
      const ortb2Fragments = { [bidder]: { ...bidderConfigInitialWithSiteContent } }
      // Save previous user.data entry
      const previousSiteContent = bidderConfigInitialWithSiteContent.site.content.data[0];
      // Call submodule's setBidderConfig
      updateBidderConfig(bidder, ortb2Updates, ortb2Fragments);
      const newBidderConfig = ortb2Fragments[bidder];
      // Check that the targeting data has been set in the config
      expect(newBidderConfig).not.to.be.null;
      expect(newBidderConfig.site).not.to.be.null;
      expect(newBidderConfig.user).not.to.be.null;
      expect(newBidderConfig.site.content.data).to.deep.include(ortb2Updates.siteContentData);
      expect(newBidderConfig.site.content.data).to.deep.include(previousSiteContent);
    })
  })

  describe('setTargetingDataToConfig', () => {
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
        segment: fakeResponse.s.map((segmentId) => ({ id: segmentId })),
        ext: { segtax: segtaxes.AUDIENCE }
      }]
    }
    const expectedOrtb2 = {
      appnexus: {
        site: { content: expectedSiteContentObj },
        user: expectedUserObj
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
      const biddersOrtb2 = config.getBidderConfig();
      // call setTargetingDataToConfig
      setTargetingDataToConfig(fakeResponse, { bidders, biddersOrtb2 });

      // Check that the targeting data has been set in both configs
      for (const bidder of bidders) {
        const newConfig = config.getBidderConfig()[bidder];
        // Check that we got what we expect
        const expectedConfErr = (prop) => `New config for ${bidder} doesn't comply with expected at ${prop}`;
        expect(newConfig.site, expectedConfErr('site')).to.deep.include(expectedOrtb2[bidder].site);
        if (expectedOrtb2[bidder].user) {
          expect(newConfig.user, expectedConfErr('user')).to.deep.include(expectedOrtb2[bidder].user);
        }
        // Check that existing config didn't get erased
        const existingConfErr = (prop) => `Existing config for ${bidder} got unlawfully overwritten at ${prop}`;
        expect(newConfig.site, existingConfErr('site')).to.deep.include(bidderConfigInitial.site);
        expect(newConfig.user, existingConfErr('user')).to.deep.include(bidderConfigInitial.user);
      }
    })
  })
})
