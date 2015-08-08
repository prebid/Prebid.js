---
layout: page
title: Publisher API
head_title: Publisher API for Header Bidding
description: API for publishers
pid: 1
---

<div class="bs-docs-section" markdown="1">

#Summary
> Prebid.js sends bid requests to partners asynchronously and manages timeouts to keep page load times fast.

![Prebid Diagram Image]({{ site.github.url }}/assets/images/prebid-diagram.png)

1. **Register bidder tag Ids:** 

	Define a mapping of the bidders’ tag Ids to your ad units.

2. **Ad server waits for bids:** 

	Define the timeout so your ad server would wait for a few hundred milliseconds and the bidders can respond with bids.

3. **Set targeting for bids:** 

	Set bids’ CPM for your ad units’ targeting, then send the impressions to your ad server.

</div>

<div class="bs-docs-section" markdown="1">

#Register bidders


The code below registers the bidder tags for your ad units. Once the prebid.js library loads, it reads the pbjs.adUnits object and sends out bid requests. Check out the complete [reference on bidders](bidders.html).

<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#bidder-register-dfp" role="tab" data-toggle="tab">DFP</a></li>
        <li role="presentation"><a href="#bidder-register-custom" role="tab" data-toggle="tab">Custom Ad Server</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="bidder-register-dfp" markdown="1">

`code` should be your GPT slot's ad unit path. If they don't match, prebid.js would **not** be able to set targeting correctly in section [Set Targeting]().


</div>

<div role="tabpanel" class="tab-pane" id="bidder-register-custom" markdown="1">

`code` should be a unique identifier that can be used to map to an ad unit.

</div>

</div>

</div>

###Example

{% highlight js %}
var pbjs = pbjs || {};
pbjs.adUnits = [
    {
        code: "/1996833/slot-1",
        sizes: [[300, 250], [728, 90]],
        bids: [{
                    bidder: "amazon",
                    params: {
                        aaxId: "8765"
                    }
                },{
                    bidder: "appnexus",
                    params: {
                        tagId: "234235"
                    }
                }]
        }
    },{
        code: "/1996833/slot-2",
        sizes: [[468, 60]],
        bids: [{
                    bidder: "rubicon",
                    params: {
                        account: "4934",
                        site: "13945",
                        rp_zonesize: "23948-15"
                    }
                },{
                    bidder: "appnexus",
                    params: {
                        tagId: "827326"
                    }
                }]
        }
    }
];
{% endhighlight %}

###AdUnit

{: .table .table-bordered .table-striped }
|	Name |	Scope 	|	 Type | Description |
| :----  |:--------| :-------| :----------- |
|	`code` |	required |	string | A unique identifier of an ad unit. This identifier will later be used to set query string targeting on the ad unit. |
| `sizes` |	required |	array |	All the sizes that this ad unit can accept. |
| `bids` |	required |	array |	An array of bid objects. Find the [complete reference here](bidders.html). |

###Bid

{: .table .table-bordered .table-striped }
|	Name |	Scope 	|	 Type | Description |
| :----  |:--------| :-------| :----------- |
| `bidder` |	required |	string |	The bidder code. Find the [complete list here](bidders.html). |
| `params` |	required |	object |	The bidder's preferred way of identifying a bid request. Find the [complete reference here](bidders.html). |

</div>

<a name="adserver-targeting"></a>

<div class="bs-docs-section" markdown="1">

#Configure Ad Server Targeting

Bidders all have different recommended ad server line item targeting and creative setup. To remove the headache for you, Prebid.js has a default recommended query string targeting setting for all bidders.



###Example


The below code snippet is the **default** setting for ad server targeting. For each bidder's bid, Prebid.js will set the below 4 keys (`hb_bidder`, `hb_adid`, `hb_pb`, `hb_size`) with their corresponding values. The key value pair targeting is applied to the bid's corresponding ad unit. Your ad ops team will have the ad server's line items target the 4 keys.

If you'd like to customize the key value pairs, you can overwrite the settings as the below example shows. **Note** that once you updated the settings, let your ad ops team know about the change, so they can update the line item targeting accordingly.

There's no need to include the following code if you choose to use the default setting.

{% highlight js %}

pbjs.bidderSettings = {
    standard: {
        adserverTargeting: [{
            key: "hb_bidder",
            val: function(bidResponse) {
                return bidResponse.bidder;
            }
        }, {
            key: "hb_adid",
            val: function(bidResponse) {
                return bidResponse.adId;
            }
        }, {
            key: "hb_pb",
            val: function(bidResponse) {
                return bidResponse.pbMg;
            }
        }, {
            key: "hb_size",
            val: function(bidResponse) {
                return bidResponse.size;
            }
        }]
    }
}

{% endhighlight %}


