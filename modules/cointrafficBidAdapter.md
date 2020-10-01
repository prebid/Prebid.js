# Overview

```
Module Name: Cointraffic Bidder Adapter
Module Type: Cointraffic Adapter
Maintainer: tech@cointraffic.io
```

# Description
The Cointraffic client module makes it easy to implement Cointraffic directly into your website. To get started, simply replace the ``placementId`` with your assigned tracker key. This is dependent on the size required by your account dashboard. 
We support response in different currencies. Supported currencies listed [here](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html).

For additional information on this module, please contact us at ``support@cointraffic.io``.

# Test Parameters
```
  var adUnits = [{
    code: 'test-ad-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]],
        }
    },
    bids: [{
    bidder: 'cointraffic',
      params: { 
        placementId: 'testPlacementId'
      }
    }]
  }];
```
