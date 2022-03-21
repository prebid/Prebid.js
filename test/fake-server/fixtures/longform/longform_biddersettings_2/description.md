Test Page - 'integrationExamples/longform/basic_w_bidderSettings.html'
Test Spec File - 'test/spec/e2e/longform/basic_w_bidderSettings.spec.js'

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