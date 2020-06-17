Test Page - 'test/pages/outstream.html'
Test Spec File - 'test/spec/e2e/outstream/basic_outstream_ad.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

```(javascript)
[{
  code: 'video_ad_unit_1',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 480]
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13232385,
      video: {
        skippable: true,
        playback_method: ['auto_play_sound_off']
      }
    }
  }]
}, {
  code: 'video_ad_unit_2',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 480]
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13232385,
      video: {
        skippable: true,
        playback_method: ['auto_play_sound_off']
      }
    }
  }]
}];
```