import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {spec, acceptPostMessage, getStorageData, setStorageData} from 'modules/trionBidAdapter.js';
import {deepClone} from 'src/utils.js';

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
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  },
  adUnitCode: 'adunit-code',
  sizes: [[300, 250], [300, 600]],
  bidId: 'test-bid-id',
  bidRequest: 'test-bid-request'
};

const TRION_BID_REQUEST = [TRION_BID];

const TRION_BIDDER_REQUEST = {
  'bidderCode': 'trion',
  'auctionId': '12345',
  'bidderRequestId': 'abc1234',
  'bids': TRION_BID_REQUEST
};

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

const getPublisherUrl = function () {
  var url = null;
  try {
    if (window.top == window) {
      url = window.location.href;
    } else {
      try {
        url = window.top.location.href;
      } catch (e) {
        url = document.referrer;
      }
    }
  } catch (e) {
  }
  return url
};

describe('Trion adapter tests', function () {
  let adapter;

  beforeEach(function () {
    // adapter = trionAdapter.createNew();
    sinon.stub(document.body, 'appendChild');
  });

  afterEach(function () {
    document.body.appendChild.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return true with correct params', function () {
      expect(spec.isBidRequestValid(TRION_BID)).to.equal(true);
    });

    it('should return false when params are missing', function () {
      TRION_BID.params = {};

      expect(spec.isBidRequestValid(TRION_BID)).to.equal(false);
      TRION_BID.params = {
        pubId: '1',
        sectionId: '2'
      };
    });

    it('should return false when pubId is missing', function () {
      TRION_BID.params = {
        sectionId: '2'
      };

      expect(spec.isBidRequestValid(TRION_BID)).to.equal(false);
      TRION_BID.params = {
        pubId: '1',
        sectionId: '2'
      };
    });

    it('should return false when sectionId is missing', function () {
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

  describe('buildRequests', function () {
    it('should return bids requests with empty params', function () {
      let bidRequests = spec.buildRequests([]);
      expect(bidRequests.length).to.equal(0);
    });

    it('should include the base bidrequest url', function () {
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);

      let bidUrl = bidRequests[0].url;
      expect(bidUrl).to.include(BID_REQUEST_BASE_URL);
    });

    it('should call buildRequests with the correct required params', function () {
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);

      let bidUrlParams = bidRequests[0].data;
      expect(bidUrlParams).to.include('pubId=1');
      expect(bidUrlParams).to.include('sectionId=2');
      expect(bidUrlParams).to.include('sizes=300x250,300x600');
      expect(bidUrlParams).to.include('vers=$prebid.version$');
    });

    it('should call buildRequests with the correct optional params', function () {
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
      let bidUrlParams = bidRequests[0].data;
      expect(bidUrlParams).to.include(getPublisherUrl());
    });

    // describe('webdriver', function () {
    //   let originalWD;

    //   beforeEach(function () {
    //     originalWD = window.navigator.webdriver;
    //   });

    //   afterEach(function () {
    //     window.navigator['__defineGetter__']('webdriver', function () {
    //       return originalWD;
    //     });
    //   });

    //   describe('is present', function () {
    //     beforeEach(function () {
    //       window.navigator['__defineGetter__']('webdriver', function () {
    //         return 1;
    //       });
    //     });

    //     it('when there is non human traffic', function () {
    //       let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
    //       let bidUrlParams = bidRequests[0].data;
    //       expect(bidUrlParams).to.include('tr_wd=1');
    //     });
    //   });

    //   describe('is not present', function () {
    //     beforeEach(function () {
    //       window.navigator['__defineGetter__']('webdriver', function () {
    //         return 0;
    //       });
    //     });

    //     it('when there is not non human traffic', function () {
    //       let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
    //       let bidUrlParams = bidRequests[0].data;
    //       expect(bidUrlParams).to.include('tr_wd=0');
    //     });
    //   });
    // });

    describe('document', function () {
      let originalHD;
      let originalVS;

      beforeEach(function () {
        originalHD = document.hidden;
        originalVS = document.visibilityState;
      });

      afterEach(function () {
        document['__defineGetter__']('hidden', function () {
          return originalHD;
        });
        document['__defineGetter__']('visibilityState', function () {
          return originalVS;
        });
      });

      describe('is visible', function () {
        beforeEach(function () {
          document['__defineGetter__']('hidden', function () {
            return 1;
          });
          document['__defineGetter__']('visibilityState', function () {
            return 'visible';
          });
        });

        it('should detect and send the document is visible', function () {
          let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
          let bidUrlParams = bidRequests[0].data;
          expect(bidUrlParams).to.include('tr_hd=1');
          expect(bidUrlParams).to.include('tr_vs=visible');
        });
      });

      describe('is hidden', function () {
        beforeEach(function () {
          document['__defineGetter__']('hidden', function () {
            return 1;
          });
          document['__defineGetter__']('visibilityState', function () {
            return 'hidden';
          });
        });

        it('should detect and send the document is hidden', function () {
          let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
          let bidUrlParams = bidRequests[0].data;
          expect(bidUrlParams).to.include('tr_hd=1');
          expect(bidUrlParams).to.include('tr_vs=hidden');
        });
      });
    });

    describe('should call buildRequests with correct consent params', function () {
      it('when gdpr is present', function () {
        TRION_BIDDER_REQUEST.gdprConsent = {
          consentString: 'test_gdpr_str',
          gdprApplies: true
        };
        let bidRequests = spec.buildRequests(TRION_BID_REQUEST, TRION_BIDDER_REQUEST);
        let bidUrlParams = bidRequests[0].data;
        let gcEncoded = encodeURIComponent(TRION_BIDDER_REQUEST.gdprConsent.consentString);
        expect(bidUrlParams).to.include('gdprc=' + gcEncoded);
        expect(bidUrlParams).to.include('gdpr=1');
        delete TRION_BIDDER_REQUEST.gdprConsent;
      });

      it('when us privacy is present', function () {
        TRION_BIDDER_REQUEST.uspConsent = '1YYY';
        let bidRequests = spec.buildRequests(TRION_BID_REQUEST, TRION_BIDDER_REQUEST);
        let bidUrlParams = bidRequests[0].data;
        let uspEncoded = encodeURIComponent(TRION_BIDDER_REQUEST.uspConsent);
        expect(bidUrlParams).to.include('usp=' + uspEncoded);
        delete TRION_BIDDER_REQUEST.uspConsent;
      });
    });
  });

  describe('interpretResponse', function () {
    it('when there is no response do not bid', function () {
      let response = spec.interpretResponse(null, {bidRequest: TRION_BID});
      expect(response).to.deep.equal([]);
    });

    it('when place bid is returned as false', function () {
      TRION_BID_RESPONSE.result.placeBid = false;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});

      expect(response).to.deep.equal([]);

      TRION_BID_RESPONSE.result.placeBid = true;
    });

    it('when no cpm is in the response', function () {
      TRION_BID_RESPONSE.result.cpm = 0;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response).to.deep.equal([]);
      TRION_BID_RESPONSE.result.cpm = 1;
    });

    it('when no ad is in the response', function () {
      TRION_BID_RESPONSE.result.ad = null;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response).to.deep.equal([]);
      TRION_BID_RESPONSE.result.ad = 'test';
    });

    it('height and width are appropriately set', function () {
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

    it('cpm is properly set and transformed to cents', function () {
      let bidCpm = 2;
      TRION_BID_RESPONSE.result.cpm = bidCpm * 100;
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(response[0].cpm).to.equal(bidCpm);
      TRION_BID_RESPONSE.result.cpm = 100;
    });

    it('advertiserDomains is included when sent by server', function () {
      TRION_BID_RESPONSE.result.adomain = ['test_adomain'];
      let response = spec.interpretResponse({body: TRION_BID_RESPONSE}, {bidRequest: TRION_BID});
      expect(Object.keys(response[0].meta)).to.include.members(['advertiserDomains']);
      expect(response[0].meta.advertiserDomains).to.deep.equal(['test_adomain']);
      delete TRION_BID_RESPONSE.result.adomain;
    });
  });

  describe('getUserSyncs', function () {
    const USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.html';
    const BASE_KEY = '_trion_';

    beforeEach(function () {
      delete window.TR_INT_T;
    });

    it('trion int is included in bid url', function () {
      window.TR_INT_T = 'test_user_sync';
      let userTag = encodeURIComponent(window.TR_INT_T);
      let bidRequests = spec.buildRequests(TRION_BID_REQUEST);
      let bidUrlParams = bidRequests[0].data;

      expect(bidUrlParams).to.include(userTag);
    });

    it('should register trion user script', function () {
      let syncs = spec.getUserSyncs({iframeEnabled: true});
      let pageUrl = getPublisherUrl();
      let pubId = 1;
      let sectionId = 2;
      let syncString = `?p=${pubId}&s=${sectionId}&u=${pageUrl}`;
      expect(syncs[0]).to.deep.equal({type: 'iframe', url: USER_SYNC_URL + syncString});
    });

    it('should register trion user script with gdpr params', function () {
      let gdprConsent = {
        consentString: 'test_gdpr_str',
        gdprApplies: true
      };
      let syncs = spec.getUserSyncs({iframeEnabled: true}, null, gdprConsent);
      let pageUrl = getPublisherUrl();
      let pubId = 1;
      let sectionId = 2;
      let gcEncoded = encodeURIComponent(gdprConsent.consentString);
      let syncString = `?p=${pubId}&s=${sectionId}&gc=${gcEncoded}&g=1&u=${pageUrl}`;
      expect(syncs[0]).to.deep.equal({type: 'iframe', url: USER_SYNC_URL + syncString});
    });

    it('should register trion user script with us privacy params', function () {
      let uspConsent = '1YYY';
      let syncs = spec.getUserSyncs({iframeEnabled: true}, null, null, uspConsent);
      let pageUrl = getPublisherUrl();
      let pubId = 1;
      let sectionId = 2;
      let uspEncoded = encodeURIComponent(uspConsent);
      let syncString = `?p=${pubId}&s=${sectionId}&up=${uspEncoded}&u=${pageUrl}`;
      expect(syncs[0]).to.deep.equal({type: 'iframe', url: USER_SYNC_URL + syncString});
    });

    it('should except posted messages from user sync script', function () {
      let testId = 'testId';
      let message = BASE_KEY + 'userId=' + testId;
      setStorageData(BASE_KEY + 'int_t', null);
      acceptPostMessage({data: message});
      let newKey = getStorageData(BASE_KEY + 'int_t');
      expect(newKey).to.equal(testId);
    });

    it('should not try to post messages not from trion', function () {
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
