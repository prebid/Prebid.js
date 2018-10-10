# Guardian-specific modifications
These are the ways in which the Guardian optimised build differs from the [generic Prebid](https://github.com/prebid/Prebid.js) build:
## General
* Ad server targeting includes a `hb_ttr` parameter, whose value will be one of:
    * the time to respond for the winning bid in ms (ie. time between bid request sent and bid response received)
    * -1 if the auction timed out without a winning bid and still waiting for at least one bid response
    * otherwise not passed at all
## Bid adapters
* The [Sonobi adapter](https://github.com/guardian/Prebid.js/blob/master/modules/sonobiBidAdapter.js):
    * has an extra request parameter, `gmgt`, holding AppNexus targeting key-values
    * has a customised `pv` parameter, holding the Ophan-generated pageview ID
* The [AppNexus adapter](https://github.com/guardian/Prebid.js/blob/master/modules/appnexusBidAdapter.js) has an alias `xhb` for Xaxis, an alias `and` for AppNexus direct and an alias `pangaea` for Pangaea.
* The [OpenX adapter](https://github.com/guardian/Prebid.js/blob/master/modules/openxBidAdapter.js) has an alias `oxd` for OpenX direct, instead of via server-side header bidding.
## Analytics adapters
* We have built two analytics adapters:
    * an [adapter](https://github.com/guardian/Prebid.js/blob/master/modules/guAnalyticsAdapter.js) to send analytics to the data lake
    * a simple console-logging [adapter](https://github.com/guardian/Prebid.js/blob/master/modules/consoleLoggingAnalyticsAdapter.js)
