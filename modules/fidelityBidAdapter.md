# Overview
​
**Module Name**: Fidelity Media fmxSSP Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  on@fidelity-media.com
​
# Description
​
Connects to Fidelity Media fmxSSP demand source to fetch bids.  
​
# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        }
      },
      bids: [{
        bidder: 'fidelity',
        params: {
          zoneid: '27248',
          floor: 0.005,
          server: 'x.fidelity-media.com'
        }
      }]
    }];
	
```