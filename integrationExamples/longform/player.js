var tv = tv || {};  //eslint-disable-line
var demoData = {};
tv.freewheel = tv.freewheel || {};
tv.freewheel.DemoPlayer = function () {
  // Only one AdManager instance is needed for each player.
  this.adManager = new tv.freewheel.SDK.AdManager();
  // Please contact your FreeWheel solution engineer for the values for your network.
  this.adManager.setNetwork(372464);
  this.adManager.setServer('http://demo.v.fwmrm.net/ad/g/1')

  // Ad ad context object should be created for each ad request and all ad playback related.
  // When a new video starts, the current ad context object should be destroyed and a new one should
  // be created to handle the next lifecycle.

  this.currentAdContext = null;
  /* Reference to the <video> element */
  this.videoEl = document.getElementById('videoPlayer');

  // Temporarily store the video element's originalSource so when preroll / postroll ends, the src can
  // be resumed.

  this.originalSource = this.videoEl.currentSrc;

  this.prerollSlots = [];
  this.postrollSlots = [];
  this.midrollSlots = [];
  this.overlaySlots = [];

  this.adResponseLoaded = false;

  this.onRequestComplete = this._onRequestComplete.bind(this);
  this.onSlotEnded = this._onSlotEnded.bind(this);
  this.onSlotPause = this._onSlotPause.bind(this);
  this.onSlotResume = this._resume.bind(this);
  this.onContentVideoEnded = this._onContentVideoEnded.bind(this);
  this.onContentVideoTimeUpdated = this._onContentVideoTimeUpdated.bind(this);
  // tv.freewheel.SDK.setLogLevel(tv.freewheel.SDK.LOG_LEVEL_DEBUG);
  this.onStartPlaying = this._onStartPlaying.bind(this);
};

