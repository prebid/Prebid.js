# Guardian-specific modifications
These are the ways in which the Guardian optimised build differs from the [generic Prebid](https://github.com/prebid/Prebid.js) build:
* Ad server targeting includes a `hb_ttr` parameter, whose value will be one of:
    * the time to respond for the winning bid in ms (ie. time between bid request sent and bid response received)
    * -1 if the auction timed out without a winning bid and still waiting for at least one bid response 
    * otherwise not passed at all
* We have built our own custom [Index Exchange bid adapter](https://github.com/guardian/Prebid.js/blob/guardian-optimised-build/modules/guIndexExchangeBidAdapter.js) 
* The [Sonobi bid adapter](https://github.com/guardian/Prebid.js/blob/guardian-optimised-build/modules/sonobiBidAdapter.js):
    * has an extra request parameter, `gmgt`, holding AppNexus targeting key-values
    * has a customised `pv` parameter, holding the Ophan-generated pageview ID
