# Overview

```
Module Name:  EngageBDR Bid Adapter
Module Type:  Bidder Adapter
Maintainer:	  tech@engagebdr.com 
```

# Description

Adapter that connects to EngageBDR's demand sources.

# Test Parameters
```
var adUnits = [
	{
		code: 'div-gpt-ad-1460505748561-0',
		sizes: [[300, 250]],
		bids: [{
			bidder: 'ebdr',
			params: {
				zoneid: '99999',
				bidfloor: '1.00',
				ebdrDomain: 'dsp.bnmla.com'
			}
		}]
	}
];
```
