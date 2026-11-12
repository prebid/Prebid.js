Test Page - 'test/pages/native.html'
Test Spec File - 'test/spec/e2e/native/basic_native_ad.spec.js'

Native bids (`ext.appnexus.bid_ad_type: 3`); each `adm` is an OpenRTB native 1.2 response whose asset ids match the ones Prebid assigned in that imp's `native.request`.

Ad Units that generate the given 'Request' - 'Response' pair.

```(javascript)
[{
  code: '/19968336/prebid_native_example_1',
  mediaTypes: {
    native: {
      title: { required: true },
      image: { required: true },
      sponsoredBy: { required: true },
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13232354,
      allow_smaller_sizes: true
    }
  }]
}, {
  code: '/19968336/prebid_native_example_2',
  mediaTypes: {
    native: {
      title: { required: true },
      body: { required: true },
      image: { required: true },
      sponsoredBy: { required: true },
      icon: { required: false },
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13232354,
      allow_smaller_sizes: true
    }
  }]
}]
```
