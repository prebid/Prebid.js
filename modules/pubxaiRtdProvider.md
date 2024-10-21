## Overview

- Module Name: pubX.ai RTD Provider
- Module Type: RTD Adapter
- Maintainer: phaneendra@pubx.ai

## Description

This RTD module, provided by pubx.ai, is used to set dynamic floors within Prebid.

## Usage

Ensure that the following modules are listed when building Prebid: `priceFloors`.
For example:

```shell
gulp build --modules=priceFloors
```

To compile the RTD module into your Prebid build:

```shell
gulp build --modules=rtdModule,pubxaiRtdProvider
```

To utilize the pubX.ai RTD module, add `realTimeData` with the parameters mentioned below to the Prebid config.

```js
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

| Name               | Type    | Description                                                    | Default                    |
| :----------------- | :------ | :------------------------------------------------------------- | :------------------------- |
| name               | String  | Name of the real-time data module                              | Always `pubxai`            |
| waitForIt          | Boolean | Should be `true` if an `auctionDelay` is defined (optional)    | `false`                    |
| params             | Object  |                                                                |                            |
| params.pubxId      | String  | Publisher ID                                                   |                            |
| params.endpoint    | String  | URL to retrieve floor data (optional)                          | `https://floor.pbxai.com/` |
| params.floorMin    | Number  | Minimum CPM floor (optional)                                   | `None`                     |
| params.enforcement | Object  | Enforcement behavior within the Price Floors Module (optional) | `None`                     |
| params.data        | Object  | Default floor data provided by pubX.ai (optional)              | `None`                     |

## What Should Change in the Bid Request?

There are no direct changes in the bid request due to our RTD module, but floor configuration will be set using the price floors module. These changes will be reflected in adunit bids or bidder requests as floor data.

