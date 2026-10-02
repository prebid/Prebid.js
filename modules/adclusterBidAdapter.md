# Overview

**Module Name**: Adcluster Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: dev@adcluster.com.tr

# Description

Prebid.js bidder adapter module for connecting to Adcluster.

# Test Parameters

```
var adUnits = [
	   {
		   code: 'adcluster-banner',
		   mediaTypes: {
			   banner: {
				   sizes: [[300, 250]],
			   }
		   },
		bids: [{
			bidder: 'adcluster',
			params: {
              unitId: '42d1f525-5792-47a6-846d-1825e53c97d6',
			  previewMediaId: "b4dbc48c-0b90-4628-bc55-f46322b89b63",
			},
		}]
	   },
       	   {
		   code: 'adcluster-video',
		   mediaTypes: {
			   video: {
				   playerSize: [[640, 480]],
			   }
		   },
		bids: [{
			bidder: 'adcluster',
                  params: {
                    unitId: "37dd91b2-049d-4027-94b9-d63760fc10d3",
                    previewMediaId: "133b7dc9-bb6e-4ab2-8f95-b796cf19f27e",
                  },
		}]
	   }
];
```
