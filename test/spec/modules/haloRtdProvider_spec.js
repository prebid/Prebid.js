import { HALOID_LOCAL_NAME, SEG_LOCAL_NAME, addSegmentData, getSegments, haloSubmodule, storage } from 'modules/haloRtdProvider.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('haloRtdProvider', function() {
  describe('haloSubmodule', function() {
    it('successfully instantiates', function () {
		      expect(haloSubmodule.init()).to.equal(true);
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
          bids: [
            // bid with existing segment data in bid obj and fpd
            {
              bidder: 'appnexus',
              fpd: {
                user: {
                  data: [
                    {
                      id: 'appnexus',
                      segment: [
                        {
                          id: '0'
                        }
                      ]
                    }
                  ]
                }
              },
              params: {
                user: {
                  segments: [0]
                }
              }
            }
          ]
        },

        // bids with fpd data definitions but without existing segment data
        {
          bids: [
            {
              bidder: 'appnexus',
              fpd: {
                user: {
                  data: [
                    {
                      id: 'appnexus'
                    }
                  ]
                }
              }
            },
            {
              bidder: 'generic',
              fpd: {
                user: {
                  data: [
                    {
                      id: 'generic'
                    }
                  ]
                }
              }
            }
          ]
        }
      ];

      const data = {
        appnexus: [{id: '1'}, {id: '2'}, {id: '3'}],
        generic: [{id: 'seg1'}, {id: 'seg2'}, {id: 'seg3'}]
      };

    	addSegmentData(adUnits, data, config);

      expect(adUnits[0].bids[0].fpd.user.data[0].segment[0]).to.have.deep.property('id', '0');
      expect(adUnits[0].bids[0].fpd.user.data[0].segment[1]).to.have.deep.property('id', '1');
      expect(adUnits[0].bids[0].fpd.user.data[0].segment[2]).to.have.deep.property('id', '2');
      expect(adUnits[0].bids[0].fpd.user.data[0].segment[3]).to.have.deep.property('id', '3');
      expect(adUnits[0].bids[0].params.user).to.have.deep.property('segments', [0, 1, 2, 3]);

      expect(adUnits[1].bids[0].fpd.user.data[0].segment[0]).to.have.deep.property('id', '1');
      expect(adUnits[1].bids[0].fpd.user.data[0].segment[1]).to.have.deep.property('id', '2');
      expect(adUnits[1].bids[0].fpd.user.data[0].segment[2]).to.have.deep.property('id', '3');
      expect(adUnits[1].bids[0].params.user).to.have.deep.property('segments', [1, 2, 3]);

      expect(adUnits[1].bids[1].fpd.user.data[0].segment[0]).to.have.deep.property('id', 'seg1');
      expect(adUnits[1].bids[1].fpd.user.data[0].segment[1]).to.have.deep.property('id', 'seg2');
      expect(adUnits[1].bids[1].fpd.user.data[0].segment[2]).to.have.deep.property('id', 'seg3');
      expect(adUnits[1].bids[1].segments[0]).to.have.deep.property('id', 'seg1');
      expect(adUnits[1].bids[1].segments[1]).to.have.deep.property('id', 'seg2');
      expect(adUnits[1].bids[1].segments[2]).to.have.deep.property('id', 'seg3');
    });

    it('allows mapper extensions and overrides', function() {
      const config = {
        params: {
          mapSegments: {
            generic: (bid, segments) => {
              bid.overrideSegments = segments;
            },
            newBidder: (bid, segments) => {
              bid.newBidderSegments = segments;
            }
          }
        }
      };

      let adUnits = [
        {
          bids: [ {bidder: 'newBidder'}, {bidder: 'generic'} ]
        }
      ];

      const data = {
        newBidder: [{id: 'nbseg1', name: 'New Bidder Segment 1'}, {id: 'nbseg2', name: 'New Bidder Segment 2'}, {id: 'nbseg3', name: 'New Bidder Segment 3'}],
        generic: [{id: 'seg1'}, {id: 'seg2'}, {id: 'seg3'}]
      };

      addSegmentData(adUnits, data, config);

      expect(adUnits[0].bids[0].newBidderSegments[0]).to.have.deep.property('id', 'nbseg1');
      expect(adUnits[0].bids[0].newBidderSegments[0]).to.have.deep.property('name', 'New Bidder Segment 1');
      expect(adUnits[0].bids[0].newBidderSegments[1]).to.have.deep.property('id', 'nbseg2');
      expect(adUnits[0].bids[0].newBidderSegments[1]).to.have.deep.property('name', 'New Bidder Segment 2');
      expect(adUnits[0].bids[0].newBidderSegments[2]).to.have.deep.property('id', 'nbseg3');
      expect(adUnits[0].bids[0].newBidderSegments[2]).to.have.deep.property('name', 'New Bidder Segment 3');

      expect(adUnits[0].bids[1].overrideSegments[0]).to.have.deep.property('id', 'seg1');
      expect(adUnits[0].bids[1].overrideSegments[1]).to.have.deep.property('id', 'seg2');
      expect(adUnits[0].bids[1].overrideSegments[2]).to.have.deep.property('id', 'seg3');
    });
  });

  describe('Get Segments', function() {
    it('gets segment data from local storage cache', function() {
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
          generic: [{id: 'seg1'}]
        }
      };

      storage.setDataInLocalStorage(SEG_LOCAL_NAME, JSON.stringify(data));

      getSegments(reqBidsConfigObj, () => {}, config, {});

      expect(reqBidsConfigObj.adUnits[0].bids[0].segments[0]).to.have.deep.property('id', 'seg1');
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
          generic: [{id: 'seg1'}]
        }
      };

      storage.setDataInLocalStorage(HALOID_LOCAL_NAME, 'haloid');
      getSegments(reqBidsConfigObj, () => {}, config, {});

      let request = server.requests[0];
      let postData = JSON.parse(request.requestBody);
      expect(postData.config).to.have.deep.property('publisherId', 1234);

      request.respond(200, responseHeader, JSON.stringify(data));

      expect(reqBidsConfigObj.adUnits[0].bids[0].segments[0]).to.have.deep.property('id', 'seg1');
    });
  });
});
