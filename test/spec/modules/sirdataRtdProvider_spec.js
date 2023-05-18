import {addSegmentData, getSegmentsAndCategories, sirdataSubmodule} from 'modules/sirdataRtdProvider.js';
import {server} from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('sirdataRtdProvider', function () {
  describe('sirdataSubmodule', function () {
    it('successfully instantiates', function () {
      expect(sirdataSubmodule.init()).to.equal(true);
    });
  });

  describe('Add Segment Data', function () {
    it('adds segment data', function () {
      const config = {
        params: {
          setGptKeyValues: false,
          contextualMinRelevancyScore: 50,
          bidders: [{
            bidder: 'appnexus'
          }, {
            bidder: 'other'
          }]
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

      let data = {
        segments: [111111, 222222],
        contextual_categories: {'333333': 100}
      };

      addSegmentData({adUnits}, data, config, () => {
      });
      expect(adUnits[0].bids[0].params.keywords).to.have.deep.property('sd_rtd', ['111111', '222222', '333333']);
    });
  });

  describe('Get Segments And Categories', function () {
    it('gets data from async request and adds segment data', function () {
      const overrideAppnexus = function (adUnit, list, data, bid) {
        deepSetValue(bid, 'params.keywords.custom', list);
      }

      const config = {
        params: {
          setGptKeyValues: false,
          contextualMinRelevancyScore: 50,
          bidders: [{
            bidder: 'appnexus',
            customFunction: overrideAppnexus
          }, {
            bidder: 'smartadserver'
          }, {
            bidder: 'ix',
            sizeLimit: 1200,
          }, {
            bidder: 'rubicon',
          }, {
            bidder: 'proxistore',
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

      expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.have.deep.property('target', 'sd_rtd=111111;sd_rtd=222222;sd_rtd=333333;sd_rtd=444444;sd_rtd=555555;sd_rtd=666666');

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
});
