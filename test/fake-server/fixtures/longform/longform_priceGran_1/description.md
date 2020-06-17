Test Page - 'integrationExamples/longform/basic_w_priceGran.html'
Test Spec File - 'test/spec/e2e/longform/basic_w_priceGran.spec.js'

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
const customConfigObject = {
  'buckets': [{
    'precision': 2, // default is 2 if omitted - means 2.1234 rounded to 2 decimal places = 2.12
    'min': 0,
    'max': 5,
    'increment': 0.01 // from $0 to $5, 1-cent increments
  },
  {
    'precision': 2,
    'min': 5,
    'max': 8,
    'increment': 0.05 // from $5 to $8, round down to the previous 5-cent increment
  },
  {
    'precision': 2,
    'min': 8,
    'max': 40,
    'increment': 0.5 // from $8 to $40, round down to the previous 50-cent increment
  }]
};

pbjs.setConfig({
  cache: {
    url: 'https://prebid.adnxs.com/pbc/v1/cache'
  },
  adpod: {
    brandCategoryExclusion: true
  },
  priceGranularity: customConfigObject
});
```