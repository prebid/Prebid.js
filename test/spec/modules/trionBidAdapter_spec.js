import {expect} from 'chai';
import * as utils from 'src/utils';
import {spec, acceptPostMessage, getStorageData, setStorageData} from 'modules/trionBidAdapter';
const CONSTANTS = require('src/constants.json');
const adloader = require('src/adloader');

const PLACEMENT_CODE = 'ad-tag';
const BID_REQUEST_BASE_URL = 'https://in-appadvertising.com/api/bidRequest';

const TRION_BID = {
  bidder: 'trion',
  params: {
    pubId: '1',
    sectionId: '2'
  },
  adUnitCode: 'adunit-code',
  sizes: [[300, 250], [300, 600]],
  bidId: 'test-bid-id',
  bidRequest: 'test-bid-request'
};

const TRION_BID_REQUEST = [TRION_BID];

const TRION_BID_RESPONSE = {
  bidId: 'test-bid-id',
  sizes: [[300, 250], [300, 600]],
  result: {
    cpm: 100,
    placeBid: true,
    height: '250',
    width: '300',
    ad: 'test',
    msg: 'response messaging'
  }

};

describe('Trion adapter tests', () => {
  let adapter;

  beforeEach(() => {
    // adapter = trionAdapter.createNew();
    sinon.stub(document.body, 'appendChild');
  });

  afterEach(() => document.body.appendChild.restore());

  describe('isBidRequestValid', () => {
    it('should return true with correct params', () => {
      expect(spec.isBidRequestValid(TRION_BID)).to.equal(true);
    });

    it('should return false when params are missing', () => {
      TRION_BID.params = {};

      expect(spec.isBidRequestValid(TRION_BID)).to.equal(false);
      TRION_BID.params = {
        pubId: '1',
        sectionId: '2'
      };
    });

    it('should return false when pubId is missing', () => {
      TRION_BID.params = {
        sectionId: '2'
      };

      expect(spec.isBidRequestValid(TRION_BID)).to.equal(false);
      TRION_BID.params = {
        pubId: '1',
        sectionId: '2'
      };
    });

    it('should return false when sectionId is missing', () => {
      TRION_BID.params = {
        pubId: '1'
      };

      expect(spec.isBidRequestValid(TRION_BID)).to.equal(false);
      TRION_BID.params = {
        pubId: '1',
        sectionId: '2'
      };
    });
  });

  describe('buildRequests', () => {
    it('should return bids requests with empty params', () => {
      let bidRequests = spec.buildRequests([]);
      expect(bidRequests.length).to.equal(0);
    });

    it('should include the base bidrequest url', () => {
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);

      let bidUrl = bidRequests[0].url;
      expect(bidUrl).to.include(BID_REQUEST_BASE_URL);
    });

    it('should call buildRequests with the correct required params', () => {
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);

      let bidUrlParams = bidRequests[0].data;
      expect(bidUrlParams).to.include('pubId=1');
      expect(bidUrlParams).to.include('sectionId=2');
      expect(bidUrlParams).to.include('sizes=300x250,300x600');
    });

    it('should call buildRequests with the correct optional params', () => {
      let params = TRION_BID_REQUEST[0].params;
      params.re = 1;
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);

      let bidUrlParams = bidRequests[0].data;
      expect(bidUrlParams).to.include('re=1');
      expect(bidUrlParams).to.include(utils.getTopWindowUrl());
      delete params.re;
    });
  });

  describe('interpretResponse', () => {
    it('when there is no response do not bid', () => {
      let response = spec.interpretResponse(null, {bidRequest: TRION_BID});
      expect(response).to.deep.equal([]);
    });

    it('when place bid is returned as false', () => {
      TRION_BID_RESPONSE.result.placeBid = false;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});

      expect(response).to.deep.equal([]);

      TRION_BID_RESPONSE.result.placeBid = true;
    });

    it('when no cpm is in the response', () => {
      TRION_BID_RESPONSE.result.cpm = 0;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response).to.deep.equal([]);
      TRION_BID_RESPONSE.result.cpm = 1;
    });

    it('when no ad is in the response', () => {
      TRION_BID_RESPONSE.result.ad = null;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response).to.deep.equal([]);
      TRION_BID_RESPONSE.result.ad = 'test';
    });

    it('height and width are appropriately set', () => {
      let bidWidth = '1';
      let bidHeight = '2';
      TRION_BID_RESPONSE.result.width = bidWidth;
      TRION_BID_RESPONSE.result.height = bidHeight;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response[0].width).to.equal(bidWidth);
      expect(response[0].height).to.equal(bidHeight);
      TRION_BID_RESPONSE.result.width = '300';
      TRION_BID_RESPONSE.result.height = '250';
    });

    it('cpm is properly set and transformed to cents', () => {
      let bidCpm = 2;
      TRION_BID_RESPONSE.result.cpm = bidCpm * 100;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response[0].cpm).to.equal(bidCpm);
      TRION_BID_RESPONSE.result.cpm = 100;
    });
  });

  describe('getUserSyncs', () => {
    const USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.html';
    const BASE_KEY = '_trion_';

    beforeEach(() => {
      delete window.TR_INT_T;
    });

    it('trion int is included in bid url', () => {
      window.TR_INT_T = 'test_user_sync';
      let userTag = encodeURIComponent(window.TR_INT_T);
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
      let bidUrlParams = bidRequests[0].data;

      expect(bidUrlParams).to.include(userTag);
    });

    it('should register trion user script', () => {
      let syncs = spec.getUserSyncs({iframeEnabled: true});
      let url = utils.getTopWindowUrl();
      let pubId = 1;
      let sectionId = 2;
      let syncString = `?p=${pubId}&s=${sectionId}&u=${url}`;
      expect(syncs[0]).to.deep.equal({type: 'iframe', url: USER_SYNC_URL + syncString});
    });

    it('should except posted messages from user sync script', () => {
      let testId = 'testId';
      let message = BASE_KEY + 'userId=' + testId;
      setStorageData(BASE_KEY + 'int_t', null);
      acceptPostMessage({data: message});
      let newKey = getStorageData(BASE_KEY + 'int_t');
      expect(newKey).to.equal(testId);
    });

    it('should not try to post messages not from trion', () => {
      let testId = 'testId';
      let badId = 'badId';
      let message = 'Not Trion: userId=' + testId;
      setStorageData(BASE_KEY + 'int_t', badId);
      acceptPostMessage({data: message});
      let newKey = getStorageData(BASE_KEY + 'int_t');
      expect(newKey).to.equal(badId);
    });
  });
});
