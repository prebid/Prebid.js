---
layout: page
title: Publisher API
head_title: Publisher API for Header Bidding
description: API for publishers
show_disqus: true

isNavParent: true

pid: 10
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
        <li role="presentation" class="active"><a href="#bidder-register-dfp" role="tab" data-toggle="tab">DFP</a>
        </li>
        <li role="presentation"><a href="#bidder-register-custom" role="tab" data-toggle="tab">Custom Ad Server</a>
        </li>
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
pbjs.que = pbjs.que || [];

pbjs.que.push(function() {

    var adUnits = [{
        code: "/1996833/slot-1",
        sizes: [[300, 250], [728, 90]],
        bids: [{
            bidder: "openx",
            params: {
                pgid: "2342353",
                unit: "234234",
                jstag_url: "http://"
            }
        },{
            bidder: "appnexus",
            params: {
                placementId: "234235"
            }
        }]
    },{
        code: "/1996833/slot-2",
        sizes: [[468, 60]],
        bids: [{
            bidder: "rubicon",
            params: {
                rp_account: "4934",
                rp_site: "13945",
                rp_zonesize: "23948-15"
            }
        },{
            bidder: "appnexus",
            params: {
                placementId: "827326"
            }
        }]
    }];

    pbjs.addAdUnits(adUnits);

    pbjs.requestBids({
      bidsBackHandler: function() {
          // callback when requested bids are all back
      };
    });

});

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

By default, only the winning bid (bid with the highest cpm) will be send to the ad server. However, if you would like all bid responses available sent to the ad server, and hold the decision logic in the ad server, you can do that by specifying `alwaysUseBid` in the bidderSetting. This can be really useful especially when working with prebid partner not returning a cpm Value (ie: Criteo).

The bidderSettings object can also be really useful to define your own price bucket function to define the price bucket sent to the ad server.

There's no need to include the following code if you choose to use the default setting.

{% highlight js %}

