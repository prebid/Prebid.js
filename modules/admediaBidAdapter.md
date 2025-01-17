# Overview

**Module Name**: Admedia Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  developers@admedia.com

# Description

Module that connects to Admedia's bidder for bids.

# Test Parameters
```
var adUnits = [
	   {
		   code: 'ad-div',
		   mediaTypes: {
			   banner: {
				   sizes: [[300, 250]],
			   }
		   },
		bids: [{

			bidder: 'admedia',
			params: {
				placementId: '782332',
				aid: '86858',
			},
			refererInfo: {
				page: "http://addreferrerhere.com"
			}

		}]
	   } 
];
```