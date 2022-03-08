# Overview

    Module Name: Adloox Ad Server Video
    Module Type: Ad Server Video
    Maintainer: contact@adloox.com

# Description

Ad Server Video for adloox.com. Contact contact@adloox.com for information.

This module pairs with the [Adloox Analytics Adapter](./adlooxAnalyticsAdapter.md) to provide video tracking and measurement.

Prebid.js does not support [`bidWon` events for video](https://github.com/prebid/prebid.github.io/issues/1320) without the [Instream Video Ads Tracking](https://docs.prebid.org/dev-docs/modules/instreamTracking.html) module that has the limitations:

 * works only with instream video
 * viewability metrics are *not* [MRC accredited](http://mediaratingcouncil.org/)

This module has two modes of operation configurable with the `wrap` parameter below:

 * **`true` [default]:**
     * provides MRC accredited viewability measurement of your [IAB](https://www.iab.com/) [VPAID](https://iabtechlab.com/standards/video-player-ad-interface-definition-vpaid/) and [OM SDK](https://iabtechlab.com/standards/open-measurement-sdk/) enabled inventory
     * VAST tracking is collected by Adloox
     * wraps the winning bid VAST URL with the Adloox VAST/VPAID wrapper (`https://j.adlooxtracking.com/ads/vast/tag.php?...`)
 * **`false`:**
     * sends a `bidWon` event *only* to the Adloox Analytics Adapter
     * inventory is measured
     * viewability metrics are *not* MRC accredited.
     * VAST tracking is *not* collected by Adloox

**N.B.** this module is compatible for use alongside the Instream Video Ads Tracking module though not required in order to function

## Example

To view an example of an Adloox integration look at the example provided in the [Adloox Analytics Adapter documentation](./adlooxAnalyticsAdapter.md#example).

# Integration

To use this, you *must* also integrate the [Adloox Analytics Adapter](./adlooxAnalyticsAdapter.md) (and optionally the Instream Video Ads Tracking module) as shown below:

    function sendAdserverRequest(bids, timedOut, auctionId) {
      if (pbjs.initAdserverSet) return;
      pbjs.initAdserverSet = true;

      // handle display tags as usual
      googletag.cmd.push(function() {
        pbjs.setTargetingForGPTAsync && pbjs.setTargetingForGPTAsync(adUnits);
        googletag.pubads().refresh();
      });

      // handle the bids on the video adUnit
      var videoBids = bids[videoAdUnit.code];
      if (videoBids) {
        var videoUrl = pbjs.adServers.dfp.buildVideoUrl({
          adUnit: videoAdUnit,
          params: {
            iu: '/19968336/prebid_cache_video_adunit',
            cust_params: {
              section: 'blog',
              anotherKey: 'anotherValue'
            },
            output: 'vast'
          }
        });
        pbjs.adServers.adloox.buildVideoUrl({
          adUnit: videoAdUnit,
          url: videoUrl
        }, invokeVideoPlayer);
      }
    }

The helper function takes the form:

    pbjs.adServers.adloox.buildVideoUrl(options, callback)

Where:

 * **`options`:** configuration object:
     * **`adUnit`:** ad unit that is being filled
     * **`bid` [optional]:** if you override the hardcoded `pbjs.adServers.dfp.buildVideoUrl(...)` logic that picks the first bid you *must* pass in the `bid` object you select
     * **`url`:** VAST tag URL, typically the value returned by `pbjs.adServers.dfp.buildVideoUrl(...)`
     * **`wrap`:**
         * **`true` [default]:** VAST tag is be converted to an Adloox VAST wrapped tag
         * **`false`:** VAST tag URL is returned as is
     * **`blob`:**
         * **`true` [default]:** [Blob URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL) is returned so that the VAST tag is only fetched once
             * only has an affect when `wrap` is set to `true`
         * **`false`:** VAST tag may be fetched twice depending on your Ad Server and video player configuration
             * use when the ad is served into a cross-origin (non-friendly) IFRAME
             * use if during QAing you discover your video player does not supports Blob URLs; widely supported (including JW Player) so contact your player vendor to resolve this where possible for the best user and device experience
 * **`callback`:** function you use to pass the VAST tag URL to your video player

**N.B.** call `pbjs.adServers.adloox.buildVideoUrl(...)` as close as possible to starting the ad to reduce impression discrepancies
