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

#### Example Configuration

```js
pbjs.enableAnalytics({
    provider: 'iiqAnalytics'
});
```


### Manual Report Trigger with reportExternalWin

The reportExternalWin function allows for manual reporting, meaning that reports will not be sent automatically but only when triggered manually.

To enable this manual reporting functionality, you must set the manualWinReportEnabled parameter in Intent IQ Unified ID module configuration is true. Once enabled, reports can be manually triggered using the reportExternalWin function.


### Calling the reportExternalWin Function

To call the reportExternalWin function, you need to pass the partner_id parameter as shown in the example below:

```js
window.intentIqAnalyticsAdapter_[partner_id].reportExternalWin()
```
Example use with Partner ID = 123455

```js
window.intentIqAnalyticsAdapter_123455.reportExternalWin()
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

| Field              | Data Type | Description                                                                                                                                      | Example                       | Mandatory |
|--------------------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|-----------|
| biddingPlatformId   | Integer   | Specify the platform in which this ad impression was rendered – 1 – Prebid, 2 – Amazon, 3 – Google, 4 – Open RTB (including your local Prebid server) | 1                             | Yes       |
| partnerAuctionId    | String    | Use this when you are running multiple auction solutions across your assets and have a unified identifier for auctions                            | 3d44542d-xx-4662-xxxx-4xxxx3d8e | No        |
| bidderCode          | String    | Specifies the name of the bidder that won the auction as reported by Prebid and all other bidding platforms                                       | newAppnexus                   | Yes       |
| prebidAuctionId     | String    | Specifies the identifier of the Prebid auction. Leave empty or undefined if Prebid is not the bidding platform                                   |                               |         |
| cpm                 | Decimal   | Cost per mille of the impression as received from the demand-side auction (without modifications or reductions)                                   | 5.62                          | Yes       |
| currency            | String    | Currency of the auction                                                                                                                          | USD                           | Yes       |
| originalCpm         | Decimal   | Leave empty or undefined if Prebid is not the bidding platform                                                                                    | 5.5                           | No        |
| originalCurrency    | String    | Currency of the original auction                                                                                                                 | USD                           | No        |
| status              | String    | Status of the impression. Leave empty or undefined if Prebid is not the bidding platform                                                          | rendered                      | No        |
| placementId         | String    | Unique identifier of the ad unit on the webpage that showed this ad                                                                               | div-1                         | No        |


To report the auction win, call the function as follows:

```js
window.intentIqAnalyticsAdapter_[partner_id].reportExternalWin(reportData)
```
