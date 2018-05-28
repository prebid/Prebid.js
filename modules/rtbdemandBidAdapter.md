# Overview

**Module Name**: Rtbdemand Media fmxSSP Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  rtb@rtbdemand.com

# Description

Connects to Rtbdemand Media fmxSSP demand source to fetch bids.  

# Test Parameters
```	
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
        bidder: 'rtbdemand',
        params: {
          zoneid: '9999',
          floor: 0.005,
          server: 'bidding.rtbdemand.com'
        }
      }]
    }];
	
```
