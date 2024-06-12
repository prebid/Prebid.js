import {
  addSegmentData,
  getSegmentsAndCategories,
  getUidFromStorage,
  loadCustomFunction,
  mergeEuidsArrays,
  onDataDeletionRequest,
  onDocumentReady,
  postContentForSemanticAnalysis,
  removePII,
  sanitizeContent,
  setOrtb2,
  setUidInStorage,
  sirdataSubmodule
} from 'modules/sirdataRtdProvider.js';
import {expect} from 'chai';
import {deepSetValue} from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('sirdataRtdProvider', function () {
  describe('sirdata Submodule init', function () {
    it('exists', function () {
      expect(sirdataSubmodule.init).to.be.a('function');
    });
    it('successfully instantiates', function () {
      const moduleConfig = {
        params: {
          partnerId: 1,
          key: 1,
        }
      };
      expect(sirdataSubmodule.init(moduleConfig)).to.equal(true);
    });
    it('has the correct module name', function () {
      expect(sirdataSubmodule.name).to.equal('SirdataRTDModule');
    });
  });

  describe('Sanitize content', function () {
    it('removes PII from content', function () {
      let doc = document.implementation.createHTMLDocument('');
      let div = doc.createElement('div');
      div.className = 'test';
      div.setAttribute('test', 'test');
      div.textContent = 'My email is test@test.com, My bank account number is 123456789012, my SSN is 123-45-6789, and my credit card number is 1234 5678 9101 1121.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
      let div2 = doc.createElement('div');
      let div3 = doc.createElement('div');
      div3.innerText = 'hello';
      div2.appendChild(div3);
      div.appendChild(div2);
      doc.body.appendChild(div);
      const cleanedDom = removePII(doc.documentElement.innerHTML);
      const sanitizedDom = sanitizeContent(doc);
      expect(cleanedDom).to.equal('<head><title></title></head><body><div class="test" test="test">My email is , My bank account number is , my SSN is , and my credit card number is .Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.<div><div>hello</div></div></div></body>');
      expect(sanitizedDom.documentElement.innerHTML).to.equal('<head></head><body><div>My email is , My bank account number is , my SSN is , and my credit card number is .Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.<div><div>hello</div></div></div></body>');
    });
  });

  describe('setUidInStorage', function () {
    it('sets Id in Storage', function () {
      setUidInStorage('123456789');
      let val = getUidFromStorage();
      expect(val).to.deep.equal([{source: 'sddan.com', uids: [{id: '123456789', atype: 1}]}]);
    });
  });

  describe('mergeEuidsArrays', function () {
    it('merges Euids Arrays', function () {
      const object1 = [{source: 'sddan.com', uids: [{id: '123456789', atype: 1}]}];
      const object2 = [{source: 'sddan.com', uids: [{id: '987654321', atype: 1}]}];
      const object3 = mergeEuidsArrays(object1, object2);
      expect(object3).to.deep.equal([{source: 'sddan.com', uids: [{id: '123456789', atype: 1}, {id: '987654321', atype: 1}]}]);
    });
  });

  describe('onDocumentReady', function () {
    it('on Document Ready function execution', function () {
      const testString = '';
      const testFunction = function() { return true; };
      let resString;
      try {
        resString = onDocumentReady(testString);
      } catch (e) {}
      expect(resString).to.be.false;
      let resFunction = onDocumentReady(testFunction);
      expect(resFunction).to.be.true;
    });
  });

  describe('postContentForSemanticAnalysis', function () {
    it('gets content for analysis', function () {
      let res = postContentForSemanticAnalysis('1223456', 'https://www.sirdata.com/');
      let resEmpty = postContentForSemanticAnalysis('1223456', '');
      expect(res).to.be.true;
      expect(resEmpty).to.be.false;
    });
  });

  describe('loadCustomFunction', function () {
    it('load function', function () {
      const res = loadCustomFunction(function(...args) { return true; }, {}, {}, {}, {});
      expect(res).to.be.true;
    });
  });

  describe('onDataDeletionRequest', function () {
    it('destroy id', function () {
      const moduleConfig = {
        params: {
          partnerId: 1,
          key: 1,
        }
      };
      const res = onDataDeletionRequest(moduleConfig);
      expect(res).to.be.true;
    });
  });

  describe('Add Segment Data', function () {
    it('adds segment data', function () {
      const firstConfig = {
        params: {
          partnerId: 1,
          key: 1,
          setGptKeyValues: true,
          gptCurationId: 27449,
          contextualMinRelevancyScore: 50,
          actualUrl: 'https://www.sirdata.com/',
          cookieAccessGranted: true,
          bidders: []
        }
      };
      sirdataSubmodule.init(firstConfig);

      let adUnits = [
        {
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            }
          }, {
            bidder: 'other'
          }]
        }
      ];

      let firstReqBidsConfigObj = {
        adUnits: adUnits,
        ortb2Fragments: {
          global: {}
        }
      };

      let firstData = {
        segments: [111111, 222222],
        contextual_categories: {'333333': 100},
        'segtaxid': null,
        'cattaxid': null,
        'shared_taxonomy': {
          '27449': {
            'segments': [444444, 555555],
            'segtaxid': null,
            'cattaxid': null,
            'contextual_categories': {'666666': 100}
          }
        },
        'global_taxonomy': {
          '9998': {
            'segments': [123, 234],
            'segtaxid': 4,
            'cattaxid': 7,
            'contextual_categories': {'345': 100, '456': 100}
          },
          'sddan_id': '123456789',
          'post_content_token': '987654321'
        }
      }
      addSegmentData(firstReqBidsConfigObj, firstData, adUnits, function() { return true; });
      expect(firstReqBidsConfigObj.ortb2Fragments.global.user.data[0].ext.segtax).to.equal(4);
    });
  });

  describe('Get Segments And Categories', function () {
    it('gets data from async request and adds segment data', function () {
      const overrideAppnexus = function (adUnit, list, data, bid) {
        deepSetValue(bid, 'params.keywords.custom', list.segments.concat(list.categories));
      }

      const config = {
        params: {
          setGptKeyValues: false,
          contextualMinRelevancyScore: 50,
          bidders: [{
            bidder: 'appnexus',
            customFunction: overrideAppnexus,
            curationId: 27446
          }, {
            bidder: 'smartadserver',
            curationId: 27440
          }, {
            bidder: 'ix',
            sizeLimit: 1200,
            curationId: 27248
          }, {
            bidder: 'rubicon',
            curationId: 27452
          }, {
            bidder: 'proxistore',
            curationId: 27484
          }]
        }
      };
      sirdataSubmodule.init(config);

      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            }
          }, {
            bidder: 'smartadserver',
            params: {
              siteId: 207435,
              pageId: 896536,
              formatId: 62913
            }
          }, {
            bidder: 'proxistore',
            params: {website: 'demo.sirdata.com', language: 'fr'},
            adUnitCode: 'HALFPAGE_CENTER_LOADER',
            transactionId: '92ac333a-a569-4827-abf1-01fc9d19278a',
            sizes: [[300, 600]],
            mediaTypes: {
              banner: {
                filteredSizeConfig: [
                  {minViewPort: [1600, 0], sizes: [[300, 600]]},
                ],
                sizeConfig: [
                  {minViewPort: [0, 0], sizes: [[300, 600]]},
                  {minViewPort: [768, 0], sizes: [[300, 600]]},
                  {minViewPort: [1200, 0], sizes: [[300, 600]]},
                  {minViewPort: [1600, 0], sizes: [[300, 600]]},
                ],
                sizes: [[300, 600]],
              },
            },
            bidId: '190bab495bc5f6e',
            bidderRequestId: '18c0b0f0c91cd88',
            auctionId: '9bdd917b-908d-4d9f-8f2f-d443277a62fc',
            src: 'client',
            bidRequestsCount: 1,
            bidderRequestsCount: 1,
            bidderWinsCount: 0,
          }, {
            bidder: 'ix',
            params: {
              siteId: '12345',
              size: [300, 600]
            }
          }, {
            bidder: 'rubicon',
            params: {
              accountId: 14062,
              siteId: 70608,
              zoneId: 498816
            }
          }]
        }],
        ortb2Fragments: {
          global: {}
        }
      };

      let data = {
        'segments': [111111, 222222],
        'segtaxid': null,
        'cattaxid': null,
        'contextual_categories': {'333333': 100},
        'shared_taxonomy': {
          '27440': {
            'segments': [444444, 555555],
            'segtaxid': 552,
            'cattaxid': 553,
            'contextual_categories': {'666666': 100}
          },
          '27446': {
            'segments': [777777, 888888],
            'segtaxid': 552,
            'cattaxid': 553,
            'contextual_categories': {'999999': 100}
          }
        },
        'global_taxonomy': {
          '9998': {
            'segments': [123, 234],
            'segtaxid': 4,
            'cattaxid': 7,
            'contextual_categories': {'345': 100, '456': 100}
          }
        },
        'sddan_id': '123456789',
        'post_content_token': '987654321'
      };

      getSegmentsAndCategories(reqBidsConfigObj, () => {
      }, {}, {});

      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(data));

      expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].name).to.equal(
        'sirdata.com'
      );
      expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].segment).to.eql([
        {id: '345'},
        {id: '456'}
      ]);
      expect(reqBidsConfigObj.ortb2Fragments.global.site.content.data[0].ext.segtax).to.equal(7);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal(
        'sirdata.com'
      );
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.eql([
        {id: '123'},
        {id: '234'}
      ]);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].ext.segtax).to.equal(4);
    });
  });

  describe('Set ortb2 for bidder', function () {
    it('set ortb2 for a givent bidder', function () {
      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            }
          }]
        }],
        ortb2Fragments: {
          global: {}
        }
      };

      window.googletag = window.googletag || {};
      window.googletag.cmd = window.googletag.cmd || [];

      let test = setOrtb2(reqBidsConfigObj.ortb2Fragments, 'appnexus', 'user', []);
      expect(test).to.be.false;

      test = setOrtb2(reqBidsConfigObj.ortb2Fragments, 'appnexus', 'user', ['1']);
      expect(test).to.be.true;
    });
  });
});
