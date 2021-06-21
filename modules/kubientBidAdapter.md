# Overview
​
**Module Name**: Kubient Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  artem.aleksashkin@kubient.com
​
# Description
​
Connects to Kubient KSSP demand source to fetch bids.  
​
# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250],[728, 90]],
        }
      },
            bids: [{
                "bidder": "kubient",
                "params": {
                    "zoneid": "5fbb948f1e22b",
                }   
            }]      
        }];         
