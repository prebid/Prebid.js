import { addSegmentData, getSegmentsAndCategories, sirdataSubmodule } from 'modules/sirdataRtdProvider.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('sirdataRtdProvider', function() {
  describe('sirdataSubmodule', function() {
    it('successfully instantiates', function () {
		      expect(sirdataSubmodule.init()).to.equal(true);
    });
  });

  describe('Add Segment Data', function() {
    it('adds segment data', function() {
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

      addSegmentData(adUnits, data, config, () => {});
      expect(adUnits[0].bids[0].params.keywords).to.have.deep.property('sd_rtd', ['111111', '222222', '333333']);
      expect(adUnits[0].bids[1].ortb2.site.ext.data).to.have.deep.property('sd_rtd', ['333333']);
      expect(adUnits[0].bids[1].ortb2.user.ext.data).to.have.deep.property('sd_rtd', ['111111', '222222']);
    });
  });

  describe('Get Segments And Categories', function() {
    it('gets data from async request and adds segment data', function() {
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

      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            }
          }, {
            bidder: 'other'
          }]
        }]
      };

      let data = {
        segments: [111111, 222222],
        contextual_categories: {'333333': 100}
      };

      getSegmentsAndCategories(reqBidsConfigObj, () => {}, config, {});

      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(data));

      expect(reqBidsConfigObj.adUnits[0].bids[0].params.keywords).to.have.deep.property('sd_rtd', ['111111', '222222', '333333']);
      expect(reqBidsConfigObj.adUnits[0].bids[1].ortb2.site.ext.data).to.have.deep.property('sd_rtd', ['333333']);
      expect(reqBidsConfigObj.adUnits[0].bids[1].ortb2.user.ext.data).to.have.deep.property('sd_rtd', ['111111', '222222']);
    });
  });
});
