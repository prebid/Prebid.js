import {
  JWPlayerProvider,
  adStateFactory,
  timeStateFactory,
  callbackStorageFactory,
  utils
} from 'modules/jwplayerVideoProvider';

import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION
} from 'libraries/video/constants/ortb.js';

import { JWPLAYER_VENDOR } from 'libraries/video/constants/vendorCodes.js';

import {
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED, AD_IMPRESSION, AD_PLAY,
  AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END, PLAYLIST, PLAYBACK_REQUEST,
  AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START, SEEK_END, MUTE, VOLUME,
  RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE, CAST, videoEvents
} from 'libraries/video/constants/events.js';

import { PLAYBACK_MODE } from 'libraries/video/constants/constants.js';

function getPlayerMock() {
  return makePlayerFactoryMock({
    getState: function () {},
    setup: function () { return this; },
    getViewable: function () {},
    getPercentViewable: function () {},
    getMute: function () {},
    getVolume: function () {},
    getConfig: function () {},
    getHeight: function () {},
    getContainer: function () {},
    getWidth: function () {},
    getFullscreen: function () {},
    getPlaylistItem: function () {},
    getDuration: function () {},
    playAd: function () {},
    loadAdXml: function () {},
    on: function (eventName, handler) {
      return this;
    },
    off: function () { return this; },
    remove: function () {},
    getAudioTracks: function () {},
    getCurrentAudioTrack: function () {},
    getPlugin: function () {},
    getFloating: function () {}
  })();
}

function makePlayerFactoryMock(playerMock_) {
  const playerFactory = function () {
    return playerMock_;
  }
  playerFactory.version = '8.21.0';
  return playerFactory;
}

function getUtilsMock() {
  return {
    getJwConfig: function () {},
    getPlayerHeight: function () {},
    getPlayerWidth: function () {},
    getPlayerSizeFromAspectRatio: function () {},
    getSupportedMediaTypes: function () {},
    getStartDelay: function () {},
    getPlacement: function () {},
    getPlaybackMethod: function () {},
    isOmidSupported: function () {},
    getSkipParams: function () {},
    getJwEvent: utils.getJwEvent,
    getIsoLanguageCode: function () {},
    getSegments: function () {},
    getContentDatum: function () {}
  };
}

const sharedUtils = { videoEvents };

function addDiv() {
  const div = document.createElement('div');
  div.setAttribute('id', 'test');
  document.body.appendChild(div);
}

function removeDiv() {
  const div = document.getElementById('test');
  if (div) {
    div.remove();
  }
}

