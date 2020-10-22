Test Page - 'test/pages/native.html'
Test Spec File - 'test/spec/e2e/native/basic_native_ad.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

```(javascript)
[{
  code: '/19968336/prebid_native_example_1',
  sizes: [360, 360],
  mediaTypes: {
    native: {
      title: {
        required: true
      },
      image: {
        required: true
      },
      sponsoredBy: {
        required: true
      }
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13232354,
      allowSmallerSizes: true
    }
  }]
}, {
  code: '/19968336/prebid_native_example_2',
  sizes: [
    [1, 1]
  ],
  mediaTypes: {
    native: {
      title: {
        required: true
      },
      body: {
        required: true
      },
      image: {
        required: true
      },
      sponsoredBy: {
        required: true
      },
      icon: {
        required: false
      },
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13232354,
      allowSmallerSizes: true
    }
  }]
}];
```