// Using require style imports for fine grained control of import time
import {
  AD_CLICK,
  AD_COMPLETE,
  AD_ERROR,
  AD_IMPRESSION,
  AD_LOADED,
  AD_PAUSE,
  AD_PLAY,
  AD_REQUEST,
  AD_SKIPPED,
  AD_STARTED,
  DESTROYED,
  PLAYER_RESIZE,
  SETUP_COMPLETE,
  SETUP_FAILED,
  VOLUME
} from 'libraries/video/constants/events.js';
import adPlayerProSubmoduleFactory, {callbackStorageFactory} from '../../../../../modules/adplayerproVideoProvider.js';
import {PLACEMENT} from '../../../../../libraries/video/constants/ortb';
import sinon from 'sinon';

const {AdPlayerProProvider, utils} = require('modules/adplayerproVideoProvider.js');

const {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, VPAID_MIME_TYPE
} = require('libraries/video/constants/ortb.js');

function getPlayerMock() {
  return {
    setup: function () {
      return this;
    },
    load: function () {
    },
    resize: function () {
    },
    remove: function () {
    },
    on: function () {
      return this;
    },
    off: function () {
      return this;
    },
    getAdWidth: function () {
      return 600
    },
    getAdHeight: function () {
      return 400;
    }
  };
}

function makePlayerFactoryMock(playerMock_) {
  return () => playerMock_;
}

function getUtilsMock() {
  return {
    getConfig: function () {
    },
    getPlayerEvent: event => event,
    getSupportedMediaTypes: function () {
    },
    getPlacement: function () {
    },
    getPlaybackMethod: function () {
    }
  };
}

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