describe('JWPlayerProvider', function () {
  beforeEach(() => {
    addDiv();
  });

  afterEach(() => {
    removeDiv();
  });

  describe('init', function () {
    let config;
    let adState;
    let timeState;
    let callbackStorage;
    let utilsMock;

    beforeEach(() => {
      config = { divId: 'test' };
      adState = adStateFactory();
      timeState = timeStateFactory();
      callbackStorage = callbackStorageFactory();
      utilsMock = getUtilsMock();
    });

    it('should trigger failure when jwplayer is missing', function () {
      const provider = JWPlayerProvider(config, null, adState, timeState, callbackStorage, utilsMock, sharedUtils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-1);
    });

    it('should trigger failure when jwplayer version is under min supported version', function () {
      const jwplayerMock = () => {};
      jwplayerMock.version = '8.20.0';
      const provider = JWPlayerProvider(config, jwplayerMock, adState, timeState, callbackStorage, utilsMock, sharedUtils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-2);
    });

    it('should trigger failure when div is missing', function () {
      removeDiv();
      const jwplayerMock = () => {};
      const provider = JWPlayerProvider(config, jwplayerMock, adState, timeState, callbackStorage, utilsMock, sharedUtils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-3);
      addDiv();
      addDiv();
    });

    it('should instantiate the player when uninstantiated', function () {
      const player = getPlayerMock();
      config.playerConfig = {};
      const setupSpy = player.setup = sinon.spy(player.setup);
      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adState, timeState, callbackStorage, utilsMock, sharedUtils);
      provider.init();
      expect(setupSpy.calledOnce).to.be.true;
    });

    it('should trigger setup complete when player is already instantiated', function () {
      const player = getPlayerMock();
      player.getState = () => 'idle';
      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adState, timeState, callbackStorage, utilsMock, sharedUtils);
      const setupComplete = sinon.spy();
      provider.onEvent(SETUP_COMPLETE, setupComplete, {});
      provider.init();
      expect(setupComplete.calledOnce).to.be.true;
    });

    it('should support multiple setup complete event handlers', function () {
      const player = getPlayerMock();
      player.getState = () => 'idle';
      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adState, timeState, callbackStorage, utilsMock, sharedUtils);
      const setupComplete = sinon.spy();
      const setupComplete2 = sinon.spy();
      provider.onEvent(SETUP_COMPLETE, setupComplete, {});
      provider.onEvent(SETUP_COMPLETE, setupComplete2, {});
      provider.init();
      expect(setupComplete.calledOnce).to.be.true;
      expect(setupComplete2.calledOnce).to.be.true;
    });

    it('should not reinstantiate player', function () {
      const player = getPlayerMock();
      player.getState = () => 'idle';
      const setupSpy = player.setup = sinon.spy();
      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adState, timeState, callbackStorage, utilsMock, sharedUtils);
      provider.init();
      expect(setupSpy.called).to.be.false;
    });
  });

  describe('getId', function () {
    it('should return configured div id', function () {
      const provider = JWPlayerProvider({ divId: 'test_id' }, undefined, undefined, undefined, undefined, undefined, sharedUtils);
      expect(provider.getId()).to.be.equal('test_id');
    });
  });

  describe('getOrtbVideo', function () {
    it('should populate oRTB Video params', function () {
      const test_media_type = VIDEO_MIME_TYPE.MP4;
      const test_height = 100;
      const test_width = 200;
      const test_start_delay = 5;
      const test_placement = PLACEMENT.ARTICLE;
      const test_battr = 'battr';
      const test_playback_method = PLAYBACK_METHODS.CLICK_TO_PLAY;
      const test_skip = 0;

      const config = { divId: 'test' };
      const player = getPlayerMock();
      const utils = getUtilsMock();

      player.getConfig = () => ({
        advertising: {
          battr: test_battr
        }
      });
      player.getHeight = () => test_height;
      player.getWidth = () => test_width;
      player.getFullscreen = () => true; //

      utils.getPlayerHeight = () => 100;
      utils.getPlayerWidth = () => 200;
      utils.getSupportedMediaTypes = () => [test_media_type];
      utils.getStartDelay = () => test_start_delay;
      utils.getPlacement = () => test_placement;
      utils.getPlaybackMethod = () => test_playback_method;
      utils.isOmidSupported = () => true; //
      utils.getSkipParams = () => ({ skip: test_skip });

      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adStateFactory(), {}, {}, utils, sharedUtils);
      provider.init();
      let video = provider.getOrtbVideo();

      expect(video.mimes).to.include(VIDEO_MIME_TYPE.MP4);
      expect(video.protocols).to.include.members([
        PROTOCOLS.VAST_2_0,
        PROTOCOLS.VAST_3_0,
        PROTOCOLS.VAST_4_0,
        PROTOCOLS.VAST_2_0_WRAPPER,
        PROTOCOLS.VAST_3_0_WRAPPER,
        PROTOCOLS.VAST_4_0_WRAPPER
      ]);
      expect(video.h).to.equal(test_height);
      expect(video.w).to.equal(test_width);
      expect(video.startdelay).to.equal(test_start_delay);
      expect(video.placement).to.equal(test_placement);
      expect(video.battr).to.equal(test_battr);
      expect(video.maxextended).to.equal(-1);
      expect(video.boxingallowed).to.equal(1);
      expect(video.playbackmethod).to.include(test_playback_method);
      expect(video.playbackend).to.equal(1);
      expect(video.api).to.have.length(2);
      expect(video.api).to.include.members([API_FRAMEWORKS.VPAID_2_0, API_FRAMEWORKS.OMID_1_0]); //
      expect(video.skip).to.equal(test_skip);
      expect(video.pos).to.equal(7); //

      player.getFullscreen = () => false;
      utils.isOmidSupported = () => false;

      video = provider.getOrtbVideo();
      expect(video).to.not.have.property('pos');
      expect(video.api).to.have.length(1);
      expect(video.api).to.include(API_FRAMEWORKS.VPAID_2_0);
      expect(video.api).to.not.include(API_FRAMEWORKS.OMID_1_0);
    });
  });

  describe('getOrtbContent', function () {
    it('should populate oRTB Content params', function () {
      const test_item = {
        mediaid: 'id',
        file: 'file',
        title: 'title',
        iabCategories: 'iabCategories',
        tags: 'keywords',
      };
      const test_duration = 30;
      let test_playback_mode = PLAYBACK_MODE.VOD;//

      const player = getPlayerMock();
      player.getPlaylistItem = () => test_item;
      const utils = getUtilsMock();

      const timeState = {
        getState: () => ({
          duration: test_duration,
          playbackMode: test_playback_mode
        })
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, {}, utils, sharedUtils);
      provider.init();

      let content = provider.getOrtbContent();
      expect(content.id).to.be.equal('jw_' + test_item.mediaid);
      expect(content.url).to.be.equal(test_item.file);
      expect(content.title).to.be.equal(test_item.title);
      expect(content.cat).to.be.equal(test_item.iabCategories);
      expect(content.keywords).to.be.equal(test_item.tags);
      expect(content.len).to.be.equal(test_duration);
      expect(content.livestream).to.be.equal(0);//

      test_playback_mode = PLAYBACK_MODE.LIVE;

      content = provider.getOrtbContent();
      expect(content.livestream).to.be.equal(1);

      test_playback_mode = PLAYBACK_MODE.DVR;

      content = provider.getOrtbContent();
      expect(content.livestream).to.be.equal(1);
    });
  });

  describe('setAdTagUrl', function () {
    it('should call playAd', function () {
      const player = getPlayerMock();
      const playAdSpy = player.playAd = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), {}, {}, {}, {}, sharedUtils);
      provider.init();
      provider.setAdTagUrl('tag');
      expect(playAdSpy.called).to.be.true;
      const argument = playAdSpy.args[0][0];
      expect(argument).to.be.equal('tag');
    });
  });

  describe('setAdXml', function () {
    it('should not call loadAdXml when xml is missing', function () {
      const player = getPlayerMock();
      const loadSpy = player.loadAdXml = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), {}, {}, {}, {}, sharedUtils);
      provider.init();
      provider.setAdXml();
      expect(loadSpy.called).to.be.false;
    });

    it('should call loadAdXml with xml and options', function () {
      const player = getPlayerMock();
      const loadSpy = player.loadAdXml = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), {}, {}, {}, {}, sharedUtils);
      provider.init();
      const xml = '<VAST></VAST>';
      const options = {foo: 'bar'};
      provider.setAdXml(xml, options);
      expect(loadSpy.calledOnceWith(xml, options)).to.be.true;
    });
  });

  describe('events', function () {
    it('should register event listener on player', function () {
      const player = getPlayerMock();
      const onSpy = player.on = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = () => {};
      provider.onEvent(PLAY, callback, {});
      expect(onSpy.calledOnce).to.be.true;
      const eventName = onSpy.args[0][0];
      expect(eventName).to.be.equal('play');
    });

    it('should remove event listener on player', function () {
      const player = getPlayerMock();
      const offSpy = player.off = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), utils, sharedUtils);
      provider.init();
      const callback = () => {};
      provider.onEvent(AD_IMPRESSION, callback, {});
      provider.offEvent(AD_IMPRESSION, callback);
      expect(offSpy.calledOnce).to.be.true;
      const eventName = offSpy.args[0][0];
      expect(eventName).to.be.equal('adViewableImpression');
    });

    it('should handle setup complete callbacks', function () {
      const player = getPlayerMock();
      player.getState = () => 'idle';
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      const setupComplete = sinon.spy();
      provider.onEvent(SETUP_COMPLETE, setupComplete, {});
      provider.init();
      expect(setupComplete.calledOnce).to.be.true;
      const payload = setupComplete.args[0][1];
      expect(payload.type).to.be.equal(SETUP_COMPLETE);
      expect(payload.divId).to.be.equal('test');
    });

    it('should handle setup failed callbacks', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.type).to.be.equal(SETUP_FAILED);
      expect(payload.divId).to.be.equal('test');
    });

    it('should not throw when onEvent is called and player is null', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      const callback = () => {};
      provider.onEvent(PLAY, callback, {});
    });

    it('should handle AD_REQUEST event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(AD_REQUEST, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_REQUEST); // event name

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { tag: 'test-ad-tag' };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.adTagUrl).to.be.equal('test-ad-tag');
    });

    it('should handle AD_BREAK_START event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const timeState = {
        clearState: sinon.spy(),
        getState: () => ({})
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(AD_BREAK_START, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_BREAK_START);

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { adPosition: 'pre' };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.offset).to.be.equal('pre');
    });

    it('should handle AD_LOADED event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const expectedAdState = {
        adTagUrl: 'test-ad-tag',
        vastAdId: 'ad-123',
        skip: 1,
        skipmin: 7,
        skipafter: 5
      };

      const adState = {
        updateForEvent: sinon.spy(),
        updateState: sinon.spy(),
        getState: () => expectedAdState
      };

      player.getConfig = () => ({ advertising: { skipoffset: 5 } });

      const utils = getUtilsMock();
      utils.getSkipParams = () => ({ skip: 1, skipmin: 7, skipafter: 5 });

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adState, timeStateFactory(), callbackStorageFactory(), utils, sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(AD_LOADED, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_LOADED);

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { tag: 'test-ad-tag', id: 'ad-123' };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload).to.deep.equal(expectedAdState);
    });

    it('should handle AD_STARTED event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const expectedAdState = {
        adTagUrl: 'test-ad-tag',
        vastAdId: 'ad-123'
      };

      const adState = {
        getState: () => expectedAdState
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adState, timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(AD_STARTED, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_IMPRESSION); // AD_STARTED maps to AD_IMPRESSION

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      eventHandler({});

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload).to.deep.equal(expectedAdState);
    });

    it('should handle AD_IMPRESSION event payload', function () {
      const player = getPlayerMock();

      const expectedAdState = {
        adTagUrl: 'test-ad-tag',
        vastAdId: 'ad-123'
      };

      const expectedTimeState = {
        time: 15,
        duration: 30
      };

      const adState = {
        getState: () => expectedAdState
      };

      const timeState = {
        getState: () => expectedTimeState
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adState, timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(AD_IMPRESSION, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('adViewableImpression'); // AD_IMPRESSION maps to 'adViewableImpression'

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      eventHandler({});

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload).to.deep.equal({ ...expectedAdState, ...expectedTimeState });
    });

    it('should handle AD_TIME event payload', function () {
      const player = getPlayerMock();

      const timeState = {
        updateForEvent: sinon.spy(),
        getState: () => ({})
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(AD_TIME, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_TIME);

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { tag: 'test-ad-tag', position: 10, duration: 30 };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.adTagUrl).to.be.equal('test-ad-tag');
      expect(payload.time).to.be.equal(10);
      expect(payload.duration).to.be.equal(30);
    });

    it('should handle AD_SKIPPED event payload', function () {
      const player = getPlayerMock();

      const adState = {
        clearState: sinon.spy()
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adState, timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(AD_SKIPPED, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_SKIPPED);

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { position: 15, duration: 30 };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.time).to.be.equal(15);
      expect(payload.duration).to.be.equal(30);
    });

    it('should handle AD_ERROR event payload', function () {
      const player = getPlayerMock();

      const expectedAdState = {
        adTagUrl: 'test-ad-tag',
        vastAdId: 'ad-123'
      };

      const expectedTimeState = {
        time: 15,
        duration: 30
      };

      const adState = {
        clearState: sinon.spy(),
        getState: () => expectedAdState
      };

      const timeState = {
        getState: () => expectedTimeState
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adState, timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(AD_ERROR, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_ERROR);

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = {
        sourceError: new Error('Player Ad error'),
        adErrorCode: 2001,
        code: 3001,
        message: 'Ad playback error occurred'
      };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.sourceError).to.be.equal(mockEvent.sourceError);
      expect(payload.playerErrorCode).to.be.equal(2001);
      expect(payload.vastErrorCode).to.be.equal(3001);
      expect(payload.errorMessage).to.be.equal('Ad playback error occurred');
      expect(payload.adTagUrl).to.be.equal('test-ad-tag');
      expect(payload.vastAdId).to.be.equal('ad-123');
      expect(payload.time).to.be.equal(15);
      expect(payload.duration).to.be.equal(30);
    });

    it('should handle AD_COMPLETE event payload', function () {
      const player = getPlayerMock();

      const adState = {
        clearState: sinon.spy()
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adState, timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(AD_COMPLETE, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_COMPLETE);

      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { tag: 'test-ad-tag' };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.adTagUrl).to.be.equal('test-ad-tag');
    });

    it('should handle AD_BREAK_END event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(AD_BREAK_END, callback, {});

      // Verify player.on was called
      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(AD_BREAK_END);

      // Get the event handler that was passed to player.on
      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { adPosition: 'post' };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.offset).to.be.equal('post');
    });

    it('should handle PLAYLIST event payload', function () {
      const player = getPlayerMock();
      player.getConfig = () => ({ autostart: true });

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(PLAYLIST, callback, {});

      // Verify player.on was called
      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(PLAYLIST);

      // Get the event handler that was passed to player.on
      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { playlist: [{}, {}, {}] };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.playlistItemCount).to.be.equal(3);
      expect(payload.autostart).to.be.true;
    });

    it('should handle PLAYBACK_REQUEST event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(PLAYBACK_REQUEST, callback, {});

      // Verify player.on was called
      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('playAttempt'); // PLAYBACK_REQUEST maps to 'playAttempt'

      // Get the event handler that was passed to player.on
      const eventHandler = onSpy.args[0][1];

      // Simulate the player calling the event handler
      const mockEvent = { playReason: 'user-interaction' };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.playReason).to.be.equal('user-interaction');
    });

    it('should handle AUTOSTART_BLOCKED event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(AUTOSTART_BLOCKED, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('autostartNotAllowed'); // AUTOSTART_BLOCKED maps to 'autostartNotAllowed'

      const eventHandler = onSpy.args[0][1];
      const mockEvent = {
        error: new Error('Autostart blocked'),
        code: 1001,
        message: 'User interaction required'
      };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.sourceError).to.be.equal(mockEvent.error);
      expect(payload.errorCode).to.be.equal(1001);
      expect(payload.errorMessage).to.be.equal('User interaction required');
    });

    it('should handle PLAY_ATTEMPT_FAILED event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(PLAY_ATTEMPT_FAILED, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(PLAY_ATTEMPT_FAILED);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = {
        playReason: 'autoplay',
        sourceError: new Error('Play failed'),
        code: 2001,
        message: 'Media not supported'
      };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.playReason).to.be.equal('autoplay');
      expect(payload.sourceError).to.be.equal(mockEvent.sourceError);
      expect(payload.errorCode).to.be.equal(2001);
      expect(payload.errorMessage).to.be.equal('Media not supported');
    });

    it('should handle CONTENT_LOADED event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(CONTENT_LOADED, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('playlistItem'); // CONTENT_LOADED maps to 'playlistItem'

      const eventHandler = onSpy.args[0][1];
      const mockEvent = {
        item: {
          mediaid: 'content-123',
          file: 'video.mp4',
          title: 'Test Video',
          description: 'Test Description',
          tags: ['tag1', 'tag2']
        },
        index: 0
      };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.contentId).to.be.equal('content-123');
      expect(payload.contentUrl).to.be.equal('video.mp4');
      expect(payload.title).to.be.equal('Test Video');
      expect(payload.description).to.be.equal('Test Description');
      expect(payload.playlistIndex).to.be.equal(0);
      expect(payload.contentTags).to.deep.equal(['tag1', 'tag2']);
    });

    it('should handle BUFFER event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const expectedTimeState = {
        time: 15,
        duration: 30
      };

      const timeState = {
        getState: () => expectedTimeState
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(BUFFER, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(BUFFER);

      const eventHandler = onSpy.args[0][1];
      eventHandler({});

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload).to.deep.equal(expectedTimeState);
    });

    it('should handle TIME event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const timeState = {
        updateForEvent: sinon.spy(),
        getState: () => ({})
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(TIME, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(TIME);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { position: 25, duration: 120 };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.position).to.be.equal(25);
      expect(payload.duration).to.be.equal(120);
    });

    it('should handle SEEK_START event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(SEEK_START, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('seek'); // SEEK_START maps to 'seek'

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { position: 10, offset: 30, duration: 120 };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.position).to.be.equal(10);
      expect(payload.destination).to.be.equal(30);
      expect(payload.duration).to.be.equal(120);
    });

    it('should handle SEEK_END event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(SEEK_END, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('seeked'); // SEEK_END maps to 'seeked'

      const eventHandler = onSpy.args[0][1];

      // First trigger a seek start to set pendingSeek
      const seekStartCallback = sinon.spy();
      const seekStartOnSpy = sinon.spy();
      player.on = seekStartOnSpy;
      provider.onEvent(SEEK_START, seekStartCallback, {});
      const seekStartHandler = seekStartOnSpy.args[0][1];
      seekStartHandler({ position: 10, offset: 30, duration: 120 });

      // Now trigger seek end
      eventHandler({});

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.position).to.be.equal(30);
      expect(payload.duration).to.be.equal(120);
    });

    it('should handle MUTE event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(MUTE, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(MUTE);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { mute: true };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.mute).to.be.true;
    });

    it('should handle VOLUME event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(VOLUME, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(VOLUME);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { volume: 75 };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.volumePercentage).to.be.equal(75);
    });

    it('should handle RENDITION_UPDATE event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(RENDITION_UPDATE, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('visualQuality'); // RENDITION_UPDATE maps to 'visualQuality'

      const eventHandler = onSpy.args[0][1];
      const mockEvent = {
        bitrate: 2000000,
        level: { width: 1920, height: 1080 },
        frameRate: 30
      };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.videoReportedBitrate).to.be.equal(2000000);
      expect(payload.audioReportedBitrate).to.be.equal(2000000);
      expect(payload.encodedVideoWidth).to.be.equal(1920);
      expect(payload.encodedVideoHeight).to.be.equal(1080);
      expect(payload.videoFramerate).to.be.equal(30);
    });

    it('should handle ERROR event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(ERROR, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(ERROR);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = {
        sourceError: new Error('Player error'),
        code: 3001,
        message: 'Media error occurred'
      };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.sourceError).to.be.equal(mockEvent.sourceError);
      expect(payload.errorCode).to.be.equal(3001);
      expect(payload.errorMessage).to.be.equal('Media error occurred');
    });

    it('should handle COMPLETE event payload', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy();
      player.on = onSpy;

      const timeState = {
        clearState: sinon.spy()
      };

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent(COMPLETE, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(COMPLETE);

      const eventHandler = onSpy.args[0][1];
      eventHandler({});

      expect(callback.calledOnce).to.be.true;
    });

    it('should handle FULLSCREEN event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(FULLSCREEN, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(FULLSCREEN);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { fullscreen: true };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.fullscreen).to.be.true;
    });

    it('should handle PLAYER_RESIZE event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(PLAYER_RESIZE, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal('resize'); // PLAYER_RESIZE maps to 'resize'

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { height: 480, width: 640 };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.height).to.be.equal(480);
      expect(payload.width).to.be.equal(640);
    });

    it('should handle VIEWABLE event payload', function () {
      const player = getPlayerMock();
      player.getPercentViewable = () => 0.75;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(VIEWABLE, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(VIEWABLE);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { viewable: true };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.viewable).to.be.true;
      expect(payload.viewabilityPercentage).to.be.equal(75);
    });

    it('should handle CAST event payload', function () {
      const player = getPlayerMock();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();

      const onSpy = sinon.spy();
      player.on = onSpy;

      provider.onEvent(CAST, callback, {});

      expect(onSpy.calledOnce).to.be.true;
      expect(onSpy.args[0][0]).to.equal(CAST);

      const eventHandler = onSpy.args[0][1];
      const mockEvent = { active: true };
      eventHandler(mockEvent);

      expect(callback.calledOnce).to.be.true;
      const payload = callback.args[0][1];
      expect(payload.casting).to.be.true;
    });

    it('should handle unknown events', function () {
      const player = getPlayerMock();
      const onSpy = sinon.spy(player, 'on');
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = sinon.spy();
      provider.onEvent('UNKNOWN_EVENT', callback, {});

      expect(onSpy.called).to.be.false;
    });

    it('should handle offEvent without callback', function () {
      const player = getPlayerMock();
      const offSpy = player.off = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      provider.offEvent(AD_IMPRESSION);
      expect(offSpy.calledOnce).to.be.true;
    });

    it('should handle offEvent with non-existent callback', function () {
      const player = getPlayerMock();
      const offSpy = player.off = sinon.spy();
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const callback = () => {};
      provider.offEvent(AD_IMPRESSION, callback);
      expect(offSpy.called).to.be.false;
    });
  });

  describe('destroy', function () {
    it('should remove and null the player', function () {
      const player = getPlayerMock();
      const removeSpy = player.remove = sinon.spy();
      player.remove = removeSpy;
      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      provider.destroy();
      provider.destroy();
      expect(removeSpy.calledOnce).to.be.true;
    });

    it('should not throw when destroy is called and player is null', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.destroy();
    });
  });

  describe('setupPlayer', function () {
    it('should setup player with config', function () {
      const player = getPlayerMock();
      const setupSpy = player.setup = sinon.spy(() => player);
      const onSpy = player.on = sinon.spy(() => player);

      const config = { divId: 'test', playerConfig: { file: 'video.mp4' } };
      const utils = getUtilsMock();
      utils.getJwConfig = () => ({ file: 'video.mp4', autostart: false });

      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), utils, sharedUtils);
      provider.init();

      expect(setupSpy.calledOnce).to.be.true;
      expect(setupSpy.args[0][0]).to.deep.equal({ file: 'video.mp4', autostart: false });
      expect(onSpy.calledTwice).to.be.true;
      expect(onSpy.args[0][0]).to.be.equal('ready');
      expect(onSpy.args[1][0]).to.be.equal('setupError');
    });

    it('should handle setup without config', function () {
      const player = getPlayerMock();
      const setupSpy = player.setup = sinon.spy();

      const config = { divId: 'test' };
      const provider = JWPlayerProvider(config, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();

      expect(setupSpy.called).to.be.false;
    });
  });

  describe('getOrtbVideo edge cases', function () {
    it('should handle missing player', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      const result = provider.getOrtbVideo();
      expect(result).to.be.undefined;
    });

    it('should not throw when missing config', function () {
      const player = getPlayerMock();
      player.getConfig = () => null;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const result = provider.getOrtbVideo();
      expect(result).to.be.an('object');
    });

    it('should not throw when missing advertising config', function () {
      const player = getPlayerMock();
      player.getConfig = () => ({});

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const result = provider.getOrtbVideo();
      expect(result).to.be.an('object');
    });

    it('should calculate size from aspect ratio when height and width are null', function () {
      const player = getPlayerMock();
      player.getConfig = () => ({
        advertising: { battr: 'test' },
        aspectratio: '16:9',
        width: '100%'
      });
      player.getContainer = () => ({ clientWidth: 800, clientHeight: 600 });

      const utils = getUtilsMock();
      utils.getPlayerHeight = () => null;
      utils.getPlayerWidth = () => null;
      utils.getPlayerSizeFromAspectRatio = () => ({ height: 450, width: 800 });
      utils.getSupportedMediaTypes = () => [VIDEO_MIME_TYPE.MP4];
      utils.getStartDelay = () => 0;
      utils.getPlacement = () => PLACEMENT.INSTREAM;
      utils.getPlaybackMethod = () => PLAYBACK_METHODS.CLICK_TO_PLAY;
      utils.isOmidSupported = () => false;
      utils.getSkipParams = () => ({});

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), utils, sharedUtils);
      provider.init();
      const result = provider.getOrtbVideo();

      expect(result.h).to.be.equal(450);
      expect(result.w).to.be.equal(800);
    });
  });

  describe('getOrtbContent edge cases', function () {
    it('should handle missing player', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      const result = provider.getOrtbContent();
      expect(result).to.be.undefined;
    });

    it('should handle missing playlist item', function () {
      const player = getPlayerMock();
      player.getPlaylistItem = () => null;
      player.getDuration = () => 120;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const result = provider.getOrtbContent();
      expect(result).to.be.an('object');
      expect(result.url).to.be.undefined;
      expect(result.len).to.be.equal(120);
    });

    it('should handle missing duration in timeState', function () {
      const player = getPlayerMock();
      player.getPlaylistItem = () => ({ mediaid: 'test' });
      player.getDuration = () => 120;

      const timeState = timeStateFactory();
      timeState.getState = () => ({ duration: undefined });

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const result = provider.getOrtbContent();

      expect(result.len).to.be.equal(120);
    });

    it('should handle missing mediaId', function () {
      const player = getPlayerMock();
      player.getPlaylistItem = () => ({ file: 'video.mp4' });

      const timeState = timeStateFactory();
      timeState.getState = () => ({ duration: 120 });

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const result = provider.getOrtbContent();

      expect(result).to.not.have.property('id');
    });

    it('should handle missing jwpseg', function () {
      const player = getPlayerMock();
      player.getPlaylistItem = () => ({ mediaid: 'test', file: 'video.mp4' });

      const timeState = timeStateFactory();
      timeState.getState = () => ({ duration: 120 });

      const utils = getUtilsMock();
      utils.getSegments = () => undefined;
      utils.getContentDatum = () => undefined;
      utils.getIsoLanguageCode = () => undefined;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), utils, sharedUtils);
      provider.init();
      const result = provider.getOrtbContent();

      expect(result).to.not.have.property('data');
    });

    it('should handle missing language', function () {
      const player = getPlayerMock();
      player.getPlaylistItem = () => ({ mediaid: 'test', file: 'video.mp4' });

      const timeState = timeStateFactory();
      timeState.getState = () => ({ duration: 120 });

      const utils = getUtilsMock();
      utils.getSegments = () => undefined;
      utils.getContentDatum = () => undefined;
      utils.getIsoLanguageCode = () => undefined;

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeState, callbackStorageFactory(), utils, sharedUtils);
      provider.init();
      const result = provider.getOrtbContent();

      expect(result).to.not.have.property('language');
    });
  });

  describe('setAdTagUrl edge cases', function () {
    it('should not throw when setAdTagUrl is called and player is null', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.setAdTagUrl('test-url');
    });

    it('should handle missing adTagUrl', function () {
      const player = getPlayerMock();
      const playAdSpy = player.playAd = sinon.spy();

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      provider.setAdTagUrl(null, { adXml: 'test-vast' });

      expect(playAdSpy.calledOnce).to.be.true;
      expect(playAdSpy.args[0][0]).to.be.equal('test-vast');
    });

    it('should pass options to playAd', function () {
      const player = getPlayerMock();
      const playAdSpy = player.playAd = sinon.spy();

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      const options = { adXml: '<VAST></VAST>' };
      provider.setAdTagUrl('test-url', options);

      expect(playAdSpy.calledOnce).to.be.true;
      expect(playAdSpy.args[0][0]).to.be.equal('test-url');
      expect(playAdSpy.args[0][1]).to.be.equal(options);
    });
  });

  describe('setAdXml edge cases', function () {
    it('should not throw when setAdXml is called and player is null', function () {
      const provider = JWPlayerProvider({ divId: 'test' }, null, adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.setAdXml('<VAST></VAST>');
    });

    it('should handle missing options', function () {
      const player = getPlayerMock();
      const loadSpy = player.loadAdXml = sinon.spy();

      const provider = JWPlayerProvider({ divId: 'test' }, makePlayerFactoryMock(player), adStateFactory(), timeStateFactory(), callbackStorageFactory(), getUtilsMock(), sharedUtils);
      provider.init();
      provider.setAdXml('<VAST></VAST>');

      expect(loadSpy.calledOnce).to.be.true;
      expect(loadSpy.args[0][0]).to.be.equal('<VAST></VAST>');
      expect(loadSpy.args[0][1]).to.be.undefined;
    });
  });
});

