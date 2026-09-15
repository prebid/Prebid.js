Test Pages:
  - 'test/pages/bidderSettings.html'
  - 'test/pages/consent_mgt_gdpr.html'
  - 'test/pages/currency.html'
  - 'test/pages/priceGranularity.html'
  - 'test/pages/sizeConfig.html'
  - 'test/pages/userSync.html'
Test Spec Files:
  - 'test/spec/e2e/modules/e2e_bidderSettings.spec.js'
  - 'test/spec/e2e/modules/e2e_consent_mgt_gdpr.spec.js'
  - 'test/spec/e2e/modules/e2e_currency.spec.js'
  - 'test/spec/e2e/modules/e2e_priceGranularity.spec.js'
  - 'test/spec/e2e/modules/e2e_sizeConfig.spec.js'
  - 'test/spec/e2e/modules/e2e_userSync.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

```(javascript)
[{
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],
    }
  },
  // Replace this object to test a new Adapter!
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13144370
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

Refer to individual test pages to see the proper setConfigs for each test.
