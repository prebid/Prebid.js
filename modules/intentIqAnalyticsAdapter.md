# Overview

Module Name: iiqAnalytics
Module Type: Analytics Adapter
Maintainer: julian@intentiq.com

# Description

By using this Intent IQ adapter, you will be able to obtain comprehensive analytics and metrics regarding the performance of the Intent IQ Unified ID module. This includes how the module impacts your revenue, CPMs, and fill rates related to bidders and domains.

## Intent IQ Universal ID Registration

No registration for this module is required.

## Intent IQ Universal IDConfiguration

<B>IMPORTANT</B>: only effective when Intent IQ Universal ID module is installed and configured. [(How-To)](https://docs.prebid.org/dev-docs/modules/userid-submodules/intentiq.html)

No additional configuration for this module is required. We will use the configuration provided for Intent IQ Universal IQ module.

#### Example Configuration

```js
pbjs.enableAnalytics({
    provider: 'iiqAnalytics'
});
```

### Calling the reportExternalWin Function

To call the reportExternalWin function, you need to pass the partner_id parameter as shown in the example below:

```js
window.intentIqAnalyticsAdapter_[partner_id].reportExternalWin()
```

### Function Parameters

The reportExternalWin function takes an object containing auction win data. Below is an example of the object:

```js
var reportData = {
biddingPlatformId: 1, // Platform ID. The value 1 corresponds to PreBid.
partnerAuctionId: '[YOUR_AUCTION_ID_IF_EXISTS]', // Auction ID, if available.
bidderCode: 'xxxxxxxx', // Bidder code.
prebidAuctionId: '3d4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx8e', // PreBid auction ID.
cpm: 1.5, // Cost per thousand impressions (CPM).
currency: 'USD', // Currency for the CPM value.
originalCpm: 1.5, // Original CPM value.
originalCurrency: 'USD', // Original currency.
status: 'rendered', // Auction status, e.g., 'rendered'.
placementId: 'div-1' // ID of the ad placement.
}
```

To report the auction win, call the function as follows:

```js
window.intentIqAnalyticsAdapter_[partner_id].reportExternalWin(reportData)
```
