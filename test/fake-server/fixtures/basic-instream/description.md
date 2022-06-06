Test Page - 'test/pages/instream.html'
Test Spec File - 'test/spec/e2e/instream/basic_instream_ad.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

```(javascript)
[{
  code: 'video1',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480]
    }
  },
  bids: [
    {
      bidder: 'appnexus',
      params: {
        placementId: '13232361',
        video: {
          skipppable: false,
          playback_methods: ['auto_play_sound_off']
        }
      }
    }
  ]
}];
```