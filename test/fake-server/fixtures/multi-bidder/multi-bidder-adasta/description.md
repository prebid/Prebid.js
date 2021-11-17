Test Page - 'test/pages/multiple_bidders.html'
Test Spec File - 'test/spec/e2e/multi-bidder/e2e_multiple_bidders.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

```(javascript)
[{
  code: 'div-banner-native-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13232392,
    }
  }]
},
{
  code: 'div-banner-native-2',
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
    bidder: 'adasta',
    params: {
      placementId: 13232392,
    }
  }]
}];
```