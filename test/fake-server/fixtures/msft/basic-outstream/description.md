Test Page - 'test/pages/outstream.html'
Test Spec File - 'test/spec/e2e/outstream/basic_outstream_video_ad.spec.js'

Outstream video bids (`ext.appnexus.bid_ad_type: 1`) with the VAST in `adm` and `ext.appnexus.renderer_url` / `renderer_id` / `renderer_config`, from which the adapter sets up the AppNexus outstream renderer.

Ad Units that generate the given 'Request' - 'Response' pair.

```(javascript)
[{
  code: 'video_ad_unit_1',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 480],
      skip: 1,
      playbackmethod: [2]
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13232385
    }
  }]
}, {
  code: 'video_ad_unit_2',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 480],
      skip: 1,
      playbackmethod: [2]
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13232385
    }
  }]
}]
```
