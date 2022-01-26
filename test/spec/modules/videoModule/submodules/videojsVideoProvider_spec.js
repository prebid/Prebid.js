import {
  VideojsProvider
} from 'modules/videojsVideoProvider';
import videojs from 'video.js';

import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE
} from 'modules/videoModule/constants/ortb.js';

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
      div.setAttribute('id', 'test-div');
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
      div.setAttribute('id', 'test-div');
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

  describe('getOrtbParams', function () {
    beforeEach(() => {
      const test_height = 100;
      const test_width = 200;

      if (videojs.getPlayer('test')) {
        videojs.getPlayer('test').dispose()
      }
      // initialize videojs element
      document.body.innerHTML = `
      <video preload id='test' width="${test_width}" height="${test_height}">
      <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
      </video>`
    });
    it('should populate oRTB params', function () {
      const provider = VideojsProvider({divId: 'test'}, videojs, null, null, null, null);
      provider.init();

      const oRTB = provider.getOrtbParams();
      expect(oRTB).to.have.property('video');
      expect(oRTB).to.have.property('content');
      const { video, content } = oRTB;

      expect(video.mimes).to.include(VIDEO_MIME_TYPE.MP4);
      expect(video.protocols).to.include.members([
        PROTOCOLS.VAST_2_0,
      ]);
      expect(video.h).to.equal(100);
      expect(video.w).to.equal(200);
      expect(video).to.not.have.property('pos');
      // Should we check for these if they are hard coded?
      expect(video.maxextended).to.equal(-1);
      expect(video.boxingallowed).to.equal(1);
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.CLICK_TO_PLAY);
      expect(video.playbackend).to.equal(1);
      expect(video.api).to.include.members([API_FRAMEWORKS.VPAID_2_0]);

      expect(content.url).to.be.equal('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      expect(content).to.not.have.property('len');
    });

    it('should populate position when fullscreen', function () {
      const provider = VideojsProvider({divId: 'test'}, videojs, null, null, null, null);
      provider.init();
      const player = videojs.getPlayer('test')
      player.isFullscreen = () => true;
      const { video, content } = provider.getOrtbParams(); ;
      expect(video.pos).to.equal(7);
    });

    it('should populate length when loaded', function (done) {
      const provider = VideojsProvider({divId: 'test'}, videojs, null, null, null, null);
      provider.init();
      const player = videojs.getPlayer('test')
      player.preload = true
      setTimeout(() => {
        const { video, content } = provider.getOrtbParams();
        expect(content.len).to.equal(9 * 60 + 56);
        done();
      }, 1000);
    });

    it('should return the correct playback method for autoplay', function () {
      const provider = VideojsProvider({divId: 'test'}, videojs, null, null, null, null);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay(true)
      const { video, content } = provider.getOrtbParams();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY);
    });

    it('should return the correct playback method for autoplay muted', function (done) {
      const provider = VideojsProvider({divId: 'test'}, videojs, null, null, null, null);
      provider.init();
      const player = videojs.getPlayer('test')
      player.muted(true)
      player.autoplay(true)
      setTimeout(() => {
        const { video, content } = provider.getOrtbParams();
        expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
        done();
      }, 100);
    });

    it('should return the correct playback method for the other autoplay muted', function (done) {
      const provider = VideojsProvider({divId: 'test'}, videojs, null, null, null, null);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay('muted')
      setTimeout(() => {
        const { video, content } = provider.getOrtbParams();
        expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
        done();
      }, 100);
    });
  });
});
