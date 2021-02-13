# Overview

    Module Name: Adloox RTD Provider
    Module Type: RTD Provider
    Maintainer: technique@adloox.com

# Description

RTD provider for adloox.com. Contact adops@adloox.com for information.

In addition to populating the ad server key-value targeting, fetched segments (prefixed with `adl_...`) will also populate [First Party Data](https://docs.prebid.org/features/firstPartyData.html), some examples of the segments as described by the Adloox 'Google Publisher Tag Targeting Guidelines' and where they are placed are:

 * Page/Device segments are placed into `fpd.context.data`, for example:
     * **`adl_ivt`:** `fpd.context.data.adl_ivt` is a boolean
     * **`adl_ua_old`:** `fpd.context.data.ua_old` is a boolean
     * **`adl_ip`:** `fpd.context.data.adl_ip` is an array of strings
 * AdUnit segments are placed into `AdUnit.fpd.context.data`, for example:
     * **`adl_{dis,vid,aud}`:** `AdUnit.fpd.context.data.adl_{dis,vid,aud}` is an array of integers
     * **`adl_atf`:** `AdUnit.fpd.context.data.adl_atf` is a boolean (or `-1` on no measure)

**N.B.** this provider does not offer or utilise any user orientated data

This module adds an HTML `<script>` tag to the page to fetch our JavaScript from `https://p.adlooxtracking.com/gpt/a.js` (~3kiB gzipped) to support this integration.

## Example

To view an example of an Adloox integration look at the example provided in the [Adloox Analytics Adapter documentation](./adlooxAnalyticsAdapter.md#example).

# Integration

To use this, you *must* also integrate the [Adloox Analytics Adapter](./adlooxAnalyticsAdapter.md) as shown below:

    pbjs.setConfig({
      ...

      realTimeData: {
        auctionDelay: 100,             // see below for guidance
        dataProviders: [
          {
            name: 'adloox',
            params: {
              params: {                // optional
                thresholds: [ 50, 80 ]
              }
            }
          }
        ]
      },

      ...
    });
    pbjs.enableAnalytics({
      provider: 'adloox',
      options: {
        client: 'adlooxtest',
        clientid: 127,
        platformid: 0,
        tagid: 0
      }
    });

You may optionally pass a subsection `params` in the `params` block to the Adloox RTD Provider, these will be passed through to the segment handler as is and as described by the integration guidelines.

**N.B.** If you pass `params` to the Adloox Analytics Adapter, `id1` (`AdUnit.code`) and `id2` (`%%pbAdSlot%%`) *must* describe a stable identifier otherwise no usable segments will be served and so they *must not* be changed; if `id1` for your inventory could contain a non-stable random number please consult with us before continuing

Though our segment technology is fast (less than 10ms) the time it takes for the users device to connect to our service and fetch the segments may not be. For this reason we recommend setting `auctionDelay` no lower than 100ms and if possible you should explore using user-agent sourced information such as [NetworkInformation.{rtt,downlink,...}](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation) to dynamically tune this for each user.

## Prebid Ad Slot

To create reliable segments, a stable description for slots on your inventory needs to be supplied which is typically solved by using the [Prebid Ad Slot](https://docs.prebid.org/features/pbAdSlot.html).

You may use one of two ways to do achieve this:

 * for display inventory [using GPT](https://developers.google.com/publisher-tag/guides/get-started) you may configure Prebid.js to automatically use the [full ad unit path](https://developers.google.com/publisher-tag/reference#googletag.Slot_getAdUnitPath)
     1. include the [`gptPreAuction` module](https://docs.prebid.org/dev-docs/modules/gpt-pre-auction.html)
     1. wrap both `pbjs.setConfig({...})` and `pbjs.enableAnalytics({...})` with `googletag.cmd.push(function() { ... })`
 * set `pbAdSlot` in the [first party data](https://docs.prebid.org/dev-docs/adunit-reference.html#first-party-data) variable `AdUnit.fpd.context.pbAdSlot` for all your ad units

## Timeouts

It is strongly recommended you increase any [failsafe timeout](https://docs.prebid.org/dev-docs/faq.html#when-starting-out-what-should-my-timeouts-be) you use by at least the value you supply to `auctionDelay` above.

Adloox recommends you use the following (based on [examples provided on the Prebid.js website](https://docs.prebid.org/dev-docs/examples/basic-example.html))

    FAILSAFE_TIMEOUT = AUCTION_DELAY + (3 * PREBID_TIMEOUT)
