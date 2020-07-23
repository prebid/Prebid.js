import { fetchTargetingForMediaId, getTargetingForBid,
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

        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForSuccess
          }
        });

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
        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForFailure
          }
        });
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when playlist is absent', function() {
        request.respond({});
        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForFailure
          }
        });
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
        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForFailure
          }
        });
        expect(targetingInfo).to.be.null;
      });

      it('should not write to cache when request errors', function() {
        request.error();
        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForFailure
          }
        });
        expect(targetingInfo).to.be.null;
      });
    });
  });

  describe('Get targeting for bid', function() {
    const mediaIdWithSegment = 'media_ID_1';
    const mediaIdNoSegment = 'media_ID_2';
    const mediaIdForCurrentItem = 'media_ID_current';
    const mediaIdNotCached = 'media_test_ID';

    const validPlayerID = 'player_test_ID_valid';
    const invalidPlayerID = 'player_test_ID_invalid';

    it('returns null when targeting block is missing', function () {
      const targeting = getTargetingForBid({});
      expect(targeting).to.be.null;
    });

    it('returns null when jwplayer.js is absent from page', function () {
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: invalidPlayerID,
          mediaID: mediaIdNotCached
        }
      });
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
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: invalidPlayerID,
            mediaID: mediaIdNotCached
          }
        });
        expect(targeting).to.be.null;
      });

      it('returns segments when media ID matches a playlist item with segments', function () {
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID,
            mediaID: mediaIdWithSegment
          }
        });
        expect(targeting).to.deep.equal(targetingForMediaWithSegment);
      });

      it('caches segments media ID matches a playist item with segments', function () {
        getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID,
            mediaID: mediaIdWithSegment
          }
        });

        window.jwplayer = null;
        const targeting2 = getTargetingForBid({
          jwTargeting: {
            playerID: invalidPlayerID,
            mediaID: mediaIdWithSegment
          }
        });
        expect(targeting2).to.deep.equal(targetingForMediaWithSegment);
      });

      it('returns segments of current item when media ID is missing', function () {
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID
          }
        });
        expect(targeting).to.deep.equal(targetingForCurrentItem);
      });

      it('caches segments from the current item', function () {
        getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID
          }
        });

        window.jwplayer = null;
        const targeting2 = getTargetingForBid({
          jwTargeting: {
            playerID: invalidPlayerID,
            mediaID: mediaIdForCurrentItem
          }
        });
        expect(targeting2).to.deep.equal(targetingForCurrentItem);
      });

      it('returns undefined segments when segments are absent', function () {
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID,
            mediaID: mediaIdNoSegment
          }
        });
        expect(targeting).to.deep.equal({
          mediaID: mediaIdNoSegment,
          segments: undefined
        });
      });
    });
  });

  describe('jwplayerSubmodule', function () {
    it('successfully instantiates', function () {
      expect(jwplayerSubmodule.init()).to.equal(true);
    });

    describe('getData', function () {
      const validMediaIDs = ['media_ID_1', 'media_ID_2', 'media_ID_3'];
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

      it('executes callback immediately when no requests are pending', function () {
        fetchTargetingInformation({
          mediaIDs: []
        });
        jwplayerSubmodule.getData([], bidRequestSpy);
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback after requests complete', function() {
        fetchTargetingInformation({
          mediaIDs: validMediaIDs
        });
        jwplayerSubmodule.getData([], bidRequestSpy);
        expect(bidRequestSpy.notCalled).to.be.true;

        const req1 = fakeServer.requests[0];
        const req2 = fakeServer.requests[1];
        const req3 = fakeServer.requests[2];

        req1.respond();
        expect(bidRequestSpy.notCalled).to.be.true;

        req2.respond();
        expect(bidRequestSpy.notCalled).to.be.true;

        req3.respond();
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback after timeout', function () {
        fetchTargetingInformation({
          mediaIDs: validMediaIDs
        });
        jwplayerSubmodule.getData([], bidRequestSpy);
        expect(bidRequestSpy.notCalled).to.be.true;
        clock.tick(150);
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('executes callback only once if requests succeed after timeout', function () {
        fetchTargetingInformation({
          mediaIDs: validMediaIDs
        });
        jwplayerSubmodule.getData([], bidRequestSpy);
        expect(bidRequestSpy.notCalled).to.be.true;
        clock.tick(150);
        expect(bidRequestSpy.calledOnce).to.be.true;

        fakeServer.respond();
        expect(bidRequestSpy.calledOnce).to.be.true;
      });

      it('returns data in proper structure', function () {
        const adUnitCode = 'test_ad_unit';
        const adUnitWithMediaId = {
          code: adUnitCode,
          jwTargeting: {
            mediaID: testIdForSuccess
          }
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty'
        };
        const expectedData = {};
        const expectedContentId = 'jw_' + testIdForSuccess;
        expectedData[adUnitCode] = {
          jwTargeting: {
            segments: validSegments,
            content: {
              id: expectedContentId
            }
          }
        };
        jwplayerSubmodule.getData([adUnitWithMediaId, adUnitEmpty], bidRequestSpy);
        expect(bidRequestSpy.calledOnceWithExactly(expectedData)).to.be.true;
      });

      it('returns an empty object when media id is invalid', function () {
        const adUnitCode = 'test_ad_unit';
        const adUnitWithMediaId = {
          code: adUnitCode,
          jwTargeting: {
            mediaID: testIdForFailure
          }
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty'
        };

        jwplayerSubmodule.getData([adUnitWithMediaId, adUnitEmpty], bidRequestSpy);
        expect(bidRequestSpy.calledOnceWithExactly({})).to.be.true;
      });

      it('returns an empty object when jwTargeting block is absent', function () {
        const adUnitCode = 'test_ad_unit';
        const adUnitWithMediaId = {
          code: adUnitCode,
          mediaID: testIdForSuccess
        };
        const adUnitEmpty = {
          code: 'test_ad_unit_empty'
        };

        jwplayerSubmodule.getData([adUnitWithMediaId, adUnitEmpty], bidRequestSpy);
        expect(bidRequestSpy.calledOnceWithExactly({})).to.be.true;
      });
    });
  });
});
