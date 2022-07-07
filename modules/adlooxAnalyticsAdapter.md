# Overview

    Module Name: Adloox Analytics Adapter
    Module Type: Analytics Adapter
    Maintainer: contact@adloox.com

# Description

Analytics adapter for adloox.com. Contact contact@adloox.com for information.

This module can be used to track:

 * Display
 * Native
 * Video (see below for further instructions)

The adapter adds an HTML `<script>` tag to load Adloox's post-buy verification JavaScript (`https://j.adlooxtracking.com/ads/js/tfav_adl_X.js` at ~25kiB gzipped) when the [`bidWon` event](https://docs.prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.onEvent) is fired for each ad slot.

## Video

When tracking video you have two options:

 * [Instream Video Ads Tracking](https://docs.prebid.org/dev-docs/modules/instreamTracking.html)
     * only suitable for instream video bids
     * VAST events are not collected by Adloox
     * viewability metrics are *not* [MRC accredited](http://mediaratingcouncil.org/)
 * [Adloox Ad Server Video](./adlooxAdServerVideo.md)
     * works by by wrapping the Ad Server VAST URL
     * viewability metrics are MRC accredited for [IAB](https://www.iab.com/) [VPAID](https://iabtechlab.com/standards/video-player-ad-interface-definition-vpaid/) and [OM SDK](https://iabtechlab.com/standards/open-measurement-sdk/) enable inventory
     * compatible for use alongside the Instream Video Ads Tracking module though not required in order to function
     * slightly more complicated though straight forward to implement

## Example

To view an [example of an Adloox integration](../integrationExamples/gpt/adloox.html):

    gulp serve --nolint --notest --modules=gptPreAuction,categoryTranslation,dfpAdServerVideo,rtdModule,instreamTracking,rubiconBidAdapter,spotxBidAdapter,adlooxAnalyticsAdapter,adlooxAdServerVideo,adlooxRtdProvider

**N.B.** `categoryTranslation` is required by `dfpAdServerVideo` that otherwise causes a JavaScript console warning

Now point your browser at: http://localhost:9999/integrationExamples/gpt/adloox.html?pbjs_debug=true

### Public Example

The example is published publically at: https://storage.googleapis.com/adloox-ads-js-test/prebid.html?pbjs_debug=true

**N.B.** this will show a [CORS error](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors) for the request `https://p.adlooxtracking.com/q?...` that is safe to ignore on the public example page; it is related to the [RTD integration](./adlooxRtdProvider.md) which requires pre-registration of your sites

It is recommended you use [Google Chrome's 'Local Overrides' located in the Developer Tools panel](https://www.trysmudford.com/blog/chrome-local-overrides/) to explore the example without the inconvience of having to run your own web server.

#### Pre-built `prebid.js`

If you are unable to build code on your system, then you may wish to experiment with a full (all modules enabled) version of the `prebid.js` script with the above three Adloox modules included published at:

    https://storage.googleapis.com/adloox-ads-js-test/prebid.js

You should be able to use this during the QA process of your own internal testing sites.

**N.B.** do *not* use this link or the code at it in production

### Testing

The main Prebid.js documentation is a bit opaque on this but you can use the following to test only Adloox's modules:

    gulp lint
    gulp test-coverage --file 'test/spec/modules/adloox{AnalyticsAdapter,AdServerVideo,RtdProvider}_spec.js'
    gulp view-coverage

# Integration

    pbjs.enableAnalytics({
      provider: 'adloox',
      options: {
        //toselector: function(bid) { return '#' + bid.adUnitCode },
        client: 'adlooxtest',
        clientid: 127,
        platformid: 0,
        tagid: 0
      }
    });

The options `client`, `clientid`, `platformid` and `tagid` are supplied by Adloox to you and *must* be provided in the configuration.

### `toselector` Option

For non-GPT integrations, the module expects the value of `adUnitCode` from the [bid object](https://docs.prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.getBidResponses) to match the div ID of the unit to facilitate measurements made against it.

**N.B.** for GPT integrations the div ID is automatically discovered and you should *not* use this option

When not true for your environment (you will see a warning stating 'unable to find ad unit code') you should provide a function through the option `toselector` that when passed the bid object it returns the [selector](https://www.javascripttutorial.net/javascript-dom/javascript-queryselector/) for the slot; internally the module will pass this value to [`document.querySelector()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) to obtain the actual slot.

By example, the default handler used for `options.toselector` when not supplied is shown above though internally some [basic escaping](https://mathiasbynens.be/notes/css-escapes) is applied but omitted here for reasons of clarity; your own handler will need to provide its own escaping where necessary.

## Parameters

The Adloox 'Impression JavaScript Tag Integration Guidelines' provide details on parameters (for the `params` block) you can pass that configure the Adloox verification JavaScript for your inventory.

For example, you have a number of reporting breakdown slots available in the form of `id{1->10}` that are configurable with:

    pbjs.enableAnalytics({
      provider: 'adloox',
      options: {
        client: 'adlooxtest',
        clientid: 127,
        platformid: 0,
        tagid: 0,
        params: {
          id1: function(b) { return b.adUnitCode },  // do not change when using the Adloox RTD Provider
          id2: '%%gpid%%',                           // do not change when using the Adloox RTD Provider
          id3: function(b) { return b.bidder },
          id4: function(b) { return b.adId },
          id5: function(b) { return b.dealId },
          id6: function(b) { return b.creativeId },
          id7: function(b) { return b.size },
          id11: '$ADLOOX_WEBSITE'                    // do not change, Adloox internal use only
        }
      }
    });

**N.B.** `params` shown above is the default and may be omitted altogether if you wish to make no changes

**N.B.** values that return `false`, `null`, or `undefined` are not sent whilst values of `true` return just the key

### Macros

The following macros are available

 * **`%%gpid%%` (alias `%%pbadslot%%`**): [Prebid Ad Slot](https://docs.prebid.org/features/pbAdSlot.html) returns [`AdUnit.code`](https://docs.prebid.org/features/pbAdSlot.html) if set otherwise returns [`AdUnit.code`](https://docs.prebid.org/dev-docs/adunit-reference.html#adunit)
     * it is recommended you read the [Prebid Ad Slot section in the Adloox RTD Provider documentation](./adlooxRtdProvider.md#prebid-ad-slot)
 * **`%%pageurl%%`**: [`canonicalUrl`](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#setConfig-Page-URL) from the [`refererInfo` object](https://docs.prebid.org/dev-docs/bidder-adaptor.html#referrers) otherwise uses `referer`

### Functions

You may also supply a function to dynamically generate the value of the parameter from the bid response; the function is passed a single argument that corresponds to the [BidResponse](https://docs.prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.getBidResponses) object seen at the `bidWon` event.

You can look to the default `params` section above for examples of how to use this.

If your function throws an exception, it will be caught and the value set (and observable in Adloox's reporting) to:

    ERROR: <Error>

Where `<Error>` is the value from [`Error.prototype.message`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message).

### Multi-value

Some parameters, such as `px_imp` and `bridge`, can take multiple values and can be described by providing an array:

    params: {
      ...
      px_imp: [
        'https://example.com/some/third/party/pixel.gif',
        'https://example.net/other/third/party/pixel.png',
        function(b){ return 'https://example.org/' + b.bidder + '/pixel.jpg' }
      ],
      ...
    }
