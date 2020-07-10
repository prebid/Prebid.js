import { fetchTargetingForMediaId, getTargetingForBid } from 'modules/jwplayerTargeting.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('jwplayer', function() {
  const validSegments1 = ['test_seg_1', 'test_seg_2'];

  describe('Fetch targeting for mediaID tests', function () {
    let request;
    const testID = 'testID';

    beforeEach(function () {
      fetchTargetingForMediaId(testID);
      request = server.requests[0];
    });

    afterEach(function () {
      // logErrorStub.restore();
    });

    it('should reach out to media endpoint', function () {
      expect(request.url).to.be.eq(`https://cdn.jwplayer.com/v2/media/${testID}`);
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
        jwpTargeting: {
          mediaID: testID
        }
      });

      expect(targetingInfo).to.deep.equal(validSegments1);
    });

    it('', function() {

    });
    //
    // it('should fake', function () {
    //   let callBackSpy = sinon.spy();
    //   let consentData = {
    //     gdprApplies: true,
    //     consentString: 'BOkIpDSOkIpDSADABAENCc-AAAApOAFAAMAAsAMIAcAA_g'
    //   };
    //   let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams, consentData).callback;
    //   submoduleCallback(callBackSpy);
    //   let request = server.requests[0];
    //   expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14&ct=1&cv=BOkIpDSOkIpDSADABAENCc-AAAApOAFAAMAAsAMIAcAA_g');
    //   request.respond(
    //     200,
    //     responseHeader,
    //     JSON.stringify({})
    //   );
    //   expect(callBackSpy.calledOnce).to.be.true;
    // });
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
        jwpTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_test_ID'
        }
      });
      expect(targeting).to.deep.equal([]);
    });

    it('returns empty array when player ID does not match player on page', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwpTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_test_ID'
        }
      });
      expect(targeting).to.deep.equal([]);
    });

    it('returns segments when media ID matches a playlist item with segments', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwpTargeting: {
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
        jwpTargeting: {
          playerID: validPlayerID,
          mediaID: 'media_ID_1'
        }
      });

      window.jwplayer = null;
      const targeting2 = getTargetingForBid({
        jwpTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_ID_1'
        }
      });
      expect(targeting2).to.deep.equal(validSegments1);
    });

    it('returns segments of current item when media ID is missing', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwpTargeting: {
          playerID: validPlayerID
        }
      });
      expect(targeting).to.deep.equal(currentItemSegments);
    });

    it('caches segments from the current item', function () {
      window.jwplayer = jwplayerMock;
      const targeting = getTargetingForBid({
        jwpTargeting: {
          playerID: validPlayerID
        }
      });

      window.jwplayer = null;
      const targeting2 = getTargetingForBid({
        jwpTargeting: {
          playerID: invalidPlayerID,
          mediaID: 'media_ID_current'
        }
      });
      expect(targeting2).to.deep.equal(currentItemSegments);
    });
  });

  describe('Blocking mechanism for bid requests', function () {

  });
});
