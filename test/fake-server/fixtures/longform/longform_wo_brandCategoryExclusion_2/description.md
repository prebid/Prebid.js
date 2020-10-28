Test Page - 'integrationExamples/longform/basic_wo_brandCategoryExclusion.html'
Test Spec File - 'test/spec/e2e/longform/basic_wo_brandCategoryExclusion.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

```(javascript)
[{
  code: 'sample-code',
  sizes: [640, 480],
  mediaTypes: {
    video: {
      context: 'adpod',
      playerSize: [640, 480],
      adPodDurationSec: 300,
      durationRangeSec: [15, 30],
      requireExactDuration: false
    }
  },
  bids: [
    {
      bidder: 'appnexus',
      params: {
        placementId: 15394006
      }
    }
  ]
}];
```

SetConfig to use with AdUnit:
```
pbjs.setConfig({
  cache: {
    url: 'https://prebid.adnxs.com/pbc/v1/cache'
  },
  adpod: {
    brandCategoryExclusion: false
  }
});
```