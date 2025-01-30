import {config} from 'src/config.js';
import {deepAccess} from 'src/utils.js';
import * as agRTD from 'modules/airgridRtdProvider.js';
import {loadExternalScript} from '../../../src/adloader.js';

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
      expect(loadExternalScript.called).to.be.true
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
    it('sets bidder specific ORTB2 config', function () {
      getDataFromLocalStorageStub
        .withArgs(agRTD.AG_AUDIENCE_IDS_KEY)
        .returns(JSON.stringify(MATCHED_AUDIENCES));
      const audiences = agRTD.getMatchedAudiencesFromStorage();

      const bidderOrtb2 = {};

      agRTD.setAudiencesAsBidderOrtb2({ortb2Fragments: {bidder: bidderOrtb2}}, RTD_CONFIG.dataProviders[0], audiences);

      const bidders = RTD_CONFIG.dataProviders[0].params.bidders

      bidders.forEach((bidder) => {
        const ortb2 = bidderOrtb2[bidder];
        MATCHED_AUDIENCES.forEach((audience) => {
          expect(ortb2.user.data[0].segment.find(segment => segment.id === audience)).to.exist;
        })
      });
    });
  });
});