describe('adStateFactory', function () {
  let adState = adStateFactory();

  beforeEach(() => {
    adState.clearState();
  });

  it('should update state for ad events', function () {
    const tag = 'tag';
    const adPosition = 'adPosition';
    const timeLoading = 'timeLoading';
    const id = 'id';
    const description = 'description';
    const adsystem = 'adsystem';
    const adtitle = 'adtitle';
    const advertiserId = 'advertiserId';
    const advertiser = 'advertiser';
    const dealId = 'dealId';
    const linear = 'linear';
    const vastversion = 'vastversion';
    const mediaFile = 'mediaFile';
    const adId = 'adId';
    const universalAdId = 'universalAdId';
    const creativeAdId = 'creativeAdId';
    const creativetype = 'creativetype';
    const clickThroughUrl = 'clickThroughUrl';
    const witem = 'witem';
    const wcount = 'wcount';
    const podcount = 'podcount';
    const sequence = 'sequence';

    adState.updateForEvent({
      tag,
      adPosition,
      timeLoading,
      id,
      description,
      adsystem,
      adtitle,
      advertiserId,
      advertiser,
      dealId,
      linear,
      vastversion,
      mediaFile,
      adId,
      universalAdId,
      creativeAdId,
      creativetype,
      clickThroughUrl,
      witem,
      wcount,
      podcount,
      sequence
    });

    const state = adState.getState();
    expect(state.adTagUrl).to.equal(tag);
    expect(state.offset).to.equal(adPosition);
    expect(state.loadTime).to.equal(timeLoading);
    expect(state.vastAdId).to.equal(id);
    expect(state.adDescription).to.equal(description);
    expect(state.adServer).to.equal(adsystem);
    expect(state.adTitle).to.equal(adtitle);
    expect(state.advertiserId).to.equal(advertiserId);
    expect(state.dealId).to.equal(dealId);
    expect(state.linear).to.equal(linear);
    expect(state.vastVersion).to.equal(vastversion);
    expect(state.creativeUrl).to.equal(mediaFile);
    expect(state.adId).to.equal(adId);
    expect(state.universalAdId).to.equal(universalAdId);
    expect(state.creativeId).to.equal(creativeAdId);
    expect(state.creativeType).to.equal(creativetype);
    expect(state.redirectUrl).to.equal(clickThroughUrl);
    expect(state).to.have.property('adPlacementType');
    expect(state.adPlacementType).to.be.undefined;
    expect(state.waterfallIndex).to.equal(witem);
    expect(state.waterfallCount).to.equal(wcount);
    expect(state.adPodCount).to.equal(podcount);
    expect(state.adPodIndex).to.equal(sequence);
  });

  it('should convert placement to oRTB value', function () {
    adState.updateForEvent({
      placement: 'instream'
    });

    let state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.INSTREAM);

    adState.updateForEvent({
      placement: 'banner'
    });

    state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.BANNER);

    adState.updateForEvent({
      placement: 'article'
    });

    state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.ARTICLE);

    adState.updateForEvent({
      placement: 'feed'
    });

    state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.FEED);

    adState.updateForEvent({
      placement: 'interstitial'
    });

    state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.INTERSTITIAL);

    adState.updateForEvent({
      placement: 'slider'
    });

    state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.SLIDER);

    adState.updateForEvent({
      placement: 'floating'
    });

    state = adState.getState();
    expect(state.adPlacementType).to.be.equal(PLACEMENT.FLOATING);
  });

  it('should handle unknown placement values', function () {
    adState.updateForEvent({
      placement: 'unknown'
    });

    const state = adState.getState();
    expect(state.adPlacementType).to.be.undefined;
  });

  it('should handle missing placement', function () {
    adState.updateForEvent({});

    const state = adState.getState();
    expect(state.adPlacementType).to.be.undefined;
  });

  it('should handle partial event data', function () {
    adState.updateForEvent({
      tag: 'test-tag',
      id: 'test-id'
    });

    const state = adState.getState();
    expect(state.adTagUrl).to.equal('test-tag');
    expect(state.vastAdId).to.equal('test-id');
    expect(state.adDescription).to.be.undefined;
    expect(state.adServer).to.be.undefined;
  });

  it('should handle null and undefined values', function () {
    adState.updateForEvent({
      tag: null,
      id: undefined,
      description: null,
      adsystem: undefined
    });

    const state = adState.getState();
    expect(state.adTagUrl).to.be.null;
    expect(state.vastAdId).to.be.undefined;
    expect(state.adDescription).to.be.null;
    expect(state.adServer).to.be.undefined;
  });

  it('should handle googima client wrapper ad ids', function () {
    const mockImaAd = {
      ad: {
        a: {
          adWrapperIds: ['wrapper1', 'wrapper2']
        }
      }
    };

    adState.updateForEvent({
      client: 'googima',
      ima: mockImaAd
    });

    const state = adState.getState();
    expect(state.wrapperAdIds).to.deep.equal(['wrapper1', 'wrapper2']);
  });

  it('should handle googima client without wrapper ad ids', function () {
    const mockImaAd = {
      ad: {}
    };

    adState.updateForEvent({
      client: 'googima',
      ima: mockImaAd
    });

    const state = adState.getState();
    expect(state.wrapperAdIds).to.be.undefined;
  });

  it('should handle googima client without ima object', function () {
    adState.updateForEvent({
      client: 'googima'
    });

    const state = adState.getState();
    expect(state.wrapperAdIds).to.be.undefined;
  });

  it('should support wrapper ad ids for non-googima clients', function () {
    adState.updateForEvent({
      client: 'vast',
      wrapperAdIds: ['existing']
    });

    const state = adState.getState();
    expect(state.wrapperAdIds).to.deep.equal(['existing']);
  });

  it('should clear state when clearState is called', function () {
    adState.updateForEvent({
      tag: 'test-tag',
      id: 'test-id'
    });

    let state = adState.getState();
    expect(state.adTagUrl).to.equal('test-tag');
    expect(state.vastAdId).to.equal('test-id');

    adState.clearState();
    state = adState.getState();
    expect(state.adTagUrl).to.be.undefined;
    expect(state.vastAdId).to.be.undefined;
  });

  it('should update state with additional properties', function () {
    adState.updateForEvent({
      tag: 'test-tag'
    });

    adState.updateState({
      skip: 1,
      skipmin: 5,
      skipafter: 3
    });

    const state = adState.getState();
    expect(state.adTagUrl).to.equal('test-tag');
    expect(state.skip).to.equal(1);
    expect(state.skipmin).to.equal(5);
    expect(state.skipafter).to.equal(3);
  });
});