tv.freewheel.DemoPlayer.prototype = {
  requestAds: function (targetingArr) {
    this.currentAdContext = this.adManager.newContext();
    // The profile value will be provided by your FreeWheel solution engineer
    this.currentAdContext.setProfile('372464:dfw_desktop');

    // Set the target.
    this.currentAdContext.setVideoAsset(182065750, 734, null, null, null, null, tv.freewheel.SDK.ID_TYPE_FW, null, null);
    this.currentAdContext.setSiteSection(8962850, null, null, tv.freewheel.SDK.ID_TYPE_FW);

    let adContext = this.currentAdContext;
    Object.keys(targetingArr).forEach(function (adUnitCode) {
      targetingArr[adUnitCode].forEach(function (targeting) {
        Object.keys(targeting).forEach(function (key) {
          console.log(key + ' and ' + targeting[key]);
          adContext.addKeyValue(key, targeting[key]);
        });
      });
    });

    // working slots
    // this.currentAdContext.addTemporalSlot('preroll_1', 'preroll', 0);
    // this.currentAdContext.addTemporalSlot('midroll_1', 'midroll', 60);

    // Add 2 preroll, 1 midroll, 1 postroll slot
    // this.currentAdContext.addTemporalSlot('preroll_1', 'Prebid Preroll', 0);
    this.currentAdContext.addTemporalSlot('midroll_1', 'Prebid Midroll', 100, '', 1);
    this.currentAdContext.addTemporalSlot('midroll_2', 'Prebid Midroll', 300, '', 2);

    this.currentAdContext.addRenderer('class://VPAIDRenderer', null, 'text/js_ref', null, null, null, null);

    // Listen to request_complete and slot_ended events.
    this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_REQUEST_COMPLETE, this.onRequestComplete.bind(this));
    this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_SLOT_ENDED, this.onSlotEnded.bind(this));
    this.currentAdContext.addEventListener(tv.freewheel.SDK.VIDEO_STATE_PLAYING, this.onStartPlaying.bind(this));

    // The video display base is the area(canvas) where overlay and rich media ads are rendered.
    this.currentAdContext.registerVideoDisplayBase('displayBase');

    this.currentAdContext.submitRequest();
  },

  _onRequestComplete: function (evt) {
    if (evt.success) {
      this.adResponseLoaded = true;
      // Temporal slots include preroll, midroll, postroll and overlay slots.
      var temporalSlots = this.currentAdContext.getTemporalSlots();
      for (var i = 0; i < temporalSlots.length; i++) {
        var slot = temporalSlots[i];
        switch (slot.getTimePositionClass()) {
          case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:
            this.prerollSlots.push(slot);
            break;
          case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
            this.midrollSlots.push(slot);
            break;
          case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
            this.postrollSlots.push(slot);
            break;
        }
      }
      if (this.videoEl.currentSrc) {
        this.originalSource = this.videoEl.currentSrc;
      }
      document.getElementById('start').removeAttribute('disabled');
    }
  },

  _onSlotEnded: function (evt) {
    console.log('dispatchEvent _onSlotEnded ended');
    var slotTimePositionClass = evt.slot.getTimePositionClass();
    switch (slotTimePositionClass) {
      case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:
        this.playNextPreroll();
        break;
      case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
        this.playNextMidroll();
        break;
      case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
        this.playNextPostroll();
        break;
    }
  },

  _onSlotPause: function (evt) {
    console.log('dispatchEvent _onSlotPause ended');
    var slotTimePositionClass = evt.slot.getTimePositionClass();
    switch (slotTimePositionClass) {
      case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
        this.playNextMidRoll();
        break;
    }
  },

  _resume: function (evt) {
    console.log('dispatchEvent _onSlotResume ended');
  },

  playNextMidroll: function () {
    if (this.midrollSlots.length) {
      var slot1 = this.midrollSlots[0];
      var slotTimePosition1 = slot1.getTimePosition();
      var videoCurrentTime1 = this.videoEl.currentTime;

      if (Math.abs(videoCurrentTime1 - slotTimePosition1) < 0.5) {
        var slot = this.midrollSlots.shift();
        this.playCreative(slot);
      } else {
        this.playContent('resume');
      }
    } else {
      this.playContent('resume');
    }
  },

  playNextPreroll: function () {
    if (this.prerollSlots.length) {
      var slot = this.prerollSlots.shift();
      slot.play();
    } else {
      setTimeout(this.playContent.bind(this), 100);
    }
  },

  playNextPostroll: function () {
    if (this.postrollSlots.length > 0) {
      var slot = this.postrollSlots.shift();
      slot.play();
    } else {
      // No more postroll slots, stop here. Whole life cycle of this video+ad experience ends here.
      // So we do clean up here.
      if (this.videoEl.currentSrc != this.originalSource) {
        this.videoEl.src = this.originalSource;
      }
      if (this.currentAdContext) {
        this.currentAdContext.removeEventListener(tv.freewheel.SDK.EVENT_REQUEST_COMPLETE, this.onRequestComplete);
        this.currentAdContext.removeEventListener(tv.freewheel.SDK.EVENT_SLOT_ENDED, this.onSlotEnded);
      }
      this.currentAdContext = null;
      this.adManager = null;
    }
  },

  playContent: function (resume) {
    hideHelpers();
    this.videoEl.controls = true;
    if (this.videoEl.src != this.originalSource) {
      this.videoEl.src = this.originalSource;
      if (this.currentTime) {
        this.videoEl.currentTime = this.currentTime;
      }
    }
    if (this.adResponseLoaded) {
      // this.videoEl.addEventListener('ended', this.onContentVideoEnded);
      this.videoEl.addEventListener('timeupdate', this.onContentVideoTimeUpdated);
      if (this.currentAdContext) {
        this.currentAdContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_PLAYING);
      }
    }
    this.videoEl.play()
  },

  _onContentVideoTimeUpdated: function (evt) {
    if (this.midrollSlots.length == 0) {
      this.videoEl.removeEventListener('timeupdate', this.onContentVideoTimeUpdated);
      return;
    }

    for (var i = 0; i < this.midrollSlots.length; i++) {
      var slot = this.midrollSlots[i];
      var slotTimePosition = slot.getTimePosition();
      var videoCurrentTime = this.videoEl.currentTime;

      if (Math.abs(videoCurrentTime - slotTimePosition) < 0.5) {
        this.midrollSlots.splice(i, 1);
        // this.videoEl.play();
        this.currentAdContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_PAUSED);
        this.currentTime = this.videoEl.currentTime;
        this.playCreative(slot);
        return;
      }
    }
  },

  _onContentVideoEnded: function (evt) {
    console.log('dispatchEvent video ended');
    this.videoEl.removeEventListener('ended', this.onContentVideoEnded);
    if (this.currentAdContext) {
      this.currentAdContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_STOPPED);
    }
    this.playNextPostroll();
  },

  play: function () {
    if (this.prerollSlots.length) {
      this.playNextPreroll();
    } else {
      this.playContent();
    }
  },
  playCreative: function(slot) {
    var slotCustomId;
    slot.getAdInstances().forEach(ad => {
      highlight(ad._primaryCreativeRendition._wrapperUrl);
      slotCustomId = ad._slotCustomId;
      demoData[slotCustomId] = demoData[slotCustomId] || [];
      demoData[slotCustomId].push({
        duration: Math.floor(ad._primaryCreativeRendition._duration),
        cacheUrl: ad._primaryCreativeRendition._wrapperUrl
      });
    });
    console.log(demoData);
    updatePodBreakup(demoData[slotCustomId]);
    window.getDuration = getDurationWrapper(demoData[slotCustomId]);
    this.videoEl.controls = false;
    showHelpers();
    slot.play();
    initCreativeTimer(getDuration);
    window.slotPage = slot;
  },
  _onStartPlaying: function() {
    alert('word');
  }
}

function getDurationWrapper(data) {
  var counter = 0;
  var demoData = data;
  return function() {
    if (demoData[counter]) {
      updateAdCount(counter + 1, demoData.length);
      var duration = demoData[counter].duration;
    }
    counter++;
    return duration;
  }
}

function hideHelpers() {
  $('.adutils').hide();
  $('#showad').hide();
  $('#adCount').hide();
}

function showHelpers() {
  $('.adutils').show();
  $('#showad').show();
  $('#adCount').show();
}
