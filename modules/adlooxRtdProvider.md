# Overview

    Module Name: Adloox RTD Provider
    Module Type: RTD Provider
    Maintainer: contact@adloox.com

# Description

RTD provider for adloox.com. Contact contact@adloox.com for information.

This provider fetches segments and populates the [First Party Data](https://docs.prebid.org/features/firstPartyData.html) attributes, some examples of the segments as described by the Adloox 'Google Publisher Tag Targeting Guidelines' and where they are placed are:

 * Page segments are placed into `ortb2.site.ext.data.adloox_rtd`:
     * **`ok`:** boolean (use to capture if our module successfully ran)
 * Device segments are placed into `ortb2.user.ext.data.adloox_rtd`:
     * **`ivt`:** boolean
     * **`ua_old`:** boolean
     * **`ip`:** list of strings describing classification of IP (eg. `rfc-special`, `iab-dc`, ...)
 * AdUnit segments are placed into `AdUnit.ortb2Imp.ext.data.adloox_rtd`:
     * **`{dis,vid,aud}`:** an list of integers describing the likelihood the AdUnit will be visible
     * **`atf`:** an list of integers describing the percentage of pixels visible at auction
         * measured only once at pre-auction
         * usable when the publisher uses the strategy of collapsing ad slots on no-fill
             * using the reverse strategy, growing ad slots on fill, invalidates the measurement the position of all content (including the slots) changes post-auction
             * works best when your page loads your ad slots have their actual size rendered (ie. not zero height)
         * uses the smallest ad unit (above a threshold area of 20x20) supplied by the [publisher to Prebid.js](https://docs.prebid.org/dev-docs/examples/basic-example.html) and measures viewability as if that size to be used
         * when used in cross-origin (unfriendly) IFRAME environments the ad slot is directly measured as is (ignoring publisher provided sizes) due to limitations in using [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)

**N.B.** this provider does not offer or utilise any user orientated data

These segments are also sent to your ad server but are translated using the following rules:

 * prepended the segment name with `adl_`
 * segments are filtered out when their value is either:
     * empty string ("")
     * zero (`0`)
     * boolean `false`
     * empty list/array

For example:

 * `ortb2.site.ext.data.adloox_rtd.ok` is translated to `adl_ok`
 * `ortb2.user.ext.data.adloox_rtd.ivt` is translated to `adl_ivt`
 * `AdUnit.ortb2Imp.ext.data.adloox_rtd.dis` is translated to `adl_dis`

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
            params: {                  // optional, defaults shown
              thresholds: [ 50, 60, 70, 80, 90 ],
              slotinpath: false
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

**N.B.** If you pass `params` to the Adloox Analytics Adapter, `id1` (`AdUnit.code`) and `id2` (`%%gpid%%`) *must* describe a stable identifier otherwise no usable segments will be served and so they *must not* be changed; if `id1` for your inventory could contain a non-stable random number please consult with us before continuing

Though our segment technology is fast (less than 10ms) the time it takes for the users device to connect to our service and fetch the segments may not be. For this reason we recommend setting `auctionDelay` no lower than 100ms and if possible you should explore using user-agent sourced information such as [NetworkInformation.{rtt,downlink,...}](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation) to dynamically tune this for each user.

## Prebid Ad Slot

To create reliable segments, a stable description for slots on your inventory needs to be supplied which is typically solved by using the [Prebid Ad Slot](https://docs.prebid.org/features/pbAdSlot.html).

You may use one of two ways to do achieve this:

 * for display inventory [using GPT](https://developers.google.com/publisher-tag/guides/get-started) you may configure Prebid.js to automatically use the [full ad unit path](https://developers.google.com/publisher-tag/reference#googletag.Slot_getAdUnitPath)
     1. include the [`gptPreAuction` module](https://docs.prebid.org/dev-docs/modules/gpt-pre-auction.html)
     1. wrap both `pbjs.setConfig({...})` and `pbjs.enableAnalytics({...})` with `googletag.cmd.push(function() { ... })`
 * set `gpid` (or `pbadslot`) in the [first party data](https://docs.prebid.org/dev-docs/adunit-reference.html#first-party-data) variable `AdUnit.ortb2Imp.ext.gpid` (or `AdUnit.ortb2Imp.ext.data.pbadslot`) for all your ad units

## Timeouts

It is strongly recommended you increase any [failsafe timeout](https://docs.prebid.org/dev-docs/faq.html#when-starting-out-what-should-my-timeouts-be) you use by at least the value you supply to `auctionDelay` above.

Adloox recommends you use the following (based on [examples provided on the Prebid.js website](https://docs.prebid.org/dev-docs/examples/basic-example.html))

    FAILSAFE_TIMEOUT = AUCTION_DELAY + (3 * PREBID_TIMEOUT)