describe('timeStateFactory', function () {
  let timeState = timeStateFactory();

  beforeEach(() => {
    timeState.clearState();
  });

  it('should update state for VOD time event', function() {
    const position = 5;
    const test_duration = 30;

    timeState.updateForEvent({
      position,
      duration: test_duration
    });

    const { time, duration, playbackMode } = timeState.getState();
    expect(time).to.be.equal(position);
    expect(duration).to.be.equal(test_duration);
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.VOD);
  });

  it('should update state for LIVE time events', function() {
    const position = 0;
    const test_duration = 0;

    timeState.updateForEvent({
      position,
      duration: test_duration
    });

    const { time, duration, playbackMode } = timeState.getState();
    expect(time).to.be.equal(position);
    expect(duration).to.be.equal(test_duration);
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.LIVE);
  });

  it('should update state for DVR time events', function() {
    const position = -5;
    const test_duration = -30;

    timeState.updateForEvent({
      position,
      duration: test_duration
    });

    const { time, duration, playbackMode } = timeState.getState();
    expect(time).to.be.equal(position);
    expect(duration).to.be.equal(test_duration);
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.DVR);
  });

  it('should handle partial event data', function() {
    timeState.updateForEvent({
      position: 10
    });

    const { time, duration, playbackMode } = timeState.getState();
    expect(time).to.be.equal(10);
    expect(duration).to.be.undefined;
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.LIVE);
  });

  it('should handle null and undefined values', function() {
    timeState.updateForEvent({
      position: null,
      duration: undefined
    });

    const { time, duration, playbackMode } = timeState.getState();
    expect(time).to.be.null;
    expect(duration).to.be.undefined;
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.LIVE);
  });

  it('should clear state when clearState is called', function() {
    timeState.updateForEvent({
      position: 15,
      duration: 60
    });

    let state = timeState.getState();
    expect(state.time).to.be.equal(15);
    expect(state.duration).to.be.equal(60);

    timeState.clearState();
    state = timeState.getState();
    expect(state.time).to.be.undefined;
    expect(state.duration).to.be.undefined;
  });

  it('should update state with additional properties', function() {
    timeState.updateForEvent({
      position: 20,
      duration: 120
    });

    timeState.updateState({
      playbackMode: PLAYBACK_MODE.VOD
    });

    const state = timeState.getState();
    expect(state.time).to.be.equal(20);
    expect(state.duration).to.be.equal(120);
    expect(state.playbackMode).to.be.equal(PLAYBACK_MODE.VOD);
  });

  it('should handle zero duration as LIVE mode', function() {
    timeState.updateForEvent({
      position: 0,
      duration: 0
    });

    const { playbackMode } = timeState.getState();
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.LIVE);
  });

  it('should handle negative duration as DVR mode', function() {
    timeState.updateForEvent({
      position: -10,
      duration: -60
    });

    const { playbackMode } = timeState.getState();
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.DVR);
  });

  it('should handle positive duration as VOD mode', function() {
    timeState.updateForEvent({
      position: 30,
      duration: 180
    });

    const { playbackMode } = timeState.getState();
    expect(playbackMode).to.be.equal(PLAYBACK_MODE.VOD);
  });
});

