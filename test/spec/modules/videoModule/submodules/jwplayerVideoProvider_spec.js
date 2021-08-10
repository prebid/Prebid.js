import {
  JWPlayerProvider,
  adStateFactory,
  timeStateFactory,
  callbackStorageFactory,
  utils
} from 'modules/videoModule/submodules/jwplayerVideoProvider';

import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE
} from 'modules/videoModule/constants/ortb.js';

import {
  PLAYBACK_MODE
} from 'modules/videoModule/constants/events.js'

describe('JWPlayerProvider', function () {

});

describe('adStateFactory', function () {
  let adState = adStateFactory();

  beforeEach(function() {
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
    expect(state.adPlacementType).to.be.equal(PLACEMENT.IN_STREAM);

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
});

describe('timeStateFactory', function () {
  let timeState = timeStateFactory();

  beforeEach(function() {
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
});

describe('callbackStorageFactory', function () {
  let callbackStorage = callbackStorageFactory();

  beforeEach(function () {
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
      let jwConfig = getJwConfig({
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
      let jwConfig = getJwConfig({
        mute: true,
        autoStart: true,
        licenseKey: 'key'
      });

      expect(jwConfig.mute).to.be.true;
      expect(jwConfig.autostart).to.be.true;
      expect(jwConfig.key).to.be.equal('key');
    });

    it('should apply video module params only when absent from vendor config', function () {
      let jwConfig = getJwConfig({
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
      let jwConfig = getJwConfig({
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

    it('should exclude fallback ad block when adOptimization is explicitly disabled', function () {
      let jwConfig = getJwConfig({
        params: {
          adOptimization: false,
          vendorConfig: {}
        }
      });

      expect(jwConfig).to.not.have.property('advertising');
    });

    it('should set advertising block when adOptimization is allowed', function () {
      let jwConfig = getJwConfig({
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
      let jwConfig = getJwConfig({});

      expect(jwConfig).to.have.property('advertising');
      expect(jwConfig.advertising).to.have.property('client', 'vast');
    });
  });
  describe('getSkipParams', function () {
    const getSkipParams = utils.getSkipParams;

    it('should return an empty object when skip is not configured', function () {
      let skipParams = getSkipParams({});
      expect(skipParams).to.be.empty;
    });

    it('should set skip to false when explicitly configured', function () {
      let skipParams = getSkipParams({
        skipoffset: -1
      });
      expect(skipParams.skip).to.be.equal(0);
      expect(skipParams.skipmin).to.be.undefined;
      expect(skipParams.skipafter).to.be.undefined;
    });

    it('should be skippable when skip offset is set', function () {
      const skipOffset = 3;
      let skipParams = getSkipParams({
        skipoffset: skipOffset
      });
      expect(skipParams.skip).to.be.equal(1);
      expect(skipParams.skipmin).to.be.equal(skipOffset + 2);
      expect(skipParams.skipafter).to.be.equal(skipOffset);
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
  });

  describe('getPlacement', function () {
    const getPlacement = utils.getPlacement;

    it('should be in_stream when not configured for outstream', function () {
      let adConfig = {};
      let placement = getPlacement(adConfig);
      expect(placement).to.be.equal(PLACEMENT.IN_STREAM);

      adConfig = { outstream: false };
      placement = getPlacement(adConfig);
      expect(placement).to.be.equal(PLACEMENT.IN_STREAM);
    });

    it('should be undefined on outstream', function () {
      let adConfig = { outstream: true };
      let placement = getPlacement(adConfig);
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
  });

  describe('isOmidSupported', function () {
    const isOmidSupported = utils.isOmidSupported;
    afterEach(() => {
      window.OmidSessionClient = undefined;
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
  });
});
