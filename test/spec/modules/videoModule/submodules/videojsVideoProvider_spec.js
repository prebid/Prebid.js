// Using require style imports for fine grained control of import time
import {
  SETUP_COMPLETE, SETUP_FAILED
} from 'libraries/video/constants/events.js';

const {VideojsProvider, utils} = require('modules/videojsVideoProvider');

const {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION
} = require('libraries/video/constants/ortb.js');

const videojs = require('video.js').default;
require('videojs-playlist').default;
require('videojs-ima').default;
require('videojs-contrib-ads').default;

describe('videojsProvider', function () {
  let config;
  let adState;
  let timeState;
  let callbackStorage;

  describe('init', function () {
    beforeEach(() => {
      config = {};
      document.body.innerHTML = '';
    });

    it('should trigger failure when videojs is missing', function () {
      const provider = VideojsProvider(config, null, adState, timeState, callbackStorage, utils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-1);
    });

    it('should trigger failure when videojs version is under min supported version', function () {
      const provider = VideojsProvider(config, {...videojs, VERSION: '0.0.0'}, adState, timeState, callbackStorage, utils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-2);
    });

    it('should trigger failure when the div is not found', function () {
      config.divId = 'fake-div'
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-3);
    });

    it('should instantiate the player when uninstantied', function () {
      config.playerConfig = {testAttr: true};
      config.divId = 'test-div'
      const div = document.createElement('div');
      div.setAttribute('id', 'test-div');
      document.body.appendChild(div);

      const mockVideojs = sinon.spy();
      const provider = VideojsProvider(config, mockVideojs, adState, timeState, callbackStorage, utils);
      provider.init();
      expect(mockVideojs.calledOnce).to.be.true
    });

    it('should not reinstantiate the player', function () {
      const div = document.createElement('div');
      div.setAttribute('id', 'test-div');
      document.body.appendChild(div);
      const player = videojs(div, {})
      config.playerConfig = {};
      config.divId = 'test-div'
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
      provider.init();
      expect(videojs.getPlayer('test-div')).to.be.equal(player)
      videojs.getPlayer('test-div').dispose()
    });

    it('should trigger setup complete when player is already insantiated', function () {
      const div = document.createElement('div');
      div.setAttribute('id', 'test-div');
      document.body.appendChild(div);
      videojs(div, {})
      config.playerConfig = {};
      config.divId = 'test-div'
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
      const setupComplete = sinon.spy();
      provider.onEvent(SETUP_COMPLETE, setupComplete, {});
      provider.init();
      expect(setupComplete.called).to.be.true;
      videojs.getPlayer('test-div').dispose()
    });
  });

  describe('getId', function () {
    it('should return configured div id', function () {
      const provider = VideojsProvider({ divId: 'test_id' });
      expect(provider.getId()).to.be.equal('test_id');
    });
  });

  describe('getOrtbParams', function () {
    beforeEach(() => {
      config = {divId: 'test'};
      // initialize videojs element
      document.body.innerHTML = `
      <video preload id='test' width="${200}" height="${100}">
      <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
      </video>`;
    });

    afterEach(() => {
      const testPlayer = videojs('test');
      if (testPlayer && !testPlayer.isDisposed()) {
        testPlayer.dispose();
      }
    });

    it('should populate oRTB Video and Content', function () {
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
      provider.init();

      const video = provider.getOrtbVideo();

      expect(video.mimes).to.include(VIDEO_MIME_TYPE.MP4);
      expect(video.protocols).to.deep.equal([2]);
      expect(video.h).to.equal(100);
      expect(video.w).to.equal(200);

      expect(video.maxextended).to.equal(-1);
      expect(video.boxingallowed).to.equal(1);
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.CLICK_TO_PLAY);
      expect(video.playbackend).to.equal(1);
      expect(video.api).to.deep.equal([2]);
      expect(video.placement).to.be.equal(PLACEMENT.INSTREAM);
    });

    it('should populate oRTB Content', function () {
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
      provider.init();

      const content = provider.getOrtbContent();
      expect(content.url).to.be.equal('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      expect(content).to.not.have.property('len');
    });

    it('should change populated oRTB params when ima present', function () {
      require('videojs-contrib-ads');
      require('videojs-ima');
      config.playerConfig = {
        params: {
          vendorConfig: {
            mediaid: 'vendor-id',
            advertising: {
              tag: ['test-tag']
            }
          }
        }
      }

      let provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const video = provider.getOrtbVideo();

      expect(video.protocols).to.include(PROTOCOLS.VAST_2_0);
      expect(video.api).to.include(API_FRAMEWORKS.VPAID_2_0);
      expect(video.mimes).to.include(VPAID_MIME_TYPE);
    });
    //
    // We can't determine what type of outstream play is occuring
    // if the src is absent so we should not set placement
    it('should not set placement when src is absent', function() {
      document.body.innerHTML = `<video preload id='test' width="${200}" height="${100}"></video>`
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const video = provider.getOrtbVideo();
      expect(video).to.not.have.property('placement')
    })
    //
    it('should populate position when fullscreen', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.isFullscreen = () => true;
      const video = provider.getOrtbVideo();
      expect(video.pos).to.equal(7);
    });
    //
    it('should populate length when loaded', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.readyState = () => 1
      player.duration = () => 100
      const content = provider.getOrtbContent();
      expect(content.len).to.equal(100);
    });
    //
    it('should return the correct playback method for autoplay', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay(true)
      const video = provider.getOrtbVideo();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY);
    });
    //
    it('should return the correct playback method for autoplay muted', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.muted = () => true
      player.autoplay = () => true
      const video = provider.getOrtbVideo();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });
    //
    it('should return the correct playback method for the other autoplay muted', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay = () => 'muted'
      const video = provider.getOrtbVideo();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });
  });
});

