## Overview

- Module Name: PubMatic RTD Provider
- Module Type: RTD Adapter
- Maintainer: header-bidding@pubmatic.com

## Description

The PubMatic RTD module fetches pricing floor data and updates the Price Floors Module based on user's context in real-time as per Price Floors Modules Floor Data Provider Interface guidelines (https://docs.prebid.org/dev-docs/modules/floors.html#floor-data-provider-interface)

## Usage

Step 1: Contact PubMatic to get a publisher ID and create your first profile.

Step 2: Integrate the PubMatic Analytics Adapter (see Prebid Analytics modules) as well as the Price Floors module.

Step 3: Prepare the base Prebid file.

For example:

```shell
gulp build --modules=priceFloors
```

To compile the PubMatic RTD module and PubMatic Analytics Adapter into your Prebid build:

```shell
gulp build --modules=rtdModule,pubmaticRtdProvider,pubmaticAnalyticsAdapter
```

> Note : Ensure that the following modules are listed when building Prebid: `priceFloors`.

Step 4: Set configuration and enable PubMatic RTD Module using pbjs.setConfig.
To utilize the PubMatic RTD module, add `realTimeData` with the parameters mentioned below to the Prebid config.

```js
const AUCTION_DELAY = 500;
pbjs.setConfig({
	// rest of the config
	...,
	realTimeData: {
		auctionDelay: AUCTION_DELAY,
		dataProviders: [{
			name: "pubmatic",
			waitForIt: true,
			params: {
				publisherId: `<publisher_id>`, // please contact PubMatic to get a publisherId for yourself
				profileId: `<profile_id>`,     // please contact PubMatic to get a profileId for yourself
			}
		}]
	}
	// rest of the config
	...,
});
```

## Parameters

| Name               | Type    | Description                                                    | Default                    |
| :----------------- | :------ | :------------------------------------------------------------- | :------------------------- |
| name               | String  | Name of the real-time data module                              | Always `pubmatic`          |
| waitForIt          | Boolean | Should be `true` if an `auctionDelay` is defined (optional)    | `true`                     |
| params             | Object  |                                                                |                            |
| params.publisherId | String  | Publisher ID                                                   |                            |
| params.profileId   | String  | Profile ID                                                     |                            |


## What Should Change in the Bid Request?

There are no direct changes in the bid request due to our RTD module, but floor configuration will be set using the price floors module. These changes will be reflected in adunit bids or bidder requests as floor data.