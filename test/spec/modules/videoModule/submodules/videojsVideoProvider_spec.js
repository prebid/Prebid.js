// Using require style imports for fine grained control of import time
const {VideojsProvider, utils} = require('modules/videojsVideoProvider')

const {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE
} = require('modules/videoModule/constants/ortb.js');
const { AD_POSITION } = require('../../../../../modules/videoModule/constants/ortb');

describe('videojsProvider', function () {
  describe('init', function () {
    let config;
    let adState;
    let timeState;
    let callbackStorage;
    let utilsMock;
    let videojs;

    beforeEach(() => {
      config = {};
      document.body.innerHTML = '';
      videojs = require('video.js').default
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
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
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
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utils);
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
      videojs = require('video.js').default
      config = {divId: 'test'};
      // initialize videojs element
      document.body.innerHTML = `
      <video preload id='test' width="${200}" height="${100}">
      <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
      </video>`
    });

    it('should populate oRTB params without ima present', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();

      const oRTB = provider.getOrtbParams();
      expect(oRTB).to.have.property('video');
      expect(oRTB).to.have.property('content');
      const { video, content } = oRTB;

      expect(video.mimes).to.include(VIDEO_MIME_TYPE.MP4);
      expect(video.protocols).to.deep.equal([]);
      expect(video.h).to.equal(100);
      expect(video.w).to.equal(200);
      // Should we check for these if they are hard coded?
      expect(video.maxextended).to.equal(-1);
      expect(video.boxingallowed).to.equal(1);
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.CLICK_TO_PLAY);
      expect(video.playbackend).to.equal(1);
      expect(video.api).to.deep.equal([]);

      expect(content.url).to.be.equal('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      expect(content).to.not.have.property('len');
    });

    it('should change populated oRTB params when ima present', function () {
      require('videojs-contrib-ads');
      require('videojs-ima');
      document.body.innerHTML = `
      <video preload id='test' width="${200}" height="${100}">
      <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
      </video>`

      let player = videojs('test')
      expect(player).has.property('ima')

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

      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const { video, content } = provider.getOrtbParams();

      expect(video.protocols).to.include(PROTOCOLS.VAST_2_0);
      expect(video.api).to.include(API_FRAMEWORKS.VPAID_2_0);
      expect(video.mimes).to.include(VPAID_MIME_TYPE)
    });

    it('should populate position when fullscreen', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.isFullscreen = () => true;
      const { video, content } = provider.getOrtbParams(); ;
      expect(video.pos).to.equal(7);
    });

    it('should populate length when loaded', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.readyState = () => 1
      player.duration = () => 100
      const { video, content } = provider.getOrtbParams();
      expect(content.len).to.equal(100);
    });

    it('should return the correct playback method for autoplay', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay(true)
      const { video, content } = provider.getOrtbParams();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY);
    });

    it('should return the correct playback method for autoplay muted', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.muted = () => true
      player.autoplay = () => true
      const { video, content } = provider.getOrtbParams();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });

    it('should return the correct playback method for the other autoplay muted', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay = () => 'muted'
      const { video, content } = provider.getOrtbParams();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });

    it('should return the correct playback method for the other autoplay muted', function () {
      const provider = VideojsProvider(config, videojs, null, null, null, utils);
      provider.init();
      const player = videojs.getPlayer('test')
      player.autoplay = () => 'muted'
      const { video, content } = provider.getOrtbParams();
      expect(video.playbackmethod).to.include(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });
  });
});


describe('utils', function(){
  beforeEach(() => {
    expect(window.innerHeight).to.equal(600)
    expect(window.innerWidth).to.equal(785)
  });
  describe('getPositionCode', function(){
    it('should return the correct position when video is above the fold', function () {
      const code = utils.getPositionCode({
        left: window.innerWidth/10,
        top: 0,
        width: window.innerWidth - window.innerWidth/10,
        height: window.innerHeight,
      })
      expect(code).to.equal(AD_POSITION.ABOVE_THE_FOLD)
    });

    it('should return the correct position when video is below the fold', function () {
      const code = utils.getPositionCode({
        left: window.innerWidth/10,
        top: window.innerHeight,
        width: window.innerWidth - window.innerWidth/10,
        height: window.innerHeight/2,
      })
      expect(code).to.equal(AD_POSITION.BELOW_THE_FOLD)
    });

    it('should return the unkown position when the video is out of bounds', function () {
      const code = utils.getPositionCode({
        left: window.innerWidth/10,
        top: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      })
      expect(code).to.equal(AD_POSITION.UNKNOWN)
    });


  })
})