pbjs.bidderSettings = {
    standard: {
    	alwaysUseBid: false,
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

Now let's say you would like Criteo bid to always be send to the adServer, since Criteo isn't sending back a cpm, prebid.js can't order it among the other prebid partners.
You could define your own bidderSetting, only for criteo bidder, that would setup Criteo bid to always be send to the adserver and not be evaluate against other bids

{% highlight js %}

pbjs.bidderSettings = {
    standard: {
    	alwaysUseBid: true,
        adserverTargeting: [{
            key: "crt_bid",
            val: function(bidResponse) {
                return (bidResponse.statusMessage == "Bid available" ? "true" : "false");
            }
        }]
    }
}

{% endhighlight %}

Now let's say you would like to define you own price bucket function rather than use the ones available by default in prebid.js (pbLg, pbMg, pbHg).You can overwrite the bidder settings as the below example:

**Note: this will only impact the price bucket assignation (for ad server targeting). It won't actually impact the cpm value used for ordering the bids.**


{% highlight js %}

pbjs.bidderSettings = {
    standard: {
    	alwaysUseBid: false,
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
            	// define your own function to assign price bucket
            	if (cpm < 2)
            		return "pb1"; // all bids less than $2 are assigned to price bucket 'pb1'
            	if (cpm < 3)
            		return "pb2"; // all bids less than $3 are assigned to price bucket 'pb2'
            	if (cpm < 4)
            		return "pb3"; // all bids less than $4 are assigned to price bucket 'pb3'
            	if (cpm < 5)
            		return "pb4"; // all bids less than $5 are assigned to price bucket 'pb4'
            	if (cpm < 6)
            		return "pb5"; // all bids less than $6 are assigned to price bucket 'pb5'
                return "pb6"; // all bids $6 and above are assigned to price bucket 'pb6'
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
        <li role="presentation" class="active"><a href="#timeout-dfp" role="tab" data-toggle="tab">DFP</a>
        </li>
        <li role="presentation"><a href="#timeout-custom" role="tab" data-toggle="tab">Custom Ad Server</a>
        </li>
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
    if (pbjs.initAdserverSet) return;
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



You've probably already configured your custom ad server to wait for a certain amount of time before sending out the impressions. That amount of time is given to your pre-bid bidders to respond. Note that `pbjs.getAdserverTargetingParams(code)` will only return targeting parameters after a few hundred milliseconds (the time it takes bidders to respond with bids).

{% highlight js %}

PB_PAGE_TIMEOUT = 300;
function initAdserver() {
    pbjs.initAdserverSet = true;
    // Step 1: Set key value targeting on the placements
    if (pbjs.libLoaded) {
        // For each of your placement, get and set targeting params
        var targetingParams = pbjs.getAdserverTargetingParams();
    }
    // Step 2: Trigger the page to send the impressions to your ad server.
};
setTimeout(initAdserver, PB_PAGE_TIMEOUT);

{% endhighlight %}

</div>

</div>

</div>




</div>


<div class="bs-docs-section" markdown="1">
#Set key-value targeting



<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#targeting-dfp" role="tab" data-toggle="tab">DFP</a>
        </li>
        <li role="presentation"><a href="#targeting-custom" role="tab" data-toggle="tab">Custom Ad Server</a>
        </li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="targeting-dfp" markdown="1">


`pbjs.setTargetingForGPTAsync` will find all the ad slots defined in the page, and call GPT's set targeting function for query string targeting. The logic for coming up with key value pairs can be found in the section [Configure AdServer Targeting](#adserver-targeting).

Prebid.js automatically clears the pre-bid related targeting defined in [Configure AdServer Targeting](#adserver-targeting) before it sets targeting.

Note that the below function has to be called after **all your GPT slots have been defined**.

{% highlight js %}

pbjs.que.push(function() {
    pbjs.setTargetingForGPTAsync();
});

{% endhighlight %}



</div>

<div role="tabpanel" class="tab-pane" id="targeting-custom" markdown="1">

`pbjs.getAdserverTargetingParams()` gives you the highest bid's targeting params for each ad unit. Set targeting on the ad units using your specific ad server's API.


</div>

</div>

</div>

</div>



<div class="bs-docs-section" markdown="1">

#Function Reference

Version 0.3.1

<a name="module_pbjs"></a>


## pbjs

* [pbjs](#module_pbjs)

  * [.getAdserverTargeting()](#module_pbjs.getAdserverTargeting) ⇒ `object`
  * [.getAdserverTargetingForAdUnitCode([adunitCode])](#module_pbjs.getAdserverTargetingForAdUnitCode) ⇒ `object`
  * [.getBidResponses()](#module_pbjs.getBidResponses) ⇒ `object`
  * [.getBidResponsesForAdUnitCode(adUnitCode)](#module_pbjs.getBidResponsesForAdUnitCode) ⇒ `Object`
  * [.setTargetingForGPTAsync([codeArr])](#module_pbjs.setTargetingForGPTAsync)
  * [.allBidsAvailable()](#module_pbjs.allBidsAvailable) ⇒ `bool`
  * [.renderAd(doc, id)](#module_pbjs.renderAd)
  * [.removeAdUnit(adUnitCode)](#module_pbjs.removeAdUnit)
  * [.requestBids(requestObj)](#module_pbjs.requestBids)
  * [.addAdUnits(Array)](#module_pbjs.addAdUnits)
  * [.addCallback(event, func)](#module_pbjs.addCallback) ⇒ `String`
  * [.removeCallback(cbId)](#module_pbjs.removeCallback) ⇒ `String`

<a name="module_pbjs.getAdserverTargeting"></a>

### pbjs.getAdserverTargeting() ⇒ `object`
Returns all ad server targeting for all ad units. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.

The targeting keys can be configured in [ad server targeting](#configure-ad-server-targeting).

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `object` - Map of adUnitCodes and targeting values []

**Returned Object Example:**

{% highlight js %}
{
  "/9968336/header-bid-tag-0": {
    "hb_bidder": "rubicon",
    "hb_adid": "13f44b0d3c",
    "hb_pb": "1.50"
  },
  "/9968336/header-bid-tag1": {
    "hb_bidder": "openx",
    "hb_adid": "147ac541a",
    "hb_pb": "1.00"
  }
}
{% endhighlight %}

<a name="module_pbjs.getAdserverTargetingForAdUnitCode"></a>

### pbjs.getAdserverTargetingForAdUnitCode([adunitCode]) ⇒ `object`
This function returns the query string targeting parameters available at this moment for a given ad unit. For full documentation see function [pbjs.getAdserverTargeting()](#module_pbjs.getAdserverTargeting).

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `object` - returnObj return bids

**Request Params:**

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| [adunitCode] | `string` | adUnitCode to get the bid responses for |

**Returned Object Example:**

{% highlight js %}
{
  "hb_bidder": "rubicon",
  "hb_adid": "13f44b0d3c",
  "hb_pb": "0.50"
}
{% endhighlight %}

<a name="module_pbjs.getBidResponses"></a>

### pbjs.getBidResponses() ⇒ `object`
This function returns the bid responses at the given moment.

**Kind**: static method of [pbjs](#module_pbjs).

**Returns**: `object` - map | object that contains the bidResponses.


**Returned Object Params**:

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| `bidder` | String | The bidder code. Used by ad server's line items to identify bidders | `rubicon` |
| `adId` | String |  The unique identifier of a bid creative. It's used by the line item's creative as in [this example](adops.html#creative-setup). | `123` |
| `width` | Integer | The width of the returned creative size. | 300 |
| `height` | Integer | The height of the returned creative size. | 250 |
| `cpm` | Float | The exact bid price from the bidder | 1.59 |
| `requestTimestamp` | Integer | The time stamp when the bid request is sent out in milliseconds | 1444844944106 |
| `responseTimestamp` | Integer | The time steamp when the bid response is received in milliseconds | 1444844944185 |
| `timeToRespond` | Integer | The amount of time for the bidder to respond with the bid | 79 |
| `adUnitCode` | String | adUnitCode to get the bid responses for | "/9968336/header-bid-tag-0"|
| `statusMessage` | String | The bid's status message | "Bid returned empty or error response" or "Bid available" |

**Returned Object Example:**
{% highlight js %}
{
  "/9968336/header-bid-tag-0": {
    "bids": [
      {
        "bidderCode": "appnexus",
        "width": 300,
        "height": 250,
        "statusMessage": "Bid available",
        "adId": "7a53a9d3",
        "creative_id": 29681110,
        "cpm": 0.5,
        "adUrl": "http://nym1.ib.adnxs.com/ab?e=wqT_3QLzBKBqAgAAAgDWAAUIkav6sAUQucfc0v-nzQcYj…r=http%3A%2F%2Flocal%3A4000%2Fexamples%2Fpbjs_partial_refresh_example.html",
        "requestTimestamp": 1444844944095,
        "responseTimestamp": 1444844944180,
        "timeToRespond": 85,
        "adUnitCode": "/19968336/header-bid-tag-0",
        "bidder": "appnexus",
        "usesGenericKeys": true,
        "size": "300x250",
        "adserverTargeting": {
          "hb_bidder": "appnexus",
          "hb_adid": "7a53a9d3",
          "hb_pb": "0.50"
        }
      },
      {
        "bidderCode": "criteo",
        "width": 0,
        "height": 0,
        "statusMessage": "Bid returned empty or error response",
        "adId": "80bb5b1ab",
        "requestTimestamp": 1444844944106,
        "responseTimestamp": 1444844944185,
        "timeToRespond": 79,
        "cpm": 0,
        "adUnitCode": "/19968336/header-bid-tag-0",
        "bidder": "criteo"
      },
      {
        "bidderCode": "pubmatic",
        "width": "300",
        "height": "250",
        "statusMessage": "Bid available",
        "adId": "1139e34e14",
        "adSlot": "39620189@300x250",
        "cpm": 1,
        "ad": "<span class=\"PubAPIAd\"><script src='http://ad.turn.com/server/ads.js?pub=5757398&cch=36757096&code=37127675&l=3…tcGlkPUVERkNGMDY5LTA2ODctNDAxQy04NkMwLTIzQjNFNzI1MzdGNiZwYXNzYmFjaz0w_url='></script></span> <!-- PubMatic Ad Ends -->",
        "adUrl": "http://aktrack.pubmatic.com/AdServer/AdDisplayTrackerServlet?operId=1&pubId…local%3A4000%2Fexamples%2Fpbjs_partial_refresh_example.html&lpu=hotels.com",
        "dealId": "",
        "requestTimestamp": 1444844944105,
        "responseTimestamp": 1444844944354,
        "timeToRespond": 249,
        "adUnitCode": "/19968336/header-bid-tag-0",
        "bidder": "pubmatic",
        "usesGenericKeys": true,
        "size": "300x250",
        "adserverTargeting": {
          "hb_bidder": "pubmatic",
          "hb_adid": "1139e34e14",
          "hb_pb": "1.00"
        }
      },
      {
        "bidderCode": "rubicon",
        "width": "300",
        "height": "250",
        "statusMessage": "Bid available",
        "adId": "130d3b0d9b",
        "cpm": 0.795995,
        "ad": "<scri...pt>",
        "ad_id": "3161645",
        "sizeId": "15",
        "requestTimestamp": 1444844944116,
        "responseTimestamp": 1444844944396,
        "timeToRespond": 280,
        "adUnitCode": "/19968336/header-bid-tag-0",
        "bidder": "rubicon",
        "usesGenericKeys": true,
        "size": "300x250",
        "adserverTargeting": {
          "hb_bidder": "rubicon",
          "hb_adid": "130d3b0d9b",
          "hb_pb": "0.50"
        }
      }
    ]
  },
  "/9968336/header-bid-tag1": {
    "bids": [
      {
        "bidderCode": "casale",
        "width": 0,
        "height": 0,
        "statusMessage": "Bid returned empty or error response",
        "adId": "108c0ba49d",
        "requestTimestamp": 1444844944130,
        "responseTimestamp": 1444844944223,
        "timeToRespond": 93,
        "cpm": 0,
        "adUnitCode": "/19968336/header-bid-tag1",
        "bidder": "casale"
      },
      {
        "bidderCode": "openx",
        "width": "728",
        "height": "90",
        "statusMessage": "Bid available",
        "adId": "14d7f9208f",
        "ad_id": "537161420",
        "cpm": 1.717,
        "ad": "<iframe src=...tame>",
        "requestTimestamp": 1444844944130,
        "responseTimestamp": 1444844944490,
        "timeToRespond": 360,
        "adUnitCode": "/19968336/header-bid-tag1",
        "bidder": "openx",
        "usesGenericKeys": true,
        "size": "728x90",
        "adserverTargeting": {
          "hb_bidder": "openx",
          "hb_adid": "14d7f9208f",
          "hb_pb": "1.50"
        }
      }
    ]
  }
}
{% endhighlight %}


<a name="module_pbjs.getBidResponsesForAdUnitCode"></a>

### pbjs.getBidResponsesForAdUnitCode(adUnitCode) ⇒ `Object`

Returns bidResponses for the specified adUnitCode. See full documentation at [pbjs.getBidResponses()](module_pbjs.getBidResponses).

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `Object` - bidResponse object

{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| adUnitCode | Required | `String` | adUnitCode |

<a name="module_pbjs.setTargetingForGPTAsync"></a>

### pbjs.setTargetingForGPTAsync([codeArr])
Set query string targeting on all GPT ad units. The logic for deciding query strings is described in the section Configure AdServer Targeting. Note that this function has to be called after all ad units on page are defined.

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | -- |
| [codeArr] | Optional | `array` | an array of adUnitodes to set targeting for. |

<a name="module_pbjs.allBidsAvailable"></a>

### pbjs.allBidsAvailable() ⇒ `bool`
Returns a bool if all the bids have returned or timed out

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `bool` - all bids available
<a name="module_pbjs.renderAd"></a>

### pbjs.renderAd(doc, id)
This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| doc | Required | `object` | document |
| id | Required | `string` | bid id to locate the ad |

<a name="module_pbjs.removeAdUnit"></a>

### pbjs.removeAdUnit(adUnitCode)
Remove adUnit from the pbjs configuration

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| adUnitCode | Required | `String` | the adUnitCode to remove |


<a name="module_pbjs.requestBids"></a>

### pbjs.requestBids(requestObj)
Request bids. When `adUnits` or `adUnitCodes` are not specified, request bids for all ad units added.

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| requestObj | Optional | `Object` |  |
| requestObj.adUnitCodes | Optional | `Array of strings` | adUnit codes to request. Use this or requestObj.adUnits |
| requestObj.adUnits | Optional | `Array of objects` | AdUnitObjects to request. Use this or requestObj.adUnitCodes |
| requestObj.timeout | Optional | `Integer` | Timeout for requesting the bids specified in milliseconds |
| requestObj.bidsBackHandler | Optional | `function` | Callback to execute when all the bid responses are back or the timeout hits. |

<a name="module_pbjs.addAdUnits"></a>

### pbjs.addAdUnits(Array)
Add adunit(s)

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| Array | `string` &#124; `Array of strings` | of adUnits or single adUnit Object. |

<a name="module_pbjs.addCallback"></a>

### pbjs.addCallback(event, func) ⇒ `String`
Add a callback event

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `String` - id for callback

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| event | `String` | event to attach callback to Options: `adUnitBidsBack` |
| func | `function` | function to execute. Paramaters passed into the function: ((bidResObj&#124;bidResArr), [adUnitCode]); |

<a name="module_pbjs.removeCallback"></a>

### pbjs.removeCallback(cbId) ⇒ `String`
Remove a callback event

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `String` - id for callback

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| cbId | `string` | id of the callback to remove |






<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">

  <div class="panel panel-default">
    <div class="panel-heading" role="tab" id="headingThree">
      <h4 class="panel-title">
        <a class="collapsed" role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
          Older API Version (0.2.1)
        </a>

      </h4>
    </div>
    <div id="collapseThree" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingThree">
      <div class="panel-body" markdown="1">


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
</div>
</div>
</div>









</div>



<div class="bs-docs-section" markdown="1">


#How to debug?

Add `?pbjs_debug=true` to your page's

If your page is not serving pre-bid ads, there could be 2 reasons:

1. The ad server is not configured correctly.
2. The bidders do not have demand.

Add pbjs_debug=true to the URL. Prebid.js will log warnings and helpful auction messages.

</div>

<br>

<br>
