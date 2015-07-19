---
layout: default
title: Publisher API
description: API for publishers
isHome: false
---

<div class="bs-docs-section" markdown="1">

#Summary
> Prebid.js helps you send out pre-bid requests asynchronously, while watching out the timeout for ya.

![Prebid Diagram Image]({{ site.github.url }}/assets/images/prebid-diagram.png)

1. **Register bidder tag Ids:** 

	Define a mapping of the bidders’ tag Ids to your ad units.

2. **Ad server wait for bids:** 

	Define the timeout so your ad server would wait for a few hundred milliseconds and the bidders can respond with bids.

3. **Set targeting for bids:** 

	Set bids’ CPM for your ad units’ targeting, then send the impressions to your ad server.

<br> 

###Basic Example
Here’s a basic example for Amazon and AppNexus bidding into a DFP ad unit:

{% highlight js %}
var pbjs = pbjs || {};

// 1. Register bidder tag Ids
pbjs.adUnits = [{
    code: "/1996833/slot-1",
    sizes: [[300, 250], [728, 90]],
    bids: [{
    	bidder: "amazon",
    	bidId: { siteId: "8765" }
    }, {
        bidder: "appnexus",
        bidId: { tagId: "234235" }
    }]
}];

// 2. Ad server wait for bids
PREBID_TIMEOUT = 300;
function initAdserver() {
    (function() {
        // To load GPT Library Async
    })();
    pbjs.initAdserverSet = true;
};
setTimeout(initAdserver, PREBID_TIMEOUT);

// 3. Set targeting for bids
googletag.cmd.push(function() {
    var slot = googletag.defineSlot('/1996833/slot-1', [[300, 250], [728, 90]]);
    if (pbjs.libLoaded) {
        pbjs.setTargetingForGPTAsync(slot, '/1996833/slot-1');
    }
});

{% endhighlight %}

</div>

<div class="bs-docs-section" markdown="1">

#1. Register bidder tag Ids

The code below registers the AppNexus bids for your ad units. Once the prebid.js library loads, it'll immediately read the pbjs.adunits object to send out bid requests.

###Example

{% highlight js %}
var pbjs = pbjs || {};
pbjs.adUnits = [
    {
        code: "/1996833/slot-1",
        sizes: [[300, 250], [728, 90]],
        bids: [{
                    bidder: "appnexus",
                    bidId: {
                        tagId: "234235"
                    }
                }]
        }  
    },{
        code: "/1996833/slot-2",
        sizes: [[468, 60]],
        bids: [{
                    bidder: "appnexus",
                    bidId: {
                        memberId: "343"
                        invCode: "PBJS123"
                    }
                }]
        }
    }
];
{% endhighlight %}

###Object Adunit

{: .table .table-bordered .table-striped}
|	Name |	Scope 	|	 Type | Description |
| :----  |:--------:| -------:| -----------: |
|	code |	required |	string | A unique identifier of an ad unit. This identifier will later be used to set query string targeting on the ad unit. |
| sizes |	required |	array |	All the sizes that this ad unit can accept. |
| bids |	required |	array |	An array of bid objects. |

###Object bid

{: .table .table-bordered .table-striped}
|	Name |	Scope 	|	 Type | Description |
| :----  |:--------:| -------:| -----------: |
| bidder |	required |	string |	The bidder code, in this case "appnexus". |
| bidId |	required |	object |	The bidder's preferred way of identifying a bid request. For example, AppNexus has two ways to identify a bid: through a tagId or a tuple of memberId and invCode (inventory code). |



###LOAD THE PRE-BID JS LIBRARY

This code pulls down the prebid.js library asynchronously from the appropriate CDN and inserts it into the page.

{% highlight js %}
(function() {
    var pbjsEl = document.createElement("script"); pbjsEl.type = "text/javascript";
    pbjsEl.async = true; var isHttps = 'https:' === document.location.protocol;
    pbjsEl.src = (isHttps ? "https://a248.e.akamai.net/appnexus.download.akamai.com/89298/adnexus-prod/tag" : "http://cdn.adnxs.com/tag") + "/prebid.js";
    var pbjsTargetEl = document.getElementsByTagName("head")[0];
    pbjsTargetEl.insertBefore(pbjsEl, pbjsTargetEl.firstChild);
})();
{% endhighlight %}

</div>




<div class="bs-docs-section" markdown="1">
#2. Ad server wait for bids


</div>
