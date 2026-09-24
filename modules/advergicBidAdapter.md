# Overview

```
Module Name:  Advergic Bid Adapter
Module Type:  Bidder Adapter
Maintainer: hello@advergic.com
```

# Description

Connects to Advergic exchange for bids.

The Advergic bid adapter supports Banner only.

# Test Parameters

The Advergic adapter requires an `accountId` issued by Advergic. Publishers should contact [hello@advergic.com](mailto:hello@advergic.com) to obtain an `accountId` and test credentials.

Replace `YOUR_TEST_ACCOUNT_ID` below with the test account ID provided by Advergic.

```
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    bids: [{
      bidder: 'advergic',
      params: {
        accountId: 'YOUR_TEST_ACCOUNT_ID'
      }
    }]
  }
];
```
### How to view advergic's bid request in the network tab?
Open a webpage in browser of your choice, where advergic is setup to bid. Inspect and navigate to the network tab in the dev tools. search for requests with pbs.avads. There, you will see all the requests related to advergic's bid adapter.