# Overview

```txt
Module Name: Sharethrough Analytics Adapter
Module Type: Analytics Adapter
Maintainer:  pubgrowth.engineering@sharethrough.com
```

#### About

This analytics adapter collects data about win/loss events (beacon firings) from each auction run on your site. This data is communicated to Sharethrough via API calls the analytics adapter makes to an endpoint dedicated to the collection of beacon information. Sharethrough uses this information to improve its services as a SSP.

This analytics adapter is free to use.

#### Configuration

In order to guarantee consistent reporting events, we recommend
including the GPT Pre-Auction Module, `gptPreAuction`. This module is included
by default when Prebid is downloaded.

If you are compiling from source, this might look something like:

```sh
gulp bundle --modules=gptPreAuction,sharethroughBidAdapter,sharethroughAnalyticsAdapter
```

Please note that the above snippet is a "bare bones" example - you will likely want to include other modules as well. A more realistic example might look something like the example below (with other bid adapters also included in the list as needed):

```sh
gulp bundle --modules=gptPreAuction,consentManagement,consentManagementGpp,consentManagementUsp,enrichmentFpdModule,gdprEnforcement,sharethroughBidAdapter,sharethroughAnalyticsAdapter
```

Enable the Sharethrough Analytics Adapter in Prebid.js using the analytics provider `sharethrough` as seen in the example below.

#### Example Configuration

```js
pbjs.enableAnalytics({
  provider: 'sharethrough',
});
```
