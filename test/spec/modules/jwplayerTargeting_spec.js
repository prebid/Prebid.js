import { fetchTargetingForMediaId, getTargetingForBid,
  onFetchCompetion, fetchTargetingInformation } from 'modules/jwplayerTargeting.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('jwplayer', function() {
  const validSegments1 = ['test_seg_1', 'test_seg_2'];

  describe('Fetch targeting for mediaID tests', function () {
    let request;
    const testID = 'testID';
    const testID2 = 'testID2';

    beforeEach(function () {
      // fetchTargetingForMediaId(testID);
      // request = server.requests[0];
    });

    afterEach(function () {
      // logErrorStub.restore();
    });

    it('should reach out to media endpoint', function () {
      fetchTargetingForMediaId(testID);
      const request = server.requests[0];
      expect(request.url).to.be.eq(`https://cdn.jwplayer.com/v2/media/${testID}`);
    });

    it('should write to cache when successful', function () {
      fetchTargetingForMediaId(testID);
      const request = server.requests[0];
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
          mediaID: testID
        }
      });

      expect(targetingInfo).to.deep.equal(validSegments1);
    });

    it('should not write to cache when response is malformed', function() {
      fetchTargetingForMediaId(testID2);
      const request = server.requests[0]
      request.respond('{]');
      const targetingInfo = getTargetingForBid({
        jwTargeting: {
          mediaID: testID2
        }
      });
      expect(targetingInfo).to.deep.equal([]);
    });

    it('should not write to cache when playlist is absent', function() {
      fetchTargetingForMediaId(testID2);
      const request = server.requests[0]
      request.respond({});
      const targetingInfo = getTargetingForBid({
        jwTargeting: {
          mediaID: testID2
        }
      });
      expect(targetingInfo).to.deep.equal([]);
    });

    it('should not write to cache when segments are absent', function() {
      fetchTargetingForMediaId(testID2);
      const request = server.requests[0]
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
          mediaID: testID2
        }
      });
      expect(targetingInfo).to.deep.equal([]);
    });

    it('should not write to cache when request errors', function() {
      fetchTargetingForMediaId(testID2);
      const request = server.requests[0]
      request.error();
      const targetingInfo = getTargetingForBid({
        jwTargeting: {
          mediaID: testID2
        }
      });
      expect(targetingInfo).to.deep.equal([]);
    });
  });

  describe('Get targeting for bid', function() {
    const validPlayerID = 'player_test_ID_valid';
    const invalidPlayerID = 'player_test_ID_invalid';
    const jwplayerMock = function(playerID) {
      if (playerID === validPlayerID) {
        return playerInstanceMock;
      } else {
        return {};
      }
    };

    const playlistItemWithSegmentMock = {
      mediaid: 'media_ID_1',
      jwpseg: validSegments1
    };

    const playlistItemNoSegmentMock = {
      mediaid: 'media_ID_2'
    };

    const currentItemSegments = ['test_seg_3', 'test_seg_4'];
    const currentPlaylistItemMock = {
      mediaid: 'media_ID_current',
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

    it('returns empty array when targeting block is missing', function () {
      const targeting = getTargetingForBid({});
      expect(targeting).to.deep.equal([]);
    });

    it('returns empty array when jwplayer.js is absent from page', function () {
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_test_ID'
        }
      });
      expect(targeting).to.deep.equal([]);
    });

    it('returns empty array when player ID does not match player on page', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_test_ID'
        }
      });
      expect(targeting).to.deep.equal([]);
    });

    it('returns segments when media ID matches a playlist item with segments', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: validPlayerID,
          mediaID: 'media_ID_1'
        }
      });
      expect(targeting).to.deep.equal(validSegments1);
    });

    it('caches segments media ID matches a playist item with segments', function () {
      // console.log('test window: ', window, this);
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: validPlayerID,
          mediaID: 'media_ID_1'
        }
      });

      window.jwplayer = null;
      const targeting2 = getTargetingForBid({
        jwTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_ID_1'
        }
      });
      expect(targeting2).to.deep.equal(validSegments1);
    });

    it('returns segments of current item when media ID is missing', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwTargeting: {
          playerID: validPlayerID
        }
      });
      expect(targeting).to.deep.equal(currentItemSegments);
    });

    it('caches segments from the current item', function () {
      window.jwplayer = jwplayerMock;
      getTargetingForBid({
        jwTargeting: {
          playerID: validPlayerID
        }
      });

      window.jwplayer = null;
      const targeting2 = getTargetingForBid({
        jwTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_ID_current'
        }
      });
      expect(targeting2).to.deep.equal(currentItemSegments);
    });
  });

  describe('Blocking mechanism for bid requests', function () {
    const validMediaIDs = ['media_ID_1', 'media_ID_2', 'media_ID_3'];

    it('executes the bidRequest immediately when no requests are pending', function () {
      fetchTargetingInformation({
        mediaIDs: []
      });
      let bidRequestSpy = sinon.spy();
      onFetchCompetion(bidRequestSpy, {});
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
      onFetchCompetion(bidRequestSpy, {});
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
      onFetchCompetion(bidRequestSpy, {});
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
      onFetchCompetion(bidRequestSpy, {});
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
