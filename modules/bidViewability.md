# Overview

Module Name: bidViewability

Purpose: Track when a bid is viewable

Maintainer: harshad.mane@pubmatic.com

# Description
- This module, when included, will trigger a BID_VIEWABLE event which can be consumed by Bidders and Analytics adapters
- GPT API is used to find when a bid is viewable, https://developers.google.com/publisher-tag/reference#googletag.events.impressionviewableevent . This event is fired when an impression becomes viewable, according to the Active View criteria.
Refer: https://support.google.com/admanager/answer/4524488

- The module does not work with adserver other than GAM with GPT integration
- Logic used to find a matching pbjs-bid for a GPT slot is ``` (slot.getAdUnitPath() === bid.adUnitCode || slot.getSlotElementId() === bid.adUnitCode) ``` this logic can be changed by using param ```customMatchFunction```
- When a rendered PBJS bid is viewable the module will trigger BID_VIEWABLE event, which can be consumed by bidders and analytics adapters
- For the viewable bid if ```bid.vurls type array``` param is and module config ``` firePixels: true ``` is set then the URLs mentioned in bid.vurls will be executed. Please note that GDPR and USP related parameters will be added to the given URLs, here we have assumed that URLs will always have "?" symbol included.

# Params
- firePixels [optional] [type: boolean], when set to true, will fire the urls mentioned in bid.vurls which should be array of urls
- customMatchFunction [optional] [type: function(bid, slot)], when passed 

As both params are optional, you do not need to set config if you do not want to set value for any param

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
            firePixels: true,
            customMatchFunction: function(bid, slot){
                console.log('using custom match function....');
                return bid.adUnitCode === slot.getAdUnitPath();
            }
        }
    });
```

# Please Note:
- Doesn't seems to work with Instream Video, https://docs.prebid.org/dev-docs/examples/instream-banner-mix.html , GPT's impressionViewable event is not triggered for instream-video-creative
- Works with Banner, Outsteam, Native creatives

