# Overview

Module Name: bidViewability

Purpose: Track when a bid is viewable (and also ready for billing)

Maintainer: harshad.mane@pubmatic.com

# Description
- This module, when included, will trigger a BID_VIEWABLE event which can be consumed by Analytics adapters, bidders will need to implement the `onBidViewable` method to capture this event
- Bidders can check if this module is part of the final build and whether it is enabled or not by accessing ```pbjs.getConfig('bidViewability')```
- GPT API is used to find when a bid is viewable, https://developers.google.com/publisher-tag/reference#googletag.events.impressionviewableevent . This event is fired when an impression becomes viewable, according to the Active View criteria.
Refer: https://support.google.com/admanager/answer/4524488
- This module does not work with any adserver's other than GAM with GPT integration
- Logic used to find a matching pbjs-bid for a GPT slot is ``` (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode) ``` this logic can be changed by using param ```customMatchFunction```
- When a rendered PBJS bid is viewable the module will trigger a BID_VIEWABLE event, which can be consumed by bidders and analytics adapters
- If the viewable bid contains a ```vurls``` param containing URL's and the Bid Viewability module is configured with ``` firePixels: true ``` then the URLs mentioned in bid.vurls will be called. Please note that GDPR and USP related parameters will be added to the given URLs
- This module is also compatible with Prebid core's billing deferral logic, this means that bids linked to an ad unit marked with `deferBilling: true` will trigger a bid adapter's `onBidBillable` function (if present) indicating an ad slot was viewed and also billing ready (if it were deferred).

# Params
- enabled [required] [type: boolean, default: false], when set to true, the module will emit BID_VIEWABLE when applicable
- firePixels [optional] [type: boolean], when set to true, will fire the urls mentioned in bid.vurls which should be array of urls
- customMatchFunction [optional] [type: function(bid, slot)], when passed this function will be used to `find` the matching winning bid for the GPT slot. Default value is ` (bid, slot) => (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode) `

# Example of consuming BID_VIEWABLE event
```
	pbjs.onEvent('bidViewable', function(bid){
		console.log('got bid details in bidViewable event', bid);
	});

```

# Example of using config
```
	pbjs.setConfig({
        bidViewability: {
            enabled: true,
            firePixels: true,
            customMatchFunction: function(bid, slot){
                console.log('using custom match function....');
                return bid.adUnitCode === slot.getAdUnitPath();
            }
        }
    });
```

# Please Note:
- This module doesn't seem to work with Instream Video, https://docs.prebid.org/dev-docs/examples/instream-banner-mix.html as GPT's impressionViewable event is not triggered for instream-video-creative
- Works with Banner, Outsteam and Native creatives

