
# Overview

```
Module Name: Connatix Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid_integration@connatix.com
```

# Description
Connects to Connatix demand source to fetch bids.  
Please use ```connatix``` as the bidder code. 

# Test Parameters
```
var adUnits = [
	{
		code: '1',
		mediaTypes: {
			banner: {
				sizes: [[640, 480], [320, 180]],
			},
		},
		bids: [
			{
				bidder: 'connatix',
				params: {
					placementId: 'e4984e88-9ff4-45a3-8b9d-33aabcad634e', // required
					bidfloor: 2.5, // optional
				},
			},
			// Add more bidders and their parameters as needed
		],
	},
	// Define more ad units here if necessary
];
```