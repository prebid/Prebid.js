import {addSegmentData, getSegmentsAndCategories, sirdataSubmodule, setOrtb2} from 'modules/sirdataRtdProvider.js';
import {server} from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('sirdataRtdProvider', function () {
  describe('sirdataSubmodule', function () {
    it('exists', function () {
      expect(sirdataSubmodule.init).to.be.a('function');
    });
    it('successfully instantiates', function () {
      expect(sirdataSubmodule.init()).to.equal(true);
    });
    it('has the correct module name', function () {
      expect(sirdataSubmodule.name).to.equal('SirdataRTDModule');
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
          bidders: []
        }
      };

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
          }
        }
      };

      addSegmentData(firstReqBidsConfigObj, firstData, firstConfig, () => {
      });

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
        }
      };

      getSegmentsAndCategories(reqBidsConfigObj, () => {
      }, config, {});

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
      const config = {
        params: {
          setGptKeyValues: false,
          contextualMinRelevancyScore: 50,
          bidders: [{
            bidder: 'appnexus',
          }]
        }
      };

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

      let data = {
        'segments': [111111, 222222],
        'segtaxid': null,
        'cattaxid': null,
        'contextual_categories': {'333333': 100},
        'shared_taxonomy': {
          '27440': {
            'segments': [444444, 555555],
            'segtaxid': null,
            'cattaxid': null,
            'contextual_categories': {'666666': 100}
          }
        },
        'global_taxonomy': {}
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
