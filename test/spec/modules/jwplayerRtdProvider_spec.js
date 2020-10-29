import { fetchTargetingForMediaId, enrichBidRequest,
  getVatFromCache, formatTargetingResponse, getVatFromPlayer, enrichAdUnits,
  fetchTargetingInformation, jwplayerSubmodule } from 'modules/jwplayerRtdProvider.js';
import { server } from 'test/mocks/xhr.js';

describe('jwplayerRtdProvider', function() {
  const testIdForSuccess = 'test_id_for_success';
  const testIdForFailure = 'test_id_for_failure';
  const validSegments = ['test_seg_1', 'test_seg_2'];
  const responseHeader = {'Content-Type': 'application/json'};

  describe('Fetch targeting for mediaID tests', function () {
    let request;

    describe('Fetch succeeds', function () {
      beforeEach(function () {
        fetchTargetingForMediaId(testIdForSuccess);
        request = server.requests[0];
      });

      afterEach(function () {
        server.respond();
      });

      it('should reach out to media endpoint', function () {
        expect(request.url).to.be.eq(`https://cdn.jwplayer.com/v2/media/${testIdForSuccess}`);
      });

      it('should write to cache when successful', function () {
        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            playlist: [
              {
                file: 'test.mp4',
                jwpseg: validSegments
              }
            ]
          })
        );

        const targetingInfo = getVatFromCache(testIdForSuccess);

        const validTargeting = {
          segments: validSegments,
          mediaID: testIdForSuccess
        };

        expect(targetingInfo).to.deep.equal(validTargeting);
      });
    });

    describe('Fetch fails', function () {
      beforeEach(function () {
        fetchTargetingForMediaId(testIdForFailure);
        request = server.requests[0]
      });

      it('should not write to cache when response is malformed', function() {
        request.respond('{]');
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when playlist is absent', function() {
        request.respond({});
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when segments are absent', function() {
        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            playlist: [
              {
                file: 'test.mp4'
              }
            ]
          })
        );
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when request errors', function() {
        request.error();
        const targetingInfo = getVatFromCache(testIdForFailure);
        expect(targetingInfo).to.be.null;
      });
    });
  });

  describe('Format targeting response', function () {
    it('should exclude segment key when absent', function () {
      const targeting = formatTargetingResponse({ mediaID: 'test' });
      expect(targeting).to.not.have.property('segments');
    });

    it('should exclude content block when mediaId is absent', function () {
      const targeting = formatTargetingResponse({ segments: ['test'] });
      expect(targeting).to.not.have.property('content');
    });

    it('should return proper format', function () {
      const segments = ['123'];
      const mediaID = 'test';
      const expectedContentId = 'jw_' + mediaID;
      const expectedContent = {
        id: expectedContentId
      };
      const targeting = formatTargetingResponse({
        segments,
        mediaID
      });
      expect(targeting).to.have.deep.property('segments', segments);
      expect(targeting).to.have.deep.property('content', expectedContent);
    });
  });

  describe('Get VAT from player', function () {
    const mediaIdWithSegment = 'media_ID_1';
    const mediaIdNoSegment = 'media_ID_2';
    const mediaIdForCurrentItem = 'media_ID_current';
    const mediaIdNotCached = 'media_test_ID';

    const validPlayerID = 'player_test_ID_valid';
    const invalidPlayerID = 'player_test_ID_invalid';

    it('returns null when jwplayer.js is absent from page', function () {
      const targeting = getVatFromPlayer(invalidPlayerID, mediaIdNotCached);
      expect(targeting).to.be.null;
    });

    describe('When jwplayer.js is on page', function () {
      const playlistItemWithSegmentMock = {
        mediaid: mediaIdWithSegment,
        jwpseg: validSegments
      };

      const targetingForMediaWithSegment = {
        segments: validSegments,
        mediaID: mediaIdWithSegment
      };

      const playlistItemNoSegmentMock = {
        mediaid: mediaIdNoSegment
      };

      const currentItemSegments = ['test_seg_3', 'test_seg_4'];
      const currentPlaylistItemMock = {
        mediaid: mediaIdForCurrentItem,
        jwpseg: currentItemSegments
      };
      const targetingForCurrentItem = {
        segments: currentItemSegments,
        mediaID: mediaIdForCurrentItem
      };

      const playerInstanceMock = {
        getPlaylist: function () {
          return [playlistItemWithSegmentMock, playlistItemNoSegmentMock];
        },

        getPlaylistItem: function () {
          return currentPlaylistItemMock;
        }
      };

      const jwplayerMock = function(playerID) {
        if (playerID === validPlayerID) {
          return playerInstanceMock;
        } else {
          return {};
        }
      };

      beforeEach(function () {
        window.jwplayer = jwplayerMock;
      });

      it('returns null when player ID does not match player on page', function () {
        const targeting = getVatFromPlayer(invalidPlayerID, mediaIdNotCached);
        expect(targeting).to.be.null;
      });

      it('returns segments when media ID matches a playlist item with segments', function () {
        const targeting = getVatFromPlayer(validPlayerID, mediaIdWithSegment);
        expect(targeting).to.deep.equal(targetingForMediaWithSegment);
      });

      it('caches segments when media ID matches a playist item with segments', function () {
        getVatFromPlayer(validPlayerID, mediaIdWithSegment);
        const vat = getVatFromCache(mediaIdWithSegment);
        expect(vat.segments).to.deep.equal(validSegments);
      });

      it('returns segments of current item when media ID is missing', function () {
        const targeting = getVatFromPlayer(validPlayerID);
        expect(targeting).to.deep.equal(targetingForCurrentItem);
      });

      it('caches segments from the current item', function () {
        getVatFromPlayer(validPlayerID);

        window.jwplayer = null;
        const targeting = getVatFromCache(mediaIdForCurrentItem);
        expect(targeting).to.deep.equal(targetingForCurrentItem);
      });

      it('returns undefined segments when segments are absent', function () {
        const targeting = getVatFromPlayer(validPlayerID, mediaIdNoSegment);
        expect(targeting).to.deep.equal({
          mediaID: mediaIdNoSegment,
          segments: undefined
        });
      });

      describe('Get Bid Request Data', function () {
        it('executes immediately while request is active if player has item', function () {
          const bidRequestSpy = sinon.spy();
          const fakeServer = sinon.createFakeServer();
          fakeServer.respondImmediately = false;
          fakeServer.autoRespond = false;

          fetchTargetingForMediaId(mediaIdWithSegment);

          const bid = {};
          const adUnit = {
            jwTargeting: {
              mediaID: mediaIdWithSegment,
              playerID: validPlayerID
            },
            bids: [
              bid
            ]
          };
          const expectedContentId = 'jw_' + mediaIdWithSegment;
          const expectedTargeting = {
            segments: validSegments,
            content: {
              id: expectedContentId
            }
          };
          jwplayerSubmodule.getBidRequestData({ adUnits: [adUnit] }, bidRequestSpy);
          expect(bidRequestSpy.calledOnce).to.be.true;
          expect(bid).to.have.deep.property('jwTargeting', expectedTargeting);
          fakeServer.respond();
          expect(bidRequestSpy.calledOnce).to.be.true;
        });
      });
    });
  });

  describe('Enrich ad units', function () {
    const contentIdForSuccess = 'jw_' + testIdForSuccess;
    const expectedTargetingForSuccess = {
      segments: validSegments,
      content: {
        id: contentIdForSuccess
      }
    };
    let bidRequestSpy;
    let fakeServer;
    let clock;

    beforeEach(function () {
      bidRequestSpy = sinon.spy();

      fakeServer = sinon.createFakeServer();
      fakeServer.respondImmediately = false;
      fakeServer.autoRespond = false;

      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
      fakeServer.respond();
    });

    it('adds targeting when pending request succeeds', function () {
      fetchTargetingForMediaId(testIdForSuccess);
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        jwTargeting: {
          mediaID: testIdForSuccess
        },
        bids
      };

      enrichAdUnits([adUnit]);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1).to.not.have.property('jwTargeting');
      expect(bid2).to.not.have.property('jwTargeting');

      const request = fakeServer.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          playlist: [
            {
              file: 'test.mp4',
              jwpseg: validSegments
            }
          ]
        })
      );

      expect(bid1).to.have.deep.property('jwTargeting', expectedTargetingForSuccess);
      expect(bid2).to.have.deep.property('jwTargeting', expectedTargetingForSuccess);
    });

    it('immediately adds cached targeting', function () {
      fetchTargetingForMediaId(testIdForSuccess);
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        jwTargeting: {
          mediaID: testIdForSuccess
        },
        bids
      };
      const request = fakeServer.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          playlist: [
            {
              file: 'test.mp4',
              jwpseg: validSegments
            }
          ]
        })
      );

      enrichAdUnits([adUnit]);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1).to.have.deep.property('jwTargeting', expectedTargetingForSuccess);
      expect(bid2).to.have.deep.property('jwTargeting', expectedTargetingForSuccess);
    });

    it('adds content block when segments are absent and no request is pending', function () {
      const expectedTargetingForFailure = {
        content: {
          id: 'jw_' + testIdForFailure
        }
      };
      const bids = [
        {
          id: 'bid1'
        },
        {
          id: 'bid2'
        }
      ];
      const adUnit = {
        jwTargeting: {
          mediaID: testIdForFailure
        },
        bids
      };

      enrichAdUnits([adUnit]);
      const bid1 = bids[0];
      const bid2 = bids[1];
      expect(bid1).to.have.deep.property('jwTargeting', expectedTargetingForFailure);
      expect(bid2).to.have.deep.property('jwTargeting', expectedTargetingForFailure);
    });
  });

  describe('jwplayerSubmodule', function () {
    it('successfully instantiates', function () {
      expect(jwplayerSubmodule.init()).to.equal(true);
    });

    describe('Get Bid Request Data', function () {
      const validMediaIDs = ['media_ID_1', 'media_ID_2', 'media_ID_3'];
      let bidRequestSpy;
      let fakeServer;
      let clock;
      let bidReqConfig;

      beforeEach(function () {
        bidReqConfig = {
          adUnits: [
            {
              jwTargeting: {
                mediaID: validMediaIDs[0]
              },
              bids: [
                {}, {}
              ]
            },
            {
              jwTargeting: {
                mediaID: validMediaIDs[1]
              },
              bids: [
                {}, {}
              ]
            }
          ]
        };

        bidRequestSpy = sinon.spy();

        fakeServer = sinon.createFakeServer();
        fakeServer.respondImmediately = false;
        fakeServer.autoRespond = false;

        clock = sinon.useFakeTimers();
      });

      afterEach(function () {
        clock.restore();
        fakeServer.respond();
      });

      it('executes callback immediately when ad units are missing', function () {
        jwplayerSubmodule.getBidRequestData({ adUnits: [] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback immediately when no requests are pending', function () {
        fetchTargetingInformation({
          mediaIDs: []
        });
        jwplayerSubmodule.getBidRequestData(bidReqConfig, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback only after requests in adUnit complete', function() {
        fetchTargetingInformation({
          mediaIDs: validMediaIDs
        });
        jwplayerSubmodule.getBidRequestData(bidReqConfig, bidRequestSpy);
        expect(bidRequestSpy.notCalled).to.be.true;

        const req1 = fakeServer.requests[0];
        const req2 = fakeServer.requests[1];
        const req3 = fakeServer.requests[2];

        req1.respond();
        expect(bidRequestSpy.notCalled).to.be.true;

        req2.respond();
        expect(bidRequestSpy.calledOnce).to.be.true;

        req3.respond();
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('sets targeting data in proper structure', function () {
        const bid = {};
        const adUnitWithMediaId = {
          jwTargeting: {
            mediaID: testIdForSuccess
          },
          bids: [
            bid
          ]
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty'
        };
        const expectedContentId = 'jw_' + testIdForSuccess;
        const expectedTargeting = {
          segments: validSegments,
          content: {
            id: expectedContentId
          }
        };
        jwplayerSubmodule.getBidRequestData({ adUnits: [adUnitWithMediaId, adUnitEmpty] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
        expect(bid).to.have.deep.property('jwTargeting', expectedTargeting);
      });

      it('excludes segments when absent', function () {
        const adUnitCode = 'test_ad_unit';
        const bid = {};
        const adUnit = {
          jwTargeting: {
            mediaID: testIdForFailure
          },
          bids: [ bid ]
        };
        const expectedContentId = 'jw_' + adUnit.jwTargeting.mediaID;
        const expectedTargeting = {
          content: {
            id: expectedContentId
          }
        };

        jwplayerSubmodule.getBidRequestData({ adUnits: [ adUnit ] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
        expect(bid.jwTargeting).to.not.have.property('segments');
        expect(bid.jwTargeting).to.not.have.property('segments');
        expect(bid).to.have.deep.property('jwTargeting', expectedTargeting);
      });

      it('does not modify bid when jwTargeting block is absent', function () {
        const adUnitCode = 'test_ad_unit';
        const bid1 = {};
        const bid2 = {};
        const adUnitWithMediaId = {
          code: adUnitCode,
          mediaID: testIdForSuccess,
          bids: [ bid1 ]
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty',
          bids: [ bid2 ]
        };

        jwplayerSubmodule.getBidRequestData({ adUnits: [adUnitWithMediaId, adUnitEmpty] }, bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
        expect(bid1).to.not.have.property('jwTargeting');
        expect(bid2).to.not.have.property('jwTargeting');
      });
    });
  });
});
