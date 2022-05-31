import { config } from 'src/config.js';
import { deepAccess } from 'src/utils.js';
import { getAdUnits } from '../../fixtures/fixtures.js';
import * as agRTD from 'modules/airgridRtdProvider.js';

const MATCHED_AUDIENCES = ['travel', 'sport'];
const RTD_CONFIG = {
  auctionDelay: 250,
  dataProviders: [
    {
      name: 'airgrid',
      waitForIt: true,
      params: {
        apiKey: 'key123',
        accountId: 'sdk',
        publisherId: 'pub123',
        bidders: ['pubmatic'],
      },
    },
  ],
};

describe('airgrid RTD Submodule', function () {
  let getDataFromLocalStorageStub;

  beforeEach(function () {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(
      agRTD.storage,
      'getDataFromLocalStorage'
    );
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  describe('Initialise module', function () {
    it('should initalise and return true', function () {
      expect(agRTD.airgridSubmodule.init(RTD_CONFIG.dataProviders[0])).to.equal(
        true
      );
    });

    it('should attach script to DOM with correct config', function () {
      agRTD.attachScriptTagToDOM(RTD_CONFIG);
      expect(window.edktInitializor.invoked).to.be.true;
      expect(window.edktInitializor.apiKey).to.equal(
        RTD_CONFIG.dataProviders[0].params.apiKey
      );
      expect(window.edktInitializor.accountId).to.equal(
        RTD_CONFIG.dataProviders[0].params.accountId
      );
      expect(window.edktInitializor.publisherId).to.equal(
        RTD_CONFIG.dataProviders[0].params.publisherId
      );
    });
  });

  describe('Get matched audiences', function () {
    it('gets matched audiences from local storage', function () {
      getDataFromLocalStorageStub
        .withArgs(agRTD.AG_AUDIENCE_IDS_KEY)
        .returns(JSON.stringify(MATCHED_AUDIENCES));

      const audiences = agRTD.getMatchedAudiencesFromStorage();
      expect(audiences).to.have.members(MATCHED_AUDIENCES);
    });
  });

  describe('Add matched audiences', function () {
    it('merges matched audiences on appnexus AdUnits', function () {
      const adUnits = getAdUnits();
      getDataFromLocalStorageStub
        .withArgs(agRTD.AG_AUDIENCE_IDS_KEY)
        .returns(JSON.stringify(MATCHED_AUDIENCES));
      agRTD.passAudiencesToBidders({ adUnits }, () => {}, {}, {});

      adUnits.forEach((adUnit) => {
        adUnit.bids.forEach((bid) => {
          const { bidder, params } = bid;
          if (bidder === 'appnexus') {
            expect(deepAccess(params, 'keywords.perid')).to.eql(
              MATCHED_AUDIENCES
            );
          }
        });
      });
    });

    it('does not merge audiences on appnexus adunits, since none are matched', function () {
      const adUnits = getAdUnits();
      getDataFromLocalStorageStub
        .withArgs(agRTD.AG_AUDIENCE_IDS_KEY)
        .returns(undefined);
      agRTD.passAudiencesToBidders({ adUnits }, () => {}, {}, {});

      adUnits.forEach((adUnit) => {
        adUnit.bids.forEach((bid) => {
          const { bidder, params } = bid;
          if (bidder === 'appnexus') {
            expect(deepAccess(params, 'keywords.perid')).to.be.undefined;
          }
        });
      });
    });

    it('sets bidder specific ORTB2 config', function () {
      getDataFromLocalStorageStub
        .withArgs(agRTD.AG_AUDIENCE_IDS_KEY)
        .returns(JSON.stringify(MATCHED_AUDIENCES));
      const audiences = agRTD.getMatchedAudiencesFromStorage();
      const bidderOrtb2 = agRTD.getAudiencesAsBidderOrtb2(RTD_CONFIG.dataProviders[0], audiences);

      const bidders = RTD_CONFIG.dataProviders[0].params.bidders;
      Object.keys(bidderOrtb2).forEach((bidder) => {
        if (bidders.indexOf(bidder) === -1) return;
        expect(deepAccess(bidderOrtb2[bidder], 'ortb2.user.ext.data.airgrid')).to.eql(MATCHED_AUDIENCES);
      });
    });

    it('sets audiences using appnexus auction level keywords', function () {
      getDataFromLocalStorageStub
        .withArgs(agRTD.AG_AUDIENCE_IDS_KEY)
        .returns(JSON.stringify(MATCHED_AUDIENCES));
      const audiences = agRTD.getMatchedAudiencesFromStorage();
      agRTD.setAudiencesUsingAppNexusAuctionKeywords(audiences);

      const bidderConfig = config.getConfig();
      expect(deepAccess(bidderConfig, 'appnexusAuctionKeywords.perid')).to.eql(
        MATCHED_AUDIENCES
      );
    });
  });
});
