---
layout: page
title: Bidder Adaptor
description: Documentation on bidder adaptor
pid: 4
hide: true
---

###Define callBids

Function `callBids(params)` will be called when the impressions come in. `params` will have all the information you need to launch pre-bid requests. In this function, you should define logic to send out bid requests.

{% highlight js %}
function callBids (params) {
	// logic to send out bid requests to the bidder.
}
{% endhighlight %}

####An example of the `params`:
{% highlight js %}
*	params = {
		bids : [ 
			{
				bidder : 'appnexus',
				adUnitCode : 'ad_unit_code',
				sizes : [[300, 250], [300, 600]],
				bidId : {
					key: value,
					key: value
				}
			},
			{
				bidder : 'appnexus',
				adUnitCode : 'ad_unit_code',
				sizes : [[300, 250], [300, 600]],
				bidId : {
					key: value,
					key: value
				}
			}

		]
	}
*/

{% endhighlight %}

###Add bidResponse object
Once the bids come back from the bidder, the adaptor should send in the bid responses so they can be passed to the publisher page. 

`addBidResponse(adUnitCode, bidResponse)`

For examples on what other bidders are passing in `bidResponse`, check out our [bidder doc](bidders.html). Remember to pass in `bidderCode` on `bidResponse`.

###Notify all bids are submitted

Prebid.js would like to be notified when all bid responses from the bidder have been submitted. Prebid.js will inform the publisher page when all bidders' bid responses have been submitted. The publisher page can skip the ad server waiting and send out impressions to their ad server.

`bidsAreAllIn(bidderCode)`
