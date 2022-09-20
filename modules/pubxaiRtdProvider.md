
## Overview
Module Name: pubX.ai RTD Provider
Module Type: RTD Adapter
Maintainer: bharadhwaj@pubx.ai

  
## Description
RTD module for prebid provided by pubX.ai.

  
## Usage

Inorder to compile the RTD module into your Prebid build:

```shell
gulp build --modules=rtdModule,pubxaiRtdProvider
```

Now to use the pubX.ai RTD module, add `realTimeData` with the below mentioned params to the Prebid config.

```javascript
const AUCTION_DELAY = 100;
pbjs.setConfig({
	// rest of the config
	...,
	realTimeData: {
		auctionDelay: AUCTION_DELAY,
		dataProviders: {
			name: "pubxai",
			waitForIt: true,
			params: {
				useRtd: true,
				endpoint: `<publisher_endpoint_url>`
			}
		}
	}
	// rest of the config
	...,
});
```

## Parameters

| Name            | Type    | Description                                                                  | Default         |
| :-------------- | :------ | :--------------------------------------------------------------------------- |:--------------- |
| name            | String  | Real time data module name                                                   | Always `pubxai` |
| waitForIt       | Boolean | Should be `true` if there's an `auctionDelay` defined (optional)             | `false`         |
| params          | Object  |                                                                              |                 |
| params.useRtd   | Boolean | To say whether to invoke the RTD module or not. Passing `false` will skip it | `true`          |
| params.endpoint | String  | URL provided to the publisher to get the floor data                          |                 |


