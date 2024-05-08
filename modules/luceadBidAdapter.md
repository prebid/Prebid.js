# Overview

Module Name: Lucead Bidder Adapter

Module Type: Bidder Adapter

Maintainer: prebid@lucead.com

# Description

Module that connects to Lucead demand source to fetch bids.

# Params type definition

```typescript
type Params = {
    placementId: string;
    region?: 'eu' | 'us' | 'ap';
};
```

# Test Parameters

```javascript
const adUnits=[
	{
		code:'test-div',
		sizes:[[300,250]],
		bids:[
			{
				bidder:'lucead',
				params:{
					placementId:'2',
					region:'us', // optional: 'eu', 'us', 'ap'
				}
			}
		]
	}
];
```
