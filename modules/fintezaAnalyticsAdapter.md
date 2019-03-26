# Overview

```
Module Name:  Finteza Analytics Adapter
Module Type:  Analytics Adapter
Maintainer: renat@finteza.com
```

# Description

The Finteza adapter for integration with Prebid is an analytics tool for publishers who use the Header Bidding technology. The adapter tracks auction opening, offer sending to advertisers, receipt of bids by the publisher and auction winner selection. All tracks are sent to Finteza and enable visual advertiser quality evaluation: how many offers partners accept, what prices they provide, how fast they respond and how often their bids win.

For more information, visit the [official Finteza website](https://www.finteza.com/).

# Test Parameters

```
{
  provider: 'finteza',
  options: {
    id:               'xxxxx', // Website ID (required)
    bidRequestTrack:  'Bid Request %BIDDER%',
    bidResponseTrack: 'Bid Response %BIDDER%',
    bidTimeoutTrack:  'Bid Timeout %BIDDER%',
    bidWonTrack:      'Bid Won %BIDDER%'
  }
}
```
