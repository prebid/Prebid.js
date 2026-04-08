## Overview

- Module Name: PubMatic RTD Provider
- Module Type: RTD Adapter
- Maintainer: header-bidding@pubmatic.com

## Description

The PubMatic RTD module provides dynamic yield optimization by fetching real-time pricing floor data and generating targeting data for ad server integration and reporting. The module integrates with Prebid's Price Floors system as per [Dynamic Floor Data Provider](https://docs.prebid.org/dev-docs/modules/floors.html#floor-data-provider-interface) guidelines.

## Usage

Step 1: Contact PubMatic to get a publisher ID and create your first profile.

Step 2: Integrate the PubMatic Analytics Adapter (see Prebid Analytics modules) as well as the Price Floors module.

Step 3: Prepare the base Prebid file.

For example:

To compile the Price Floors, PubMatic RTD module and PubMatic Analytics Adapter into your Prebid build:

```shell
gulp build --modules=priceFloors,rtdModule,pubmaticRtdProvider,pubmaticAnalyticsAdapter
```

{: .alert.alert-info :}
Note: The PubMatic RTD module is dependent on the global real-time data module : `rtdModule`, price floor module : `priceFloors` and PubMatic Analytics Adapter : `pubmaticAnalyticsAdapter`.

Step 4: Set configuration and enable PubMatic RTD Module using pbjs.setConfig.

## Configuration

This module is configured as part of the `realTimeData.dataProviders`.  We recommend setting `auctionDelay` to at least 250 ms and make sure `waitForIt` is set to `true` for the `pubmatic` RTD provider.

```js
const AUCTION_DELAY = 250;
pbjs.setConfig({
    // rest of the config
    ...,
    realTimeData: {
        auctionDelay: AUCTION_DELAY,
        dataProviders: [
            {
                name: "pubmatic",
                waitForIt: true,
                params: {
                    publisherId: `<publisher_id>`, // please contact PubMatic to get a publisherId for yourself
                    profileId: `<profile_id>`, // please contact PubMatic to get a profileId for yourself
                },
            },
        ],
    },
    // rest of the config
    ...,
});
```

## Parameters

| Name               | Type    | Description                                                    | Default                    |
| :----------------- | :------ | :------------------------------------------------------------- | :------------------------- |
| name               | String  | Name of the real-time data module                              | Always `pubmatic`          |
| waitForIt          | Boolean | Should be `true` if an `auctionDelay` is defined (mandatory)    | `false`                     |
| params             | Object  |                                                                |                            |
| params.publisherId | String  | Publisher ID                                                   |                            |
| params.profileId   | String  | Profile ID                                                     |                            |

## Targeting Keys

The module sets the following targeting keys for ad server integration and reporting:

| Key | Description | Values |
| :-- | :---------- | :----- |
| pm_ym_flrs | Whether RTD floor was applied to the auction | 0 (not applied)/1 (applied) |
| pm_ym_flrv | Floor value after applying dynamic multipliers | Decimal value (e.g., "1.25") |
| pm_ym_bid_s | Bid outcome status | 0 (no bid), 1 (won), 2 (floored) |


## What Should Change in the Bid Request?

The RTD module applies dynamic floor configuration through the Price Floors module, which affects floor values in bid requests. Additionally, the module generates targeting data that is made available to the ad server.