# Overview
This module allows Prebid.js to support PAAPI by integrating it with GPT's [experimental PAAPI
support](https://github.com/google/ads-privacy/tree/master/proposals/fledge-multiple-seller-testing).

To learn more about PAAPI in general, go [here](https://github.com/WICG/turtledove/blob/main/PAAPI.md).

This document covers the steps necessary for publishers to enable PAAPI on their inventory. It also describes
the changes Bid Adapters need to implement in order to support PAAPI.

## Publisher Integration
Publishers wishing to enable PAAPI support must do two things. First, they must compile Prebid.js with support for this module.
This is accomplished by adding the `paapiForGpt` module to the list of modules they are already using:

```
gulp build --modules=paapiForGpt,...
```

Second, they must enable PAAPI in their Prebid.js configuration. 
This is done through module level configuration, but to provide a high degree of flexiblity for testing, PAAPI settings also exist the slot level.

### Module Configuration
This module exposes the following settings:

|Name |Type |Description |Notes |
| :------------ | :------------ | :------------ |:------------ |
|enabled | Boolean |Enable/disable the module |Defaults to `false` |
|bidders | Array[String] |Optional list of bidders |Defaults to all bidders |
|defaultForSlots | Number |Default value for `imp.ext.ae` in requests for specified bidders |Should be 1 |

As noted above, PAAPI support is disabled by default. To enable it, set the `enabled` value to `true` for this module and configure `defaultForSlots` to be `1` (meaning _Client-side auction_).
using the `setConfig` method of Prebid.js. Optionally, a list of bidders to apply these settings to may be provided:

```js
pbjs.que.push(function() {
  pbjs.setConfig({
    paapi: {
      enabled: true,
      bidders: ['openx', 'rtbhouse'],
      defaultForSlots: 1
    }
  });
});
```

### AdUnit Configuration
All adunits can be opted-in to PAAPI in the global config via the `defaultForSlots` parameter.
If needed, adunits can be configured individually by setting an attribute of the `ortb2Imp` object for that
adunit. This attribute will take precedence over `defaultForSlots` setting.

|Name |Type |Description |Notes |
| :------------ | :------------ | :------------ |:------------ |
| ortb2Imp.ext.ae | Integer | Auction Environment: 1 indicates PAAPI eligible, 0 indicates it is not | Absence indicates this is not PAAPI eligible |

The `ae` field stands for Auction Environment and was chosen to be consistent with the field that GAM passes to bidders
in their Open Bidding and Exchange Bidding APIs. More details on that can be found
[here](https://github.com/google/ads-privacy/tree/master/proposals/fledge-rtb#bid-request-changes-indicating-interest-group-auction-support)
In practice, this looks as follows:

```js
pbjs.addAdUnits({
    code: "my-adunit-div",
    // other config here
    ortb2Imp: {
        ext: {
            ae: 1
        }
    }
});
```

## Bid Adapter Integration
Chrome has enabled a two-tier auction in PAAPI. This allows multiple sellers (frequently SSPs) to act on behalf of the publisher with
a single entity serving as the final decision maker. In their [current approach](https://github.com/google/ads-privacy/tree/master/proposals/fledge-multiple-seller-testing),
GPT has opted to run the final auction layer while allowing other SSPs/sellers to participate as
[Component Auctions](https://github.com/WICG/turtledove/blob/main/PAAPI.md#21-initiating-an-on-device-auction) which feed their
bids to the final layer. To learn more about Component Auctions, go [here](https://github.com/WICG/turtledove/blob/main/PAAPI.md#24-scoring-bids-in-component-auctions).

The PAAPI auction, including Component Auctions, are configured via an `AuctionConfig` object that defines the parameters of the auction for a given
seller. This module enables PAAPI support by allowing bid adaptors to return `AuctionConfig` objects in addition to bids. If a bid adaptor returns an
`AuctionConfig` object, Prebid.js will register it with the appropriate GPT ad slot so the bidder can participate as a Component Auction in the overall
PAAPI auction for that slot. More details on the GPT API can be found [here](https://developers.google.com/publisher-tag/reference#googletag.config.componentauctionconfig).

Modifying a bid adapter to support PAAPI is a straightforward process and consists of the following steps:
1. Detecting when a bid request is PAAPI eligible
2. Responding with AuctionConfig

PAAPI eligibility is made available to bid adapters through the `bidderRequest.paapi.enabled` field.
The [`bidderRequest`](https://docs.prebid.org/dev-docs/bidder-adaptor.html#bidderrequest-parameters) object is passed to
the [`buildRequests`](https://docs.prebid.org/dev-docs/bidder-adaptor.html#building-the-request) method of an adapter. Bid adapters
who wish to participate should read this flag and pass it to their server. PAAPI eligibility depends on a number of parameters:

1. Chrome enablement
2. Publisher participatipon in the [Origin Trial](https://developer.chrome.com/docs/privacy-sandbox/unified-origin-trial/#configure)
3. Publisher Prebid.js configuration (detailed above)

When a bid request is PAAPI enabled, a bid adapter can return a tuple consisting of bids and AuctionConfig objects rather than just a list of bids:

```js
function interpretResponse(resp, req) {
    // Load the bids from the response - this is adapter specific
    const bids = parseBids(resp);

    // Load the auctionConfigs from the response - also adapter specific
    const auctionConfigs = parseAuctionConfigs(resp);

    if (auctionConfigs) {
        // Return a tuple of bids and auctionConfigs. It is possible that bids could be null.
        return {bids, auctionConfigs};
    } else {
        return bids;
    }
}
```

An AuctionConfig must be associated with an adunit and auction, and this is accomplished using the value in the `bidId` field from the objects in the
`validBidRequests` array passed to the `buildRequests` function - see [here](https://docs.prebid.org/dev-docs/bidder-adaptor.html#ad-unit-params-in-the-validbidrequests-array)
for more details. This means that the AuctionConfig objects returned from `interpretResponse` must contain a `bidId` field whose value corresponds to
the request it should be associated with. This may raise the question: why isn't the AuctionConfig object returned as part of the bid? The
answer is that it's possible to participate in the PAAPI auction without returning a contextual bid.

An example of this can be seen in the OpenX OpenRTB bid adapter [here](https://github.com/prebid/Prebid.js/blob/master/modules/openxOrtbBidAdapter.js#L327).

Other than the addition of the `bidId` field, the AuctionConfig object should adhere to the requirements set forth in PAAPI. The details of creating an   AuctionConfig object are beyond the scope of this document.