describe('callbackStorageFactory', function () {
  const callbackStorage = callbackStorageFactory();

  beforeEach(() => {
    callbackStorage.clearStorage();
  });

  it('should store callbacks', function () {
    const callback1 = () => 'callback1';
    const eventHandler1 = () => 'eventHandler1';
    callbackStorage.storeCallback('event', eventHandler1, callback1);

    const callback2 = () => 'callback2';
    const eventHandler2 = () => 'eventHandler2';
    callbackStorage.storeCallback('event', eventHandler2, callback2);

    const callback3 = () => 'callback3';

    expect(callbackStorage.getCallback('event', callback1)).to.be.equal(eventHandler1);
    expect(callbackStorage.getCallback('event', callback2)).to.be.equal(eventHandler2);
    expect(callbackStorage.getCallback('event', callback3)).to.be.undefined;
  });

  it('should remove callbacks after retrieval', function () {
    const callback1 = () => 'callback1';
    const eventHandler1 = () => 'eventHandler1';
    callbackStorage.storeCallback('event', eventHandler1, callback1);

    expect(callbackStorage.getCallback('event', callback1)).to.be.equal(eventHandler1);
    expect(callbackStorage.getCallback('event', callback1)).to.be.undefined;
  });

  it('should clear callbacks', function () {
    const callback1 = () => 'callback1';
    const eventHandler1 = () => 'eventHandler1';
    callbackStorage.storeCallback('event', eventHandler1, callback1);

    callbackStorage.clearStorage();
    expect(callbackStorage.getCallback('event', callback1)).to.be.undefined;
  });

  it('should handle multiple events', function () {
    const callback1 = () => 'callback1';
    const eventHandler1 = () => 'eventHandler1';
    const callback2 = () => 'callback2';
    const eventHandler2 = () => 'eventHandler2';

    callbackStorage.storeCallback('event1', eventHandler1, callback1);
    callbackStorage.storeCallback('event2', eventHandler2, callback2);

    expect(callbackStorage.getCallback('event1', callback1)).to.be.equal(eventHandler1);
    expect(callbackStorage.getCallback('event2', callback2)).to.be.equal(eventHandler2);
  });

  it('should handle non-existent events', function () {
    const callback = () => 'callback';
    expect(callbackStorage.getCallback('nonexistent', callback)).to.be.undefined;
  });

  it('should handle null and undefined callbacks', function () {
    const eventHandler = () => 'eventHandler';
    callbackStorage.storeCallback('event', eventHandler, null);
    callbackStorage.storeCallback('event2', eventHandler, undefined);

    expect(callbackStorage.getCallback('event', null)).to.be.equal(eventHandler);
    expect(callbackStorage.getCallback('event2', undefined)).to.be.equal(eventHandler);
  });

  it('should handle multiple callbacks for same event', function () {
    const callback1 = () => 'callback1';
    const callback2 = () => 'callback2';
    const eventHandler1 = () => 'eventHandler1';
    const eventHandler2 = () => 'eventHandler2';

    callbackStorage.storeCallback('event', eventHandler1, callback1);
    callbackStorage.storeCallback('event', eventHandler2, callback2);

    expect(callbackStorage.getCallback('event', callback1)).to.be.equal(eventHandler1);
    expect(callbackStorage.getCallback('event', callback2)).to.be.equal(eventHandler2);
  });

  it('should handle overwriting callbacks', function () {
    const callback = () => 'callback';
    const eventHandler1 = () => 'eventHandler1';
    const eventHandler2 = () => 'eventHandler2';

    callbackStorage.storeCallback('event', eventHandler1, callback);
    callbackStorage.storeCallback('event', eventHandler2, callback);

    expect(callbackStorage.getCallback('event', callback)).to.be.equal(eventHandler2);
  });
});

