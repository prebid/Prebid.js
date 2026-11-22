Test Pages:
  - 'test/pages/bidderSettings.html'
  - 'test/pages/currency.html'
  - 'test/pages/consent_mgt_gdpr.html'
Test Spec Files:
  - 'test/spec/e2e/modules/e2e_bidderSettings.spec.js'
  - 'test/spec/e2e/modules/e2e_currency.spec.js'
  - 'test/spec/e2e/modules/e2e_consent_mgt_gdpr.spec.js'

A banner bid (cpm 0.50) for the first imp and a native bid (cpm 10) for the second.

Ad Units that generate the given 'Request' - 'Response' pair.

```(javascript)
[{
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13144370
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