{: .table .table-bordered .table-striped }
| Function Name | Description |
| :--- | :---- |
| function(bidResponse) | The function returns a query string targeting value. It is used in pair with the adserverTargeting's `key` param. The key value pair together will be sent for targeting on the ad server's ad unit impression. `bidResponse` is bidder specific and you can find what're available in the [documentation here](bidders.html). |


###Available bidResponse values

{: .table .table-bordered .table-striped }
|   Name |   Type | Description | Example
| :----  |:--------| :-------| :-------|
| `bidder` | String | The bidder code. Used by ad server's line items to identify bidders | `rubicon` |
| `adId` | String |  The unique identifier of a bid creative. It's used by the line item's creative as in [this example](adops.html#creative-setup). | `123` |
| `pbLg` | String | The low granularity price bucket at 0.50 increment, capped at $5, floored to 2 decimal places. (0.50, 1.00, 1.50, ..., 5.00) | `1.50` |
| `pbMg` | String | The medium granularity price bucket at 0.10 increment, capped at $20, floored to 2 decimal places. (0.10, 0.20, ..., 19.90, 20.00) | `1.60` |
| `pbHg` | String | The high granularity price bucket at 0.01 increment, capped at $20, floored to 2 decimal places. (0.01, 0.02, ..., 19.99, 20.00) | `1.61` |
| `size` | String | The size of the bid creative. Concatenation of width and height by 'x'. | `300x250` |
| `cpm` | float | The exact bid price from the bidder | 1.59 |

<a name="bidder-customization"></a>

###Bidder Level Customization (Optional)

If you'd like even more customization (down to the bidder level), prebid.js also provides the API to do so. Click on Explore more for the details:

<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
<div class="panel panel-default">
<div class="panel-heading" role="tab" id="headingOne">
<h4 class="panel-title">
<a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
    <i class="glyphicon glyphicon-menu-right"></i> Explore more
</a>
</h4>
</div>
<div id="collapseOne" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">
<div class="panel-body" markdown="1">



If you'd like more customization (down to the bidder level), prebid.js also provides the API to do so. 
Let’s say you still prefer to have a separate set of line items for a bidder. You can overwrite the bidder settings as the below example, which overwrites the default AppNexus query string targeting. 

**Note that the line item setup has to match the targeting change**.


{% highlight js %}
pbjs.bidderSettings = {
    appnexus: adserverTargeting: [
        {
            key: "apn_pbMg",
            val: function(bidResponse) {
                return bidResponse.pbMg;
            }
        }, {
            key: "apn_adId",
            val: function(bidResponse) {
                return bidResponse.adId;
            }
        }
    ]
}
{% endhighlight %}


The bidder setting for AppNexus is saying: send 2 pairs of key value string targeting for every AppNexus bid and for every ad unit. The 1st pair would be `apn_pbMg` => the value of `bidResponse.pbMg`. The 2nd pair would be `apn_adId` => the value of `bidResponse.adId`. You can find the documentation of bidResponse object [here](bidders.html).


</div>
</div>
</div>
</div>


</div>

<div class="bs-docs-section" markdown="1">

#Load the Prebid.js library

This code pulls down the prebid.js library asynchronously from the appropriate CDN and inserts it into the page.

{% highlight js %}
(function() {
    var pbjsEl = document.createElement("script"); pbjsEl.type = "text/javascript";
    pbjsEl.async = true; var isHttps = 'https:' === document.location.protocol;
    pbjsEl.src = (isHttps ? "https://" : "http://") + "cdn.site.com/prebid.js";
    var pbjsTargetEl = document.getElementsByTagName("head")[0];
    pbjsTargetEl.insertBefore(pbjsEl, pbjsTargetEl.firstChild);
})();
{% endhighlight %}

Note that immediately after the library is loaded, prebid.js will send pre-bid requests asynchronously to all bidders you've specified earlier.

</div>





<div class="bs-docs-section" markdown="1">
#Ad server timeout



<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#timeout-dfp" role="tab" data-toggle="tab">DFP</a></li>
        <li role="presentation"><a href="#timeout-custom" role="tab" data-toggle="tab">Custom Ad Server</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="timeout-dfp" markdown="1">



One challenge we've heard about from publishers we work with is how to delay GPT for a certain amount of time so that pre-bid bidders have a chance to respond. In this section we'll describe what we believe is the easiest way to delay GPT while setting a timeout. Note that delaying GPT using this technique is strictly optional.

####How does it work?

The below code sample tells the page to wait for the amount of time specified in the `PREBID_TIMEOUT` variable before loading the GPT library. This gives pre-bid bidders that amount of time to respond.

####Why wrap the GPT library instead of the `.display()` calls?

Because GPT sends out all of the the impressions at the first `googletag.display()` function call, wrapping every single `.display()` calls in a `setTimeout` function is unrealistic. Instead, the easiest way we have found in working with publishers is to wrap the GPT library loading call in the `setTimeout` function. This way, your page's existing GPT implementation is left intact. GPT will only send out the impressions after the library is loaded; therefore your pre-bid bidders will have the amount of time specified `PREBID_TIMEOUT` in which to respond.

{% highlight js %}

PREBID_TIMEOUT = 300;
function initAdserver() {
    (function() {
        var gads = document.createElement('script');
        gads.async = true;
        gads.type = 'text/javascript';
        var useSSL = 'https:' == document.location.protocol;
        gads.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
        var node = document.getElementsByTagName('script')[0];
        node.parentNode.insertBefore(gads, node);
    })();
    pbjs.initAdserverSet = true;
};
setTimeout(initAdserver, PREBID_TIMEOUT);

{% endhighlight %}


</div>

<div role="tabpanel" class="tab-pane" id="timeout-custom" markdown="1">



You've probably already configured your custom ad server to wait for a certain amount of time before sending out the impressions. That amount of time is given to your pre-bid bidders to respond.

Note that `pbjs.getAdserverTargetingParamsForPlacement(code)` will only return targeting parameters after a few hundred milliseconds (the time it takes AppNexus to respond with bids). Make sure to wrap the call to set up targeting parameters with the `pbjs.libLoaded` condition, in case the Prebid.js library hasn't been loaded yet.

{% highlight js %}

PB_PAGE_TIMEOUT = 300;
function initAdserver() {
    pbjs.initAdserverSet = true;
    // Step 1: Set key value targeting on the placements
    if (pbjs.libLoaded) {
        // For each of your placement, get and set targeting params
        var targetingParams = pbjs.getAdserverTargetingParamsForAdUnit(code);
    }
    // Step 2: Trigger the page to send the impressions to your ad server.
};
setTimeout(initAdserver, PB_PAGE_TIMEOUT);

{% endhighlight %}

For more documentation on getting the targeting parameters, check out the next section.

</div>

</div>

</div>




</div>


<div class="bs-docs-section" markdown="1">
#Set key-value targeting



<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#targeting-dfp" role="tab" data-toggle="tab">DFP</a></li>
        <li role="presentation"><a href="#targeting-custom" role="tab" data-toggle="tab">Custom Ad Server</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="targeting-dfp" markdown="1">


`pbjs.setTargetingForGPTAsync` will find all the ad slots defined in the page, and call GPT's set targeting function for query string targeting. The logic for coming up with key value pairs can be found in the section [Configure AdServer Targeting](#adserver-targeting).

Prebid.js automatically clears the pre-bid related targeting defined in [Configure AdServer Targeting](#adserver-targeting) before it sets targeting.

It's important to wrap `pbjs.setTargetingForGPTAsync` with the `pbjs.libLoaded` condition, because there's no guarantee that the Prebid.js library has been loaded at this point in the script's execution. You don't have to wrap it with googletag.cmd.push() because the function already handled that for you.

Note that the below function has to be called after **all your GPT slots have been defined**.

{% highlight js %}

if (pbjs.libLoaded) pbjs.setTargetingForGPTAsync();

{% endhighlight %}



</div>

<div role="tabpanel" class="tab-pane" id="targeting-custom" markdown="1">




</div>

</div>

</div>

</div>



<div class="bs-docs-section" markdown="1">


#Function Reference

**Funciton** `setTargetingForGPTAsync()`

Set query string targeting on all GPT ad units. The logic for deciding query strings is described in the section [Configure AdServer Targeting](configure-adserver-targeting). Note that this function has to be called **after all ad units on page are defined**.


**Function** `getAdserverTargetingParamsForAdUnit(adUnitCode)`

A non blocking function that returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidders' response may not have been received if you call this function too quickly after the requests are sent. 

{% highlight js %}

getAdserverTargetingParamsForAdUnit('1234')

// will return:
[{
    key: "hb_adid",
    val: "234"
},{
    key: "hb_pb",
    val: "1.02"
}, ...
]
{% endhighlight %}

**Function** `requestBidsForAdUnit(adUnitCode)`

A non blocking function that will send out bid requests for the given ad unit's bidders. If `adUnitCode` is not given, the function will request bids for ALL ad units.

**Function** `registerBidCallbackHandler()`

Once all bidders have responded, the function registered will be called.

{% highlight js %}

pbjs.registerBidCallbackHandler = function(){
    pbjsInitAdserver();
}

{% endhighlight %}

</div>



<div class="bs-docs-section" markdown="1">


#How to debug?

If your page is not serving pre-bid ads, there could be 2 reasons:

1. The ad server is not configured correctly.
2. The bidders do not have demand.

</div>

<br>

<br>