describe('AdPlayerProProvider', function () {
  let config;
  let callbackStorage;
  let utilsMock;
  let player;

  beforeEach(() => {
    addDiv();
    config = {divId: 'test', playerConfig: {placementId: 'testId'}};
    callbackStorage = callbackStorageFactory();
    utilsMock = getUtilsMock();
    player = getPlayerMock();
  });

  afterEach(() => {
    removeDiv();
  });

  describe('init', function () {
    it('should trigger failure when Adplayer.Pro is missing', function () {
      const provider = AdPlayerProProvider(config, null, callbackStorage, utilsMock);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-1);
    });

    it('should trigger failure when the div is not found', function () {
      config.divId = 'fake-div'
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utilsMock);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-3);
    });

    it('should trigger failure when the placementId is not found', function () {
      config.playerConfig.placementId = '';
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utilsMock);
      const setupFailed = sinon.spy();
      provider.onEvent(SETUP_FAILED, setupFailed, {});
      provider.init();
      expect(setupFailed.calledOnce).to.be.true;
      const payload = setupFailed.args[0][1];
      expect(payload.errorCode).to.be.equal(-4);
    });

    it('should instantiate the player after setAdTagUrl', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      expect(setupSpy.calledOnce).to.be.false;
      provider.setAdTagUrl('https://test.com', {});
      expect(setupSpy.calledOnce).to.be.true;
      const payload = setupSpy.args[0][0];
      expect(payload.advertising.tag.url).to.be.equal('https://test.com');
    });

    it('should instantiate the player after setAdTagUrl for adPlayerProSubmoduleFactory', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      window.playerPro = makePlayerFactoryMock(player);
      const provider = adPlayerProSubmoduleFactory(config, {});
      provider.init();
      expect(setupSpy.calledOnce).to.be.false;
      provider.setAdTagUrl('https://test.com', {});
      expect(setupSpy.calledOnce).to.be.true;
      const payload = setupSpy.args[0][0];
      expect(payload.advertising.tag.url).to.be.equal('https://test.com');
    });

    it('should trigger setup complete when player is already instantiated', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      const setupComplete = sinon.spy();
      provider.onEvent(SETUP_COMPLETE, setupComplete, {});
      provider.init();
      expect(setupComplete.calledOnce).to.be.true;
      expect(setupSpy.called).to.be.false;
    });

    it('should support multiple setup complete event handlers', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      const setupComplete = sinon.spy();
      const setupComplete2 = sinon.spy();
      provider.onEvent(SETUP_COMPLETE, setupComplete, {});
      provider.onEvent(SETUP_COMPLETE, setupComplete2, {});
      provider.init();
      expect(setupComplete.calledOnce).to.be.true;
      expect(setupComplete2.calledOnce).to.be.true;
      expect(setupSpy.called).to.be.false;
    });

    it('should not reinstantiate player', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      const onSpy = player.on = sinon.spy(player.on);

      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      expect(setupSpy.calledOnce).to.be.false;
      provider.setAdTagUrl('https://test.com', {});
      expect(setupSpy.calledOnce).to.be.true;
      const payload = setupSpy.args[0][0];
      expect(payload.advertising.tag.url).to.be.equal('https://test.com');

      // test that the player is not reinitialized
      provider.setAdTagUrl('https://test.com', {});
      expect(setupSpy.calledOnce).to.be.true;

      // get and call AdStopped event
      const args = onSpy.args[0];
      expect(args[0]).to.be.equal('AdStopped');
      args[1]();

      provider.setAdTagUrl('https://test.com', {});
      expect(setupSpy.calledTwice).to.be.true;
    });
  });

  describe('getId', function () {
    it('should return configured div id', function () {
      const provider = AdPlayerProProvider(config, undefined, undefined, utils);
      expect(provider.getId()).to.be.equal('test');
    });
  });

  describe('getOrtbVideo', function () {
    it('should populate oRTB Video params', function () {
      const test_media_type = VIDEO_MIME_TYPE.MP4;
      const test_placement = PLACEMENT.ARTICLE;
      const test_playback_method = PLAYBACK_METHODS.CLICK_TO_PLAY;

      utilsMock.getSupportedMediaTypes = () => [test_media_type];
      utilsMock.getPlacement = () => test_placement;
      utilsMock.getPlaybackMethod = () => test_playback_method;

      const provider = AdPlayerProProvider(config, null, null, utilsMock);
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
      expect(video.placement).to.equal(test_placement);
      expect(video.maxextended).to.equal(-1);
      expect(video.boxingallowed).to.equal(1);
      expect(video.playbackmethod).to.include(test_playback_method);
      expect(video.playbackend).to.equal(1);
      expect(video.api).to.have.length(2);
      expect(video.api).to.include.members([API_FRAMEWORKS.VPAID_2_0, API_FRAMEWORKS.OMID_1_0]); //
    });
  });

  describe('getOrtbContent', function () {
    it('should populate oRTB Content params', function () {
      const provider = AdPlayerProProvider(config, null, null, utils);
      provider.init();
      expect(provider.getOrtbContent()).to.be.undefined;
    });
  });

  describe('setAdTagUrl', function () {
    it('should call setup', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('', {adXml: 'https://test.com'});
      expect(setupSpy.calledOnce).to.be.true;
    });

    it('should not call setup', function () {
      const setupSpy = player.setup = sinon.spy(player.setup);
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('', {});
      expect(setupSpy.calledOnce).to.be.false;
    });
  });

  describe('events', function () {
    it('should register event listener on player', function () {
      const onSpy = player.on = sinon.spy();
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('https://test.com', {});
      const callback = () => {
      };
      provider.onEvent(AD_REQUEST, callback, {});
      provider.onEvent('test', callback, {});
      expect(onSpy.calledTwice).to.be.true;
      expect(onSpy.args[0][0]).to.be.equal('AdStopped');
      expect(onSpy.args[1][0]).to.be.equal('AdRequest');
    });

    it('should remove event listener on player', function () {
      const offSpy = player.off = sinon.spy();
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('https://test.com', {});
      const callback = () => {
      };
      provider.onEvent(AD_IMPRESSION, callback, {});
      provider.offEvent(AD_IMPRESSION, callback);
      expect(offSpy.calledOnce).to.be.true;
      const eventName = offSpy.args[0][0];
      const eventCallback = offSpy.args[0][1];
      expect(eventName).to.be.equal('AdImpression');
      expect(eventCallback).to.be.exist;
    });

    it('should remove event listener on player by eventName', function () {
      const offSpy = player.off = sinon.spy();
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('https://test.com', {});
      const callback = () => {
      };
      provider.onEvent(AD_IMPRESSION, callback, {});
      provider.offEvent(AD_IMPRESSION);
      expect(offSpy.calledOnce).to.be.true;
      const eventName = offSpy.args[0][0];
      expect(eventName).to.be.equal('AdImpression');
    });

    it('should call event player resize', function () {
      const onSpy = player.on = sinon.spy();
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('https://test.com', {});
      const callbackSpy = sinon.spy();
      provider.onEvent(PLAYER_RESIZE, callbackSpy, {});
      expect(onSpy.calledTwice).to.be.true;
      expect(onSpy.args[1][0]).to.be.equal('AdSizeChange');
      expect(callbackSpy.notCalled).to.be.true;
      onSpy.args[1][1]();
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.args[0][1].width).to.be.equal(600);
      expect(callbackSpy.args[0][1].height).to.be.equal(400);
    });
  });

  describe('destroy', function () {
    it('should remove and null the player', function () {
      const removeSpy = player.remove = sinon.spy();
      player.remove = removeSpy;
      const provider = AdPlayerProProvider(config, makePlayerFactoryMock(player), callbackStorage, utils);
      provider.init();
      provider.setAdTagUrl('https://test.com', {});
      provider.destroy();
      provider.destroy();
      expect(removeSpy.calledOnce).to.be.true;
    });
  });
});

