# Overview

```
Module Name: Spark Bidder Adapter
Module Type: Bidder Adapter
Maintainer: <add contact email>
```

# Description
Module that connects to the Spark bidder to request bids via OpenRTB.

# Test Parameters
```
var adUnits = [{
  code: 'spark-adunit-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'spark',
    params: {
      siteId: 'test-site-id',
      adUnitName: 'test-adunit-name'
    }
  }]
}];
```
