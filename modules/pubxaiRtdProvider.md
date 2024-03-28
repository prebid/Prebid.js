## Overview

Module Name: pubX.ai RTD Provider
Module Type: RTD Adapter
Maintainer: phaneendra@pubx.ai

## Description

RTD module for prebid provided by pubX.ai.

## Usage

Make sure to have the following modules listed while building prebid : `priceFloors`
For example:

```shell
gulp build --modules=priceFloors
```

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
				pubxId: `<publisher_id>`,
				endpoint: `<publisher_endpoint>`, // (optional)
				floorMin: `<floorMin>`, // (optional)
				enforcement: `<enforcement>`, // (optional)
				data: `<defaultConfig>` // (optional)
			}
		}
	}
	// rest of the config
	...,
});
```

## Parameters

| Name               | Type    | Description                                                      | Default                    |
| :----------------- | :------ | :--------------------------------------------------------------- | :------------------------- |
| name               | String  | Real time data module name                                       | Always `pubxai`            |
| waitForIt          | Boolean | Should be `true` if there's an `auctionDelay` defined (optional) | `false`                    |
| params             | Object  |                                                                  |                            |
| params.pubxId      | String  | Publisher Id                                                     |                            |
| params.endpoint    | String  | URL to get the floor data (optional)                             | `https://floor.pbxai.com/` |
| params.floorMin    | Number  | Mimimum CPM floor (optional)                                     | `None`                     |
| params.enforcement | Object  | Enforcement behavior within the Price Floors Module (optional)   | `None`                     |
| params.data        | Object  | Default Floor data provided by (optional)                        | `None`                     |