describe('AdPlayerProProvider utils', function () {
  it('getConfig', function () {
    expect(utils.getConfig()).to.be.undefined;
    expect(utils.getConfig({})).to.be.undefined;
    const config = utils.getConfig({}, 'https://test.com');
    expect(config.advertising.tag.url).to.be.equal('https://test.com');
    expect(config._pType).to.be.equal('pbjs');
  });

  it('getPlayerEvent', function () {
    function test(event, expected) {
      expect(utils.getPlayerEvent(event)).to.be.equal(expected);
    }

    test(DESTROYED, 'AdStopped');
    test(AD_REQUEST, 'AdRequest');
    test(AD_LOADED, 'AdLoaded');
    test(AD_STARTED, 'AdStarted');
    test(AD_IMPRESSION, 'AdImpression');
    test(AD_PLAY, 'AdPlaying');
    test(AD_PAUSE, 'AdPaused');
    test(AD_CLICK, 'AdClickThru');
    test(AD_SKIPPED, 'AdSkipped');
    test(AD_ERROR, 'AdError');
    test(AD_COMPLETE, 'AdCompleted');
    test(VOLUME, 'AdVolumeChange');
    test(PLAYER_RESIZE, 'AdSizeChange');
    test('test', 'test');
  });

  it('getSupportedMediaTypes', function () {
    let supportedMediaTypes = utils.getSupportedMediaTypes([]);
    expect(supportedMediaTypes).to.include(VPAID_MIME_TYPE);

    supportedMediaTypes = utils.getSupportedMediaTypes([VIDEO_MIME_TYPE.MP4]);
    expect(supportedMediaTypes).to.include(VPAID_MIME_TYPE);
  });

  it('getPlacement', function () {
    function test(config, expected) {
      expect(utils.getPlacement(config)).to.be.equal(expected);
    }

    test(false, PLACEMENT.BANNER);
    test({}, PLACEMENT.BANNER);
    test({type: 'test'}, PLACEMENT.BANNER);
    test({type: 'inPage'}, PLACEMENT.ARTICLE);
    test({type: 'rewarded'}, PLACEMENT.INTERSTITIAL_SLIDER_FLOATING);
    test({type: 'inView'}, PLACEMENT.INTERSTITIAL_SLIDER_FLOATING);
  });

  it('getPlaybackMethod', function () {
    function test(autoplay, mute, expected) {
      expect(utils.getPlaybackMethod({autoplay, mute})).to.be.equal(expected);
    }

    test(false, false, PLAYBACK_METHODS.CLICK_TO_PLAY);
    test(false, true, PLAYBACK_METHODS.CLICK_TO_PLAY);
    test(true, false, PLAYBACK_METHODS.AUTOPLAY);
    test(true, true, PLAYBACK_METHODS.AUTOPLAY_MUTED);
  });
});