describe('jwplayerSubmoduleFactory', function () {
  const jwplayerSubmoduleFactory = require('modules/jwplayerVideoProvider').default;

  it('should create a provider with correct vendor code', function () {
    const config = { divId: 'test' };
    const provider = jwplayerSubmoduleFactory(config, sharedUtils);

    expect(provider).to.be.an('object');
    expect(provider.init).to.be.a('function');
    expect(provider.getId).to.be.a('function');
    expect(provider.getOrtbVideo).to.be.a('function');
    expect(provider.getOrtbContent).to.be.a('function');
    expect(provider.setAdTagUrl).to.be.a('function');
    expect(provider.setAdXml).to.be.a('function');
    expect(provider.onEvent).to.be.a('function');
    expect(provider.offEvent).to.be.a('function');
    expect(provider.destroy).to.be.a('function');
  });

  it('should have correct vendor code', function () {
    expect(jwplayerSubmoduleFactory.vendorCode).to.be.equal(JWPLAYER_VENDOR);
  });

  it('should create independent state instances', function () {
    const config1 = { divId: 'test1' };
    const config2 = { divId: 'test2' };

    const provider1 = jwplayerSubmoduleFactory(config1, sharedUtils);
    const provider2 = jwplayerSubmoduleFactory(config2, sharedUtils);

    expect(provider1).to.not.equal(provider2);
    expect(provider1.getId()).to.equal('test1');
    expect(provider2.getId()).to.equal('test2');
  });

  it('should handle missing jwplayer global', function () {
    const originalJwplayer = window.jwplayer;
    window.jwplayer = undefined;

    const config = { divId: 'test' };
    const provider = jwplayerSubmoduleFactory(config, sharedUtils);

    const setupFailed = sinon.spy();
    provider.onEvent(SETUP_FAILED, setupFailed, {});
    provider.init();

    expect(setupFailed.calledOnce).to.be.true;
    const payload = setupFailed.args[0][1];
    expect(payload.errorCode).to.be.equal(-1);

    // Restore original jwplayer
    window.jwplayer = originalJwplayer;
  });

  it('should handle jwplayer with unsupported version', function () {
    const originalJwplayer = window.jwplayer;
    const mockJwplayer = () => {};
    mockJwplayer.version = '8.20.0';
    window.jwplayer = mockJwplayer;

    const config = { divId: 'test' };
    const provider = jwplayerSubmoduleFactory(config, sharedUtils);

    const setupFailed = sinon.spy();
    provider.onEvent(SETUP_FAILED, setupFailed, {});
    provider.init();

    expect(setupFailed.calledOnce).to.be.true;
    const payload = setupFailed.args[0][1];
    expect(payload.errorCode).to.be.equal(-2);

    // Restore original jwplayer
    window.jwplayer = originalJwplayer;
  });
});

