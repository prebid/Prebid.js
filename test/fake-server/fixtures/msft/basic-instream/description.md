Test Page - 'test/pages/instream.html'
Test Spec File - 'test/spec/e2e/instream/basic_instream_video_ad.spec.js'

An instream video bid (`ext.appnexus.bid_ad_type: 1`) with `nurl` and `ext.appnexus.asset_url` and no `adm`, from which the adapter builds `vastUrl`. The page applies a `bidCpmAdjustment` of 10.

Ad Unit that generates the given 'Request' - 'Response' pair.

```(javascript)
[{
  code: 'video1',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      skip: 0,
      playbackmethod: [2]
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13232361
    }
  }]
}]
```
