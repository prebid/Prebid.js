import { fetchTargetingForMediaId, getTargetingForBid,
  onFetchCompletion, fetchTargetingInformation } from 'modules/jwplayerTargeting.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('jwplayer', function() {
  const validSegments1 = ['test_seg_1', 'test_seg_2'];

  describe('Fetch targeting for mediaID tests', function () {
    let request;
    const testIdForSuccess = 'test_id_for_success';
    const testIdForFailure = 'test_id_for_failure';

    describe('Fetch succeeds', function () {
      beforeEach(function () {
        fetchTargetingForMediaId(testIdForSuccess);
        request = server.requests[0];
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
                jwpseg: validSegments1
              }
            ]
          })
        );

        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForSuccess
          }
        });

        expect(targetingInfo).to.deep.equal(validSegments1);
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
        expect(targetingInfo).to.deep.equal([]);
      });

      it('should not write to cache when playlist is absent', function() {
        request.respond({});
        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForFailure
          }
        });
        expect(targetingInfo).to.deep.equal([]);
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
        expect(targetingInfo).to.deep.equal([]);
      });

      it('should not write to cache when request errors', function() {
        request.error();
        const targetingInfo = getTargetingForBid({
          jwTargeting: {
            mediaID: testIdForFailure
          }
        });
        expect(targetingInfo).to.deep.equal([]);
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

    it('returns empty array when targeting block is missing', function () {
      const targeting = getTargetingForBid({});
      expect(targeting).to.deep.equal([]);
    });

    it('returns empty array when jwplayer.js is absent from page', function () {
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: invalidPlayerID,
          mediaID: mediaIdNotCached
        }
      });
      expect(targeting).to.deep.equal([]);
    });

    describe('When jwplayer.js is on page', function () {
      const playlistItemWithSegmentMock = {
        mediaid: mediaIdWithSegment,
        jwpseg: validSegments1
      };

      const playlistItemNoSegmentMock = {
        mediaid: mediaIdNoSegment
      };

      const currentItemSegments = ['test_seg_3', 'test_seg_4'];
      const currentPlaylistItemMock = {
        mediaid: mediaIdForCurrentItem,
        jwpseg: currentItemSegments
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

      it('returns empty array when player ID does not match player on page', function () {
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: invalidPlayerID,
            mediaID: mediaIdNotCached
          }
        });
        expect(targeting).to.deep.equal([]);
      });

      it('returns segments when media ID matches a playlist item with segments', function () {
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID,
            mediaID: mediaIdWithSegment
          }
        });
        expect(targeting).to.deep.equal(validSegments1);
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
        expect(targeting2).to.deep.equal(validSegments1);
      });

      it('returns segments of current item when media ID is missing', function () {
        const targeting = getTargetingForBid({
          jwTargeting: {
            playerID: validPlayerID
          }
        });
        expect(targeting).to.deep.equal(currentItemSegments);
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
        expect(targeting2).to.deep.equal(currentItemSegments);
      });
    });
  });

  describe('Blocking mechanism for bid requests', function () {
    const validMediaIDs = ['media_ID_1', 'media_ID_2', 'media_ID_3'];

    it('executes the bidRequest immediately when no requests are pending', function () {
      fetchTargetingInformation({
        mediaIDs: []
      });
      let bidRequestSpy = sinon.spy();
      onFetchCompletion(bidRequestSpy, {});
      expect(bidRequestSpy.calledOnce).to.be.true;
    });

    it('executes the bidRequest after timeout if requests are still pending', function () {
      let serv = sinon.createFakeServer();
      serv.respondImmediately = false;
      serv.autoRespond = false;
      const clock = sinon.useFakeTimers({
        toFake: ['setTimeout']
      });
      fetchTargetingInformation({
        mediaIDs: validMediaIDs
      });
      let bidRequestSpy = sinon.spy();
      onFetchCompletion(bidRequestSpy, {});
      expect(bidRequestSpy.notCalled).to.be.true;
      clock.tick(1500);
      expect(bidRequestSpy.calledOnce).to.be.true;
      clock.restore();
    });

    it('executes the bidRequest only once if requests succeed after timeout', function () {
      let serv = sinon.createFakeServer();
      serv.respondImmediately = false;
      serv.autoRespond = false;
      const clock = sinon.useFakeTimers({
        toFake: ['setTimeout']
      });
      fetchTargetingInformation({
        mediaIDs: validMediaIDs
      });
      let bidRequestSpy = sinon.spy();
      onFetchCompletion(bidRequestSpy, {});
      expect(bidRequestSpy.notCalled).to.be.true;
      clock.tick(1500);
      expect(bidRequestSpy.calledOnce).to.be.true;

      serv.respond();
      expect(bidRequestSpy.calledOnce).to.be.true;
      clock.restore();
    });

    it('executes the bidRequest when all pending jwpseg requests are done', function () {
      let serv = sinon.createFakeServer();
      serv.respondImmediately = false;
      serv.autoRespond = false;

      fetchTargetingInformation({
        mediaIDs: validMediaIDs
      });
      let bidRequestSpy = sinon.spy();
      onFetchCompletion(bidRequestSpy, {});
      expect(bidRequestSpy.notCalled).to.be.true;

      const req1 = serv.requests[0];
      const req2 = serv.requests[1];
      const req3 = serv.requests[2];

      req1.respond();
      expect(bidRequestSpy.notCalled).to.be.true;

      req2.respond();
      expect(bidRequestSpy.notCalled).to.be.true;

      req3.respond();
      expect(bidRequestSpy.calledOnce).to.be.true;
    });
  });
});