describe('AdPlayerProProvider callbackStorageFactory', function () {
  let player;
  let callbackStorage;

  beforeEach(() => {
    player = getPlayerMock();
    callbackStorage = callbackStorageFactory();
  });

  it('storeCallback and getCallback', function () {
    const eventType = 'test';
    const callback = () => 11;
    const eventHandler = () => 12;
    callbackStorage.storeCallback(eventType, eventHandler, callback);
    expect(callbackStorage.getCallback(eventType, callback)).to.be.equal(eventHandler);

    const callback2 = () => 21;
    const eventHandler2 = () => 22;
    callbackStorage.storeCallback(eventType, eventHandler2, callback2);
    expect(callbackStorage.getCallback(eventType, callback2)).to.be.equal(eventHandler2);

    expect(callbackStorage.getCallback(eventType, callback)).to.be.equal(eventHandler);
  });

  it('clearCallback', function () {
    const eventType = 'test';
    const callback = () => 11;
    const callback2 = () => 21;
    callbackStorage.storeCallback(eventType, () => 12, callback);
    callbackStorage.storeCallback(eventType, () => 22, callback2);

    expect(callbackStorage.getCallback(eventType, callback)()).to.be.equal(12);
    expect(callbackStorage.getCallback(eventType, callback2)()).to.be.equal(22);

    callbackStorage.clearCallback(eventType);

    expect(callbackStorage.getCallback(eventType, callback)).to.be.undefined;
    expect(callbackStorage.getCallback(eventType, callback2)).to.be.undefined;

    callbackStorage.storeCallback(eventType, () => 12, callback);
    callbackStorage.storeCallback(eventType, () => 22, callback2);

    callbackStorage.clearCallback(eventType, callback);

    expect(callbackStorage.getCallback(eventType, callback)).to.be.undefined;
    expect(callbackStorage.getCallback(eventType, callback2)()).to.be.equal(22);
  });

  it('addAllCallbacks', function () {
    const eventType = 'test';
    const eventType2 = 'test2';
    const callback = () => 11;
    const callback2 = () => 21;
    const eventHandler = () => 12;
    const eventHandler2 = () => 22;
    callbackStorage.storeCallback(eventType, eventHandler, callback);
    callbackStorage.storeCallback(eventType, eventHandler2, callback2);
    callbackStorage.storeCallback(eventType2, eventHandler, callback);
    callbackStorage.storeCallback(eventType2, eventHandler2, callback2);

    let spy = sinon.spy();
    callbackStorage.addAllCallbacks(spy);
    expect(spy.callCount).to.be.equal(4);
    expect(spy.calledWith(eventType, eventHandler)).to.be.true;
    expect(spy.calledWith(eventType, eventHandler2)).to.be.true;
    expect(spy.calledWith(eventType2, eventHandler)).to.be.true;
    expect(spy.calledWith(eventType2, eventHandler2)).to.be.true;

    callbackStorage.clearCallback(eventType, callback);
    spy = sinon.spy();
    callbackStorage.addAllCallbacks(spy);
    expect(spy.callCount).to.be.equal(3);
    expect(spy.calledWith(eventType, eventHandler2)).to.be.true;
    expect(spy.calledWith(eventType2, eventHandler)).to.be.true;
    expect(spy.calledWith(eventType2, eventHandler2)).to.be.true;

    callbackStorage.clearCallback(eventType2);
    spy = sinon.spy();
    callbackStorage.addAllCallbacks(spy);
    expect(spy.callCount).to.be.equal(1);
    expect(spy.calledWith(eventType, eventHandler2)).to.be.true;

    callbackStorage.storeCallback(eventType, eventHandler, callback);
    callbackStorage.storeCallback(eventType2, eventHandler, callback);
    spy = sinon.spy();
    callbackStorage.addAllCallbacks(spy);
    expect(spy.callCount).to.be.equal(3);
    expect(spy.calledWith(eventType, eventHandler)).to.be.true;
    expect(spy.calledWith(eventType, eventHandler2)).to.be.true;
    expect(spy.calledWith(eventType2, eventHandler)).to.be.true;

    callbackStorage.clearStorage();
    spy = sinon.spy();
    callbackStorage.addAllCallbacks(spy);
    expect(spy.callCount).to.be.equal(0);
  });

  it('clearStorage', function () {
    const eventType = 'test';
    const callback = () => 11;
    const eventHandler = () => 12;
    callbackStorage.storeCallback(eventType, eventHandler, callback);
    expect(callbackStorage.getCallback(eventType, callback)).to.be.equal(eventHandler);

    callbackStorage.clearStorage();
    expect(callbackStorage.getCallback(eventType, callback)).to.be.undefined;
  });
});
