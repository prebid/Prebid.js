import { HALOID_LOCAL_NAME, SEG_LOCAL_NAME, addSegmentData, getSegments, getSegmentsAsync, audigentSubmodule, storage } from 'modules/audigentRtdProvider.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('audigentRtdProvider', function() {
  describe('audigentSubmodule', function() {
    it('successfully instantiates', function () {
		      expect(audigentSubmodule.init()).to.equal(true);
    });
  });

  describe('Add Segment Data', function() {
    it('adds segment data', function() {
      const config = {
        params: {
          mapSegments: {
            'appnexus': true,
            'generic': true
          }
        }
      };

      let adUnits = [
        {
          bids: [{bidder: 'appnexus'}]
        },
        {
          bids: [{bidder: 'appnexus'}, {bidder: 'generic'}]
        }
      ];

      const data = {
        appnexus: ['apnseg1', 'apnseg2', 'apnseg2'],
        generic: ['seg1', 'seg2', 'seg3']
      };

    	addSegmentData(adUnits, data, config);

      expect(adUnits[0].fpd.user.data.segments).to.have.deep.property('audigent_segments', data);
    	expect(adUnits[0].bids[0].params.user).to.have.deep.property('segments', ['apnseg1', 'apnseg2', 'apnseg2']);
    	expect(adUnits[1].bids[0].params.user).to.have.deep.property('segments', ['apnseg1', 'apnseg2', 'apnseg2']);
    	expect(adUnits[1].bids[1]).to.have.deep.property('segments', ['seg1', 'seg2', 'seg3']);
    });
  });

  describe('Get Segments', function() {
    it('gets segment data from cache', function() {
      const config = {
        params: {
          segmentCache: true,
          mapSegments: {
            'generic': true
          }
        }
      };

      let reqBidsConfigObj = {
        adUnits: [
          {
            bids: [{bidder: 'generic'}]
          }
        ]
      };

      const data = {
        audigent_segments: {
          generic: ['seg1']
        }
      };

      storage.setDataInLocalStorage(SEG_LOCAL_NAME, JSON.stringify(data));

      getSegments(reqBidsConfigObj, () => {}, config, {});

      expect(reqBidsConfigObj.adUnits[0].bids[0]).to.have.deep.property('segments', ['seg1']);
    });

    it('gets segment data via async request', function() {
      const config = {
        params: {
          segmentCache: false,
          mapSegments: {
            'generic': true
          },
          requestParams: {
            'publisherId': 1234
          }
        }
      };

      let reqBidsConfigObj = {
        adUnits: [
          {
            bids: [{bidder: 'generic'}]
          }
        ]
      };
      const data = {
        audigent_segments: {
          generic: ['seg1']
        }
      };

      storage.setDataInLocalStorage(HALOID_LOCAL_NAME, 'haloid');
      getSegments(reqBidsConfigObj, () => {}, config, {});

      let request = server.requests[0];
      let postData = JSON.parse(request.requestBody);
      expect(postData.config).to.have.deep.property('publisherId', 1234);

      request.respond(200, responseHeader, JSON.stringify(data));

      expect(reqBidsConfigObj.adUnits[0].bids[0]).to.have.deep.property('segments', ['seg1']);
    });
  });
});
