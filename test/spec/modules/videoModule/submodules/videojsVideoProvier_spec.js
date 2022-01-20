import {
  VideojsProvider
} from 'modules/videojsVideoProvider';

function videojsMock(overrides) {
  const players = {}
  const vjs = function(id) {
    if (!players[id]) {
      players[id] = {
        controls: function() {},
        getViewable: function () {},
        getPercentViewable: function () {},
        getMute: function () {},
        volume: function () {},
        getConfig: function () {},
        videoHeight: function () {},
        videoWidth: function () {},
        getFullscreen: function () {},
        getPlaylistItem: function () {},
        playAd: function () {},
        on: function () {},
        off: function () {},
        remove: function () {},
        ...overrides
      }
    }
    return players[id]
  };
  vjs.players = players
  vjs.version = '7.17.0';
  return vjs;
}

describe('videojsProvider', function () {
  describe('init', function () {
    let config;
    let adState;
    let timeState;
    let callbackStorage;
    let utilsMock;

    beforeEach(() => {
      config = {};
      //   adState = adStateFactory();
      //   timeState = timeStateFactory();
      //   callbackStorage = callbackStorageFactory();
      utilsMock = null;
    });

    it('should trigger failure when videojs is missing', function () {
      // TODO: Implement when callbacks are added
    });

    it('should trigger failure when videojs version is under min supported version', function () {
      // TODO: Implement when callbacks are added
    });

    it('should instantiate the player when uninstantied', function () {
      config.playerConfig = {};
      config.divId = 'test-div'
      const videojs = videojsMock();
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utilsMock);
      provider.init();
      expect(videojs.players['test-div']).to.be.an('object')
    });

    it('should trigger setup complete when player is already instantied', function () {
      // TODO: Implement when callbacks are added
    });
  });

  describe('getId', function () {
    it('should return configured div id', function () {
      const provider = VideojsProvider({ divId: 'test_id' });
      expect(provider.getId()).to.be.equal('test_id');
    });
  });
});