describe('utils', function() {
  describe('getSetupConfig', function() {
    it('should return undefined when config is absent', function () {
      expect(utils.getSetupConfig()).to.be.undefined;
    });

    it('should give priority to vendorConfig', function () {
      const config = {
        autostart: false,
        mute: false,
        params: {
          vendorConfig: {
            autostart: true,
            mute: true,
            other: true
          }
        }
      };
      const setupConfig = utils.getSetupConfig(config);
      expect(setupConfig.autostart).to.be.true;
      expect(setupConfig.mute).to.be.true;
      expect(setupConfig.other).to.be.true;
    });

    it('should only global apply properties when absent from vendor config', function () {
      const config = {
        autostart: false,
        params: {
          vendorConfig: {
            other: true
          }
        }
      };
      const setupConfig = utils.getSetupConfig(config);
      expect(setupConfig.autostart).to.be.false;
      expect(setupConfig.mute).to.be.undefined;
      expect(setupConfig.other).to.be.true;
    });
  });

  describe('getAdConfig', function () {
    it('should return empty object when config is absent', function () {
      expect(utils.getAdConfig()).to.deep.equal({});
    });

    it('should return adPluginConfig', function () {
      const config = {
        params: {
          adPluginConfig: {
            vpaid: true,
          }
        }
      };

      expect(utils.getAdConfig(config)).to.be.equal(config.params.adPluginConfig);
    });
  });

  describe('getPositionCode', function() {
    it('should return the correct position when video is above the fold', function () {
      const code = utils.getPositionCode({
        left: window.innerWidth / 10,
        top: 0,
        width: window.innerWidth - window.innerWidth / 10,
        height: window.innerHeight,
      })
      expect(code).to.equal(AD_POSITION.ABOVE_THE_FOLD)
    });

    it('should return the correct position when video is below the fold', function () {
      const code = utils.getPositionCode({
        left: window.innerWidth / 10,
        top: window.innerHeight,
        width: window.innerWidth - window.innerWidth / 10,
        height: window.innerHeight / 2,
      })
      expect(code).to.equal(AD_POSITION.BELOW_THE_FOLD)
    });

    it('should return the unkown position when the video is out of bounds', function () {
      const code = utils.getPositionCode({
        left: window.innerWidth / 10,
        top: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      })
      expect(code).to.equal(AD_POSITION.UNKNOWN)
    });
  });

  describe('Playlist', function () {
    const emptyPlayer = {};

    describe('getPlaylistCount', function () {
      it('should return 1 when playlist is absent', function () {
        expect(utils.getPlaylistCount(emptyPlayer)).to.be.equal(1);
      });

      it('should return playlist length', function () {
        document.body.innerHTML = `
      <video preload id='test' width="${200}" height="${100}">
      <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
      </video>`;
        const player = videojs('test', {});
        player.playlist([{
          sources: { src: 'sample.mp4' }
        }, {
          sources: { src: 'sample2.mp4' }
        }]);
        expect(utils.getPlaylistCount(player)).to.be.equal(2);
        player.dispose();
      });
    });

    describe('getCurrentPlaylistIndex', function () {
      it('should return 0 when playlist is absent', function () {
        expect(utils.getCurrentPlaylistIndex(emptyPlayer)).to.be.equal(0);
      });
    });

    describe('getCurrentPlaylistItem', function () {
      it('should return undefined when playlist is absent', function () {
        expect(utils.getCurrentPlaylistItem(emptyPlayer)).to.be.undefined;
      });
    });
  });

  describe('Get Media', function () {
    describe('parseSource', function () {
      it('should return src property when source is object', function () {
        expect(utils.parseSource({
          src: 'test.url',
          other: 'other'
        })).to.be.equal('test.url');
      });

      it('should return source when it is a string', function () {
        expect(utils.parseSource('test.url')).to.be.equal('test.url');
      });

      it('should return undefined when not object or string', function () {
        expect(utils.parseSource(() => {})).to.be.undefined;
      });
    });

    describe('getMediaUrl', function () {
      it('should return undefined when arg is missing', function () {
        expect(utils.getMediaUrl()).to.be.undefined;
      });

      it('should parse first index when arg is array', function () {
        expect(utils.getMediaUrl(['test.url.1', 'test.url.2'])).to.be.equal('test.url.1');
      });
    });
  });
})