describe('utils', function () {
  describe('getJwConfig', function () {
    const getJwConfig = utils.getJwConfig;
    it('should return undefined when no config is provided', function () {
      let jwConfig = getJwConfig();
      expect(jwConfig).to.be.undefined;

      jwConfig = getJwConfig(null);
      expect(jwConfig).to.be.undefined;
    });

    it('should set vendor config params to top level', function () {
      const jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            'test': 'a',
            'test_2': 'b'
          }
        }
      });
      expect(jwConfig.test).to.be.equal('a');
      expect(jwConfig.test_2).to.be.equal('b');
    });

    it('should convert video module params', function () {
      const jwConfig = getJwConfig({
        mute: true,
        autoStart: true,
        licenseKey: 'key'
      });

      expect(jwConfig.mute).to.be.true;
      expect(jwConfig.autostart).to.be.true;
      expect(jwConfig.key).to.be.equal('key');
    });

    it('should apply video module params only when absent from vendor config', function () {
      const jwConfig = getJwConfig({
        mute: true,
        autoStart: true,
        licenseKey: 'key',
        params: {
          vendorConfig: {
            mute: false,
            autostart: false,
            key: 'other_key'
          }
        }
      });

      expect(jwConfig.mute).to.be.false;
      expect(jwConfig.autostart).to.be.false;
      expect(jwConfig.key).to.be.equal('other_key');
    });

    it('should not convert undefined properties', function () {
      const jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            test: 'a'
          }
        }
      });

      expect(jwConfig).to.not.have.property('mute');
      expect(jwConfig).to.not.have.property('autostart');
      expect(jwConfig).to.not.have.property('key');
    });

    it('should exclude fallback ad block when setupAds is explicitly disabled', function () {
      const jwConfig = getJwConfig({
        setupAds: false,
        params: {

          vendorConfig: {}
        }
      });

      expect(jwConfig).to.not.have.property('advertising');
    });

    it('should set advertising block when setupAds is allowed', function () {
      const jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            advertising: {
              tag: 'test_tag'
            }
          }
        }
      });

      expect(jwConfig).to.have.property('advertising');
      expect(jwConfig.advertising).to.have.property('tag', 'test_tag');
    });

    it('should fallback to vast plugin', function () {
      const jwConfig = getJwConfig({});

      expect(jwConfig).to.have.property('advertising');
      expect(jwConfig.advertising).to.have.property('client', 'vast');
    });

    it('should set outstream to true when no file, playlist, or source is provided', function () {
      let jwConfig = getJwConfig({
        params: {
          vendorConfig: {}
        }
      });

      expect(jwConfig.advertising.outstream).to.be.true;
    });

    it('should not set outstream when file is provided', function () {
      let jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            file: 'video.mp4'
          }
        }
      });

      expect(jwConfig.advertising.outstream).to.be.undefined;
    });

    it('should not set outstream when playlist is provided', function () {
      let jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            playlist: [{ file: 'video.mp4' }]
          }
        }
      });

      expect(jwConfig.advertising.outstream).to.be.undefined;
    });

    it('should not set outstream when source is provided', function () {
      let jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            source: 'video.mp4'
          }
        }
      });

      expect(jwConfig.advertising.outstream).to.be.undefined;
    });

    it('should set prebid bids to true', function () {
      let jwConfig = getJwConfig({
        params: {
          vendorConfig: {}
        }
      });

      expect(jwConfig.advertising.bids.prebid).to.be.true;
    });

    it('should preserve existing bids configuration', function () {
      let jwConfig = getJwConfig({
        params: {
          vendorConfig: {
            advertising: {
              bids: {
                existing: 'bid'
              }
            }
          }
        }
      });

      expect(jwConfig.advertising.bids.existing).to.be.equal('bid');
      expect(jwConfig.advertising.bids.prebid).to.be.true;
    });
  });

  describe('getPlayerHeight', function () {
    const getPlayerHeight = utils.getPlayerHeight;

    it('should return height from API when defined', function () {
      const expectedHeight = 500;
      const playerMock = { getHeight: () => expectedHeight };
      expect(getPlayerHeight(playerMock, {})).to.equal(expectedHeight);
    });

    it('should return height from config when API returns undefined', function () {
      const expectedHeight = 500;
      const playerMock = { getHeight: () => undefined };
      expect(getPlayerHeight(playerMock, { height: 500 })).to.equal(expectedHeight);
    });

    it('should return undefined when both API and config return undefined', function () {
      const playerMock = { getHeight: () => undefined };
      expect(getPlayerHeight(playerMock, {})).to.be.undefined;
    });

    it('should return undefined when both API and config return null', function () {
      const playerMock = { getHeight: () => null };
      expect(getPlayerHeight(playerMock, { height: null })).to.be.null;
    });
  });

  describe('getPlayerWidth', function () {
    const getPlayerWidth = utils.getPlayerWidth;

    it('should return width from API when defined', function () {
      const expectedWidth = 1000;
      const playerMock = { getWidth: () => expectedWidth };
      expect(getPlayerWidth(playerMock, {})).to.equal(expectedWidth);
    });

    it('should return width from config when API returns undefined', function () {
      const expectedWidth = 1000;
      const playerMock = { getWidth: () => undefined };
      expect(getPlayerWidth(playerMock, { width: expectedWidth })).to.equal(expectedWidth);
    });

    it('should return undefined when width is string', function () {
      const playerMock = { getWidth: () => undefined };
      expect(getPlayerWidth(playerMock, { width: '50%' })).to.be.undefined;
    });

    it('should return undefined when both API and config return undefined', function () {
      const playerMock = { getWidth: () => undefined };
      expect(getPlayerWidth(playerMock, {})).to.be.undefined;
    });

    it('should return undefined when both API and config return null', function () {
      const playerMock = { getWidth: () => null };
      expect(getPlayerWidth(playerMock, { width: null })).to.be.undefined;
    });
  });

  describe('getPlayerSizeFromAspectRatio', function () {
    const getPlayerSizeFromAspectRatio = utils.getPlayerSizeFromAspectRatio;
    const testContainer = {
      clientWidth: 640,
      clientHeight: 480
    };

    it('should return an empty object when width and aspectratio are not strings', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {width: 100})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '1:2', width: 100})).to.deep.equal({});
    });

    it('should return an empty object when aspectratio is malformed', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '0.5', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '1-2', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '1:', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: ':2', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: ':', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '1:2:3', width: '100%'})).to.deep.equal({});
    });

    it('should return an empty object when player container cannot be obtained', function () {
      expect(getPlayerSizeFromAspectRatio({}, {aspectratio: '1:2', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => undefined }, {aspectratio: '1:2', width: '100%'})).to.deep.equal({});
    });

    it('should calculate the size given the width percentage and aspect ratio', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '2:1', width: '100%'})).to.deep.equal({ height: 320, width: 640 });
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '4:1', width: '70%'})).to.deep.equal({ height: 112, width: 448 });
    });

    it('should return the container height when smaller than the calculated height', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '1:1', width: '100%'})).to.deep.equal({ height: 480, width: 640 });
    });

    it('should handle non-numeric aspect ratio values', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: 'abc:def', width: '100%'})).to.deep.equal({});
    });

    it('should handle non-numeric width percentage', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '16:9', width: 'abc%'})).to.deep.equal({});
    });

    it('should handle zero aspect ratio values', function () {
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '0:9', width: '100%'})).to.deep.equal({});
      expect(getPlayerSizeFromAspectRatio({ getContainer: () => testContainer }, {aspectratio: '16:0', width: '100%'})).to.deep.equal({});
    });
  });

  describe('getSkipParams', function () {
    const getSkipParams = utils.getSkipParams;

    it('should return an empty object when skip is not configured', function () {
      const skipParams = getSkipParams({});
      expect(skipParams).to.be.empty;
    });

    it('should set skip to false when explicitly configured', function () {
      const skipParams = getSkipParams({
        skipoffset: -1
      });
      expect(skipParams.skip).to.be.equal(0);
      expect(skipParams.skipmin).to.be.undefined;
      expect(skipParams.skipafter).to.be.undefined;
    });

    it('should be skippable when skip offset is set', function () {
      const skipOffset = 3;
      const skipParams = getSkipParams({
        skipoffset: skipOffset
      });
      expect(skipParams.skip).to.be.equal(1);
      expect(skipParams.skipmin).to.be.equal(skipOffset + 2);
      expect(skipParams.skipafter).to.be.equal(skipOffset);
    });

    it('should handle zero skip offset', function () {
      let skipParams = getSkipParams({
        skipoffset: 0
      });
      expect(skipParams.skip).to.be.equal(1);
      expect(skipParams.skipmin).to.be.equal(2);
      expect(skipParams.skipafter).to.be.equal(0);
    });

    it('should handle large skip offset', function () {
      let skipParams = getSkipParams({
        skipoffset: 30
      });
      expect(skipParams.skip).to.be.equal(1);
      expect(skipParams.skipmin).to.be.equal(32);
      expect(skipParams.skipafter).to.be.equal(30);
    });
  });

  describe('getSupportedMediaTypes', function () {
    const getSupportedMediaTypes = utils.getSupportedMediaTypes;

    it('should always support VPAID', function () {
      let supportedMediaTypes = getSupportedMediaTypes([]);
      expect(supportedMediaTypes).to.include(VPAID_MIME_TYPE);

      supportedMediaTypes = getSupportedMediaTypes([VIDEO_MIME_TYPE.MP4]);
      expect(supportedMediaTypes).to.include(VPAID_MIME_TYPE);
    });

    it('should filter supported media types', function () {
      const mockVideo = document.createElement('video');
      const originalCanPlayType = mockVideo.canPlayType;

      // Mock canPlayType to simulate browser support
      mockVideo.canPlayType = function(type) {
        if (type === VIDEO_MIME_TYPE.MP4) return 'probably';
        if (type === VIDEO_MIME_TYPE.WEBM) return 'maybe';
        return '';
      };

      // Temporarily replace document.createElement
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        if (tagName === 'video') return mockVideo;
        return originalCreateElement.call(document, tagName);
      };

      const supportedMediaTypes = getSupportedMediaTypes([
        VIDEO_MIME_TYPE.MP4,
        VIDEO_MIME_TYPE.WEBM,
        VIDEO_MIME_TYPE.OGG
      ]);

      expect(supportedMediaTypes).to.include(VIDEO_MIME_TYPE.MP4);
      expect(supportedMediaTypes).to.include(VIDEO_MIME_TYPE.WEBM);
      expect(supportedMediaTypes).to.not.include(VIDEO_MIME_TYPE.OGG);
      expect(supportedMediaTypes).to.include(VPAID_MIME_TYPE);

      // Restore original function
      document.createElement = originalCreateElement;
    });
  });

  describe('getPlacement', function () {
    const getPlacement = utils.getPlacement;

    it('should be INSTREAM when not configured for outstream', function () {
      let adConfig = {};
      let placement = getPlacement(adConfig);
      expect(placement).to.be.equal(PLACEMENT.INSTREAM);

      adConfig = { outstream: false };
      placement = getPlacement(adConfig);
      expect(placement).to.be.equal(PLACEMENT.INSTREAM);
    });

    it('should be FLOATING when player is floating', function () {
      const player = getPlayerMock();
      player.getFloating = () => true;
      const placement = getPlacement({outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.FLOATING);
    });

    it('should be the value  defined in the ad config', function () {
      const player = getPlayerMock();
      player.getFloating = () => false;

      let placement = getPlacement({placement: 'banner', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.BANNER);

      placement = getPlacement({placement: 'article', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.ARTICLE);

      placement = getPlacement({placement: 'feed', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.FEED);

      placement = getPlacement({placement: 'interstitial', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.INTERSTITIAL);

      placement = getPlacement({placement: 'slider', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.SLIDER);
    });

    it('should be undefined when undetermined', function () {
      const placement = getPlacement({ outstream: true }, getPlayerMock());
      expect(placement).to.be.undefined;
    });

    it('should handle case-insensitive placement values', function () {
      const player = getPlayerMock();
      player.getFloating = () => false;

      let placement = getPlacement({placement: 'BANNER', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.BANNER);

      placement = getPlacement({placement: 'Article', outstream: true}, player);
      expect(placement).to.be.equal(PLACEMENT.ARTICLE);
    });

    it('should handle unknown placement values', function () {
      const player = getPlayerMock();
      player.getFloating = () => false;

      const placement = getPlacement({placement: 'unknown', outstream: true}, player);
      expect(placement).to.be.undefined;
    });
  });

  describe('getPlaybackMethod', function() {
    const getPlaybackMethod = utils.getPlaybackMethod;

    it('should return autoplay with sound', function() {
      const playbackMethod = getPlaybackMethod({
        autoplay: true,
        mute: false
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.AUTOPLAY);
    });

    it('should return autoplay muted', function() {
      const playbackMethod = getPlaybackMethod({
        autoplay: true,
        mute: true
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });

    it('should treat autoplayAdsMuted as mute', function () {
      const playbackMethod = getPlaybackMethod({
        autoplay: true,
        autoplayAdsMuted: true
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });

    it('should return click to play', function() {
      let playbackMethod = getPlaybackMethod({ autoplay: false });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.CLICK_TO_PLAY);

      playbackMethod = getPlaybackMethod({
        autoplay: false,
        autoplayAdsMuted: true
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.CLICK_TO_PLAY);

      playbackMethod = getPlaybackMethod({
        autoplay: false,
        mute: true
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.CLICK_TO_PLAY);
    });

    it('should prioritize mute over autoplayAdsMuted', function () {
      const playbackMethod = getPlaybackMethod({
        autoplay: true,
        mute: true,
        autoplayAdsMuted: false
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.AUTOPLAY_MUTED);
    });

    it('should handle undefined autoplay', function () {
      const playbackMethod = getPlaybackMethod({
        mute: false
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.CLICK_TO_PLAY);
    });

    it('should handle undefined mute and autoplayAdsMuted', function () {
      const playbackMethod = getPlaybackMethod({
        autoplay: true
      });
      expect(playbackMethod).to.equal(PLAYBACK_METHODS.AUTOPLAY);
    });
  });

  describe('isOmidSupported', function () {
    const isOmidSupported = utils.isOmidSupported;
    const initialOmidSessionClient = window.OmidSessionClient;
    afterEach(() => {
      window.OmidSessionClient = initialOmidSessionClient;
    });

    it('should be true when Omid is loaded and client is VAST', function () {
      window.OmidSessionClient = {};
      expect(isOmidSupported('vast')).to.be.true;
    });

    it('should be false when Omid is not present', function () {
      expect(isOmidSupported('vast')).to.be.false;
    });

    it('should be false when client is not Vast', function () {
      window.OmidSessionClient = {};
      expect(isOmidSupported('googima')).to.be.false;
      expect(isOmidSupported('freewheel')).to.be.false;
      expect(isOmidSupported('googimadai')).to.be.false;
      expect(isOmidSupported('')).to.be.false;
      expect(isOmidSupported(null)).to.be.false;
      expect(isOmidSupported()).to.be.false;
    });

    it('should be false when OmidSessionClient is null', function () {
      window.OmidSessionClient = null;
      expect(isOmidSupported('vast')).to.be.false;
    });

    it('should be false when OmidSessionClient is undefined', function () {
      window.OmidSessionClient = undefined;
      expect(isOmidSupported('vast')).to.be.false;
    });
  });

  describe('getIsoLanguageCode', function () {
    const sampleAudioTracks = [{language: 'ht'}, {language: 'fr'}, {language: 'es'}, {language: 'pt'}];

    it('should return undefined when audio tracks are unavailable', function () {
      const player = getPlayerMock();
      let languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.undefined;
      player.getAudioTracks = () => [];
      languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.undefined;
    });

    it('should return the first audio track language code if the getCurrentAudioTrack returns undefined', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => sampleAudioTracks;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.equal('ht');
    });

    it('should return the first audio track  language code if the getCurrentAudioTrack returns null', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => sampleAudioTracks;
      player.getCurrentAudioTrack = () => null;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.equal('ht');
    });

    it('should return the first audio track language code if the getCurrentAudioTrack returns -1', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => sampleAudioTracks;
      player.getCurrentAudioTrack = () => -1;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.equal('ht');
    });

    it('should return the right audio track language code', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => sampleAudioTracks;
      player.getCurrentAudioTrack = () => 2;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.equal('es');
    });

    it('should handle out of bounds track index', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => sampleAudioTracks;
      player.getCurrentAudioTrack = () => 10;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.undefined;
    });

    it('should handle negative track index', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => sampleAudioTracks;
      player.getCurrentAudioTrack = () => -5;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.equal('ht');
    });

    it('should handle audio tracks with missing language property', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => [{}, {language: 'en'}, {}];
      player.getCurrentAudioTrack = () => 0;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.undefined;
    });

    it('should handle audio tracks with null language property', function () {
      const player = getPlayerMock();
      player.getAudioTracks = () => [{language: null}, {language: 'en'}, {}];
      player.getCurrentAudioTrack = () => 0;
      const languageCode = utils.getIsoLanguageCode(player);
      expect(languageCode).to.be.null;
    });
  });

  describe('getJwEvent', function () {
    const getJwEvent = utils.getJwEvent;
    it('should map known events', function () {
      expect(getJwEvent(SETUP_COMPLETE)).to.equal('ready');
      expect(getJwEvent(SEEK_END)).to.equal('seeked');
      expect(getJwEvent(AD_STARTED)).to.equal(AD_IMPRESSION);
    });

    it('should return event name when not mapped', function () {
      expect(getJwEvent('custom')).to.equal('custom');
    });

    it('should map all known event mappings', function () {
      expect(getJwEvent(SETUP_FAILED)).to.equal('setupError');
      expect(getJwEvent(DESTROYED)).to.equal('remove');
      expect(getJwEvent(AD_IMPRESSION)).to.equal('adViewableImpression');
      expect(getJwEvent(PLAYBACK_REQUEST)).to.equal('playAttempt');
      expect(getJwEvent(AUTOSTART_BLOCKED)).to.equal('autostartNotAllowed');
      expect(getJwEvent(CONTENT_LOADED)).to.equal('playlistItem');
      expect(getJwEvent(SEEK_START)).to.equal('seek');
      expect(getJwEvent(RENDITION_UPDATE)).to.equal('visualQuality');
      expect(getJwEvent(PLAYER_RESIZE)).to.equal('resize');
    });
  });

  describe('getSegments', function () {
    const getSegments = utils.getSegments;
    it('should return undefined for empty input', function () {
      expect(getSegments()).to.be.undefined;
      expect(getSegments([])).to.be.undefined;
    });

    it('should convert segments to objects', function () {
      const segs = ['a', 'b'];
      expect(getSegments(segs)).to.deep.equal([
        {id: 'a'},
        {id: 'b'}
      ]);
    });

    it('should handle single segment', function () {
      const segs = ['single'];
      expect(getSegments(segs)).to.deep.equal([
        {id: 'single'}
      ]);
    });

    it('should handle segments with special characters', function () {
      const segs = ['segment-1', 'segment_2', 'segment 3'];
      expect(getSegments(segs)).to.deep.equal([
        {id: 'segment-1'},
        {id: 'segment_2'},
        {id: 'segment 3'}
      ]);
    });

    it('should handle null input', function () {
      expect(getSegments(null)).to.be.undefined;
    });

    it('should handle undefined input', function () {
      expect(getSegments(undefined)).to.be.undefined;
    });
  });

  describe('getContentDatum', function () {
    const getContentDatum = utils.getContentDatum;
    it('should return undefined when no data provided', function () {
      expect(getContentDatum()).to.be.undefined;
    });

    it('should set media id and segments', function () {
      const segments = [{id: 'x'}];
      expect(getContentDatum('id1', segments)).to.deep.equal({
        name: 'jwplayer.com',
        segment: segments,
        cids: ['id1'],
        ext: { cids: ['id1'], segtax: 502 }
      });
    });

    it('should set only media id when segments missing', function () {
      expect(getContentDatum('id2')).to.deep.equal({
        name: 'jwplayer.com',
        cids: ['id2'],
        ext: { cids: ['id2'] }
      });
    });

    it('should set only segments when media id missing', function () {
      const segments = [{id: 'y'}];
      expect(getContentDatum(null, segments)).to.deep.equal({
        name: 'jwplayer.com',
        segment: segments,
        ext: { segtax: 502 }
      });
    });

    it('should handle empty segments array', function () {
      expect(getContentDatum('id3', [])).to.deep.equal({
        name: 'jwplayer.com',
        cids: ['id3'],
        ext: { cids: ['id3'] }
      });
    });

    it('should handle null media id', function () {
      expect(getContentDatum(null)).to.be.undefined;
    });

    it('should handle empty string media id', function () {
      expect(getContentDatum('')).to.be.undefined;
    });
  });

  describe('getStartDelay', function () {
    const getStartDelay = utils.getStartDelay;

    it('should return undefined (not implemented)', function () {
      expect(getStartDelay()).to.be.undefined;
    });
  });
});
