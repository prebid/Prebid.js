import {
  VideojsProvider
} from 'modules/videojsVideoProvider';
import videojs from 'video.js';

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
      document.body.innerHTML = '';
      utilsMock = null;
    });

    it('should trigger failure when videojs is missing', function () {
      // TODO: Implement when callbacks are added
    });

    it('should trigger failure when videojs version is under min supported version', function () {
      // TODO: Implement when callbacks are added
    });

    it('should instantiate the player when uninstantied', function () {
      const div = document.createElement('div');
      div.setAttribute("id", "test-div");
      document.body.appendChild(div);
      config.playerConfig = {};
      config.divId = 'test-div'
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utilsMock);
      provider.init();
      expect(videojs.getPlayer('test-div')).to.be.an('object')
      videojs.getPlayer('test-div').dispose()
    });

    it('should not reinstantiate the player when instantated', function () {
      const div = document.createElement('div');
      div.setAttribute("id", "test-div");
      document.body.appendChild(div);
      const player = videojs(div, {})
      config.playerConfig = {};
      config.divId = 'test-div'
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utilsMock);
      provider.init();
      expect(videojs.getPlayer('test-div')).to.be.equal(player)
      videojs.getPlayer('test-div').dispose()
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
