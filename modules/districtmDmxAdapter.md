# Overview

```
Module Name:  DistrictM Bid Adapter
Module Type:  Bidder Adapter
Maintainer:	  steve@districtm.net
```

# Description

Adapter that connects to DistrictM's demand sources.
This version only support banner

# Test Parameters
```
    var adUnits = [{
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]],
            }
        },
        bids: [{
            bidder: 'districtmDMX',
            params: {
                dmxid: 100001,
                memberid:  100003
            }
        }]
    }];
```
