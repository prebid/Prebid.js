---
layout: page
title: Publisher API Reference
description: Publisher API Reference for Prebid.js Header Bidding
top_nav_section: dev_docs
nav_section: reference
pid: 10
---

<div class="bs-docs-section" markdown="1">

# Publisher API Reference

This page has documentation for the public API methods of Prebid.js.

<a name="module_pbjs"></a>

## pbjs

* [pbjs](#module_pbjs)

  * [.getAdserverTargeting()](#module_pbjs.getAdserverTargeting) ⇒ `Object`
  * [.getAdserverTargetingForAdUnitCode([adUnitCode])](#module_pbjs.getAdserverTargetingForAdUnitCode) ⇒ `Object`
  * [.getBidResponses()](#module_pbjs.getBidResponses) ⇒ `Object`
  * [.getBidResponsesForAdUnitCode(adUnitCode)](#module_pbjs.getBidResponsesForAdUnitCode) ⇒ `Object`
  * [.setTargetingForGPTAsync([codeArr])](#module_pbjs.setTargetingForGPTAsync)
  * [.allBidsAvailable()](#module_pbjs.allBidsAvailable) ⇒ `boolean`
  * [.enableSendAllBids()](#module_pbjs.enableSendAllBids)
  * [.setPriceGranularity(granularity)](#module_pbjs.setPriceGranularity)
  * [.renderAd(doc, id)](#module_pbjs.renderAd)
  * [.removeAdUnit(adUnitCode)](#module_pbjs.removeAdUnit)
  * [.requestBids(requestObj)](#module_pbjs.requestBids)
  * [.addAdUnits(Array)](#module_pbjs.addAdUnits)
  * [.bidderSettings](#module_pbjs.bidderSettings)
  * [.addCallback(event, func)](#module_pbjs.addCallback) ⇒ `String`
  * [.removeCallback(cbId)](#module_pbjs.removeCallback) ⇒ `String`

<a name="module_pbjs.getAdserverTargeting"></a>

### pbjs.getAdserverTargeting() ⇒ `object`
Returns all ad server targeting for all ad units. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.

The targeting keys can be configured in [ad server targeting](#module_pbjs.bidderSettings).

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

<hr class="full-rule">

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

<hr class="full-rule">

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


<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">

  <div class="panel panel-default">
    <div class="panel-heading" role="tab" id="headingThree">
      <h4 class="panel-title">
        <a class="collapsed" role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
          > Returned Object Example
        </a>

      </h4>
    </div>
    <div id="collapseThree" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingThree">
      <div class="panel-body" markdown="1">


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
      },{
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


</div>
</div>
</div>
</div>



<hr class="full-rule">

<a name="module_pbjs.getBidResponsesForAdUnitCode"></a>

### pbjs.getBidResponsesForAdUnitCode(adUnitCode) ⇒ `Object`

Returns bidResponses for the specified adUnitCode. See full documentation at [pbjs.getBidResponses()](module_pbjs.getBidResponses).

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `Object` - bidResponse object

{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| adUnitCode | Required | `String` | adUnitCode |

<hr class="full-rule">

<a name="module_pbjs.setTargetingForGPTAsync"></a>

### pbjs.setTargetingForGPTAsync([codeArr])
Set query string targeting on all GPT ad units. The logic for deciding query strings is described in the section Configure AdServer Targeting. Note that this function has to be called after all ad units on page are defined.

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | -- |
| [codeArr] | Optional | `array` | an array of adUnitodes to set targeting for. |

<hr class="full-rule">

<a name="module_pbjs.allBidsAvailable"></a>

### pbjs.allBidsAvailable() ⇒ `bool`
Returns a bool if all the bids have returned or timed out

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `bool` - all bids available

<hr class="full-rule">


<a name="module_pbjs.enableSendAllBids"></a>

### pbjs.enableSendAllBids()

(Added in version 0.9.2)

After this method is called, Prebid.js will generate bid keywords for all bids, instead of the default behavior of only sending the top winning bid to the ad server.

With the sendAllBids mode enabled, your page can send all bid keywords to your ad server. Your ad server will see all the bids, then make the ultimate decision on which one will win. Some ad servers, such as DFP, can then generate reporting on historical bid prices from all bidders.

Note that this method must be called before `pbjs.setTargetingForGPTAsync()` or `pbjs.getAdserverTargeting()`.

After this method is called, `pbjs.getAdserverTargeting()` will give you the below json (example). `pbjs.setTargetingForGPTAsync()` will apply the below keywords in the json to GPT (example below)


{% include send-all-bids-keyword-targeting.md %}

{% highlight js %}
{
  "hb_adid_indexExchang": "129a7ed7a6fb40e",
  "hb_pb_indexExchange": "10.00",
  "hb_size_indexExchang": "300x250",
  "hb_adid_triplelift": "1663076dadb443d",
  "hb_pb_triplelift": "10.00",
  "hb_size_triplelift": "0x0",
  "hb_adid_appnexus": "191f4aca0c0be8",
  "hb_pb_appnexus": "10.00",
  "hb_size_appnexus": "300x250",
  // original ones (also attached):
  "hb_bidder": "appnexus",
  "hb_adid": "191f4aca0c0be8",
  "hb_pb": "10.00",
  "hb_size": "300x250",
}
{% endhighlight %}

<hr class="full-rule">

<a name="module_pbjs.setPriceGranularity"></a>

### pbjs.setPriceGranularity

This method is used to configure which price bucket is used for the `hb_pb` keyword.  For an example showing how to use this method, see the [Simplified price bucket setup](/dev-docs/examples/simplified-price-bucket-setup.html).

Accepted values:

+ `"low"`: $0.50 increments, capped at $5 CPM
+ `"medium"`: $0.10 increments, capped at $20 CPM (the default)
+ `"high"`: $0.01 increments, capped at $20 CPM
+ `"auto"`: Applies a sliding scale to determine granularity as shown in the [Auto Granularity](#autoGranularityBucket) table below.
+ `"dense"`: Like `"auto"`, but the bid price granularity uses smaller increments, especially at lower CPMs.  For details, see the [Dense Granularity](#denseGranularityBucket) table below.

<a name="autoGranularityBucket"></a>

#### Auto Granularity

{: .table .table-bordered .table-striped }
| CPM                 | 	Granularity                  |  Example |
|---------------------+----------------------------------+--------|
| CPM <= $5            | 	$0.05 increments             | $1.87 floored to $1.85 |
| CPM <= $10 and > $5  | 	$0.10 increments             | $5.09 floored to $5.00 |
| CPM <= $20 and > $10 | 	$0.50 increments             | $14.26 floored to $14.00 |
| CPM > $20           | 	Caps the price bucket at $20 | $24.82 floored to $20.00 |

<a name="denseGranularityBucket"></a>

#### Dense Granularity

{: .table .table-bordered .table-striped }
| CPM        | 	Granularity                  | Example |
|------------+-------------------------------+---------|
| CPM <= $3  | 	$0.01 increments             | $1.87 floored to $1.87 |
| CPM <= $8 and >$3  | 	$0.05 increments             | $5.09 floored to $5.05 |
| CPM <= $20 and >$8 | 	$0.50 increments             | $14.26 floored to $14.00 |
| CPM >  $20 | 	Caps the price bucket at $20 | $24.82 floored to $20.00 |


<hr class="full-rule">

<a name="module_pbjs.renderAd"></a>

### pbjs.renderAd(doc, id)
This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly. This function is usually used in the ad server's creative.

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| doc | Required | `object` | document |
| id | Required | `string` | bid id to locate the ad |


<hr class="full-rule">

<a name="module_pbjs.removeAdUnit"></a>

### pbjs.removeAdUnit(adUnitCode)
Remove adUnit from the pbjs configuration

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| adUnitCode | Required | `String` | the adUnitCode to remove |


<hr class="full-rule">

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

<hr class="full-rule">

<a name="module_pbjs.addAdUnits"></a>

### pbjs.addAdUnits(Array)

Define ad units and their corresponding header bidding bidders' tag Ids.  For usage examples, see [Getting Started]({{site.baseurl}}/dev-docs/getting-started.html).

**Kind**: static method of [pbjs](#module_pbjs)

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| Array | `string` &#124; `Array of strings` | of adUnits or single adUnit Object. |

**adUnit**

{: .table .table-bordered .table-striped }
| Name    | Scope     | Type     | Description                                                                                                                                                                                                   |
| :----   | :-------- | :------- | :-----------                                                                                                                                                                                                  |
| `code`  | required  | string   | A unique identifier that you create and assign to this ad unit.  This identifier will be used to set query string targeting on the ad. If you're using GPT, we recommend setting this to the slot element ID. |
| `sizes` | required  | array    | All the sizes that this ad unit can accept.                                                                                                                                                                   |
| `bids`  | required  | array    | An array of bid objects. Find the [complete reference here](bidders.html).                                                                                                                                    |

**bid**

{: .table .table-bordered .table-striped }
|   Name |  Scope   |    Type | Description |
| :----  |:--------| :-------| :----------- |
| `bidder` |    required |  string |    The bidder code. Find the [complete list here](bidders.html). |
| `params` |    required |  object |    The bidder's preferred way of identifying a bid request. Find the [complete reference here](bidders.html). |

<hr class="full-rule">

<a name="module_pbjs.bidderSettings"></a>

### pbjs.bidderSettings


Bidders all have different recommended ad server line item targeting and creative setup. To remove the headache for you, Prebid.js has a default recommended query string targeting setting for all bidders.



#### 1. Keyword targeting for ALL bidders


The below code snippet is the **default** setting for ad server targeting. For each bidder's bid, Prebid.js will set the below 4 keys (`hb_bidder`, `hb_adid`, `hb_pb`, `hb_size`) with their corresponding values. The key value pair targeting is applied to the bid's corresponding ad unit. Your ad ops team will have the ad server's line items target the 4 keys.

If you'd like to customize the key value pairs, you can overwrite the settings as the below example shows. **Note** that once you updated the settings, let your ad ops team know about the change, so they can update the line item targeting accordingly.

By default, only the winning bid (bid with the highest cpm) will be sent to the ad server. However, if you would like all bid responses available sent to the ad server, and hold the decision logic in the ad server, you can do that by specifying `alwaysUseBid` in the bidderSetting. This can be really useful especially when working with a prebid partner not returning a cpm Value.

The bidderSettings object can also be really useful to specify your own price bucket function to define the price bucket sent to the ad server.

<a name="bidderSettingsDefault"></a>

There's no need to include the following code if you choose to use the **below default setting**.

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
        }]
    }
}

{% endhighlight %}

<a name="default-keywords">

##### Default keyword targeting prebid.js sends to your ad server

{% include default-keyword-targeting.md %}

#### 2. Keyword targeting for a specific bidder

If you'd like more customization (down to the bidder level), prebid.js also provides the API to do so.
Let’s say you still prefer to have a separate set of line items for a bidder. You can overwrite the bidder settings as the below example shows, which overwrites the default AppNexus query string targeting.

**Note that the line item setup has to match the targeting change**.


{% highlight js %}
pbjs.bidderSettings = {
    appnexus: {
      adserverTargeting: [
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
}
{% endhighlight %}


The bidder setting for AppNexus is saying: send 2 pairs of key/value strings targeting for every AppNexus bid and for every ad unit. The 1st pair would be `apn_pbMg` => the value of `bidResponse.pbMg`. The 2nd pair would be `apn_adId` => the value of `bidResponse.adId`. You can find the documentation of bidResponse object [here](bidders.html).

<!-- Now let's say you would like Criteo bids to always be sent to the adServer, since Criteo isn't sending back a cpm, prebid.js can't order it among the other prebid partners.
You could define your own bidderSetting, only for criteo bidder, that would setup Criteo bid to always be sent to the adserver and not be evaluated against other bids.

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

-->

Now let's say you would like to define you own price bucket function rather than use the ones available by default in prebid.js (pbLg, pbMg, pbHg).You can overwrite the bidder settings as the below example shows:

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

#### 3. Adjust bid price for a specific bidder

Some bidders return gross prices, instead of the net prices (what the publisher will actually get paid). For example, a publisher's net price might be 15% below the returned gross price. In this case, the publisher may want to adjust the bidder's returned price to run a true header bidding auction. Otherwise, this bidder's gross price will unfairly win over your other demand sources who report the real price.

{% highlight js %}

pbjs.bidderSettings = {
  standard: { ... }
  aol: {
    bidCpmAdjustment : function(bidCpm){
      // adjust the bid in real time before the auction takes place
      return bidCpm * .85;
    }
  }
};

{% endhighlight %}

Note that in the above example, the AOL bidder will inherit from "standard" adserverTargeting keys, so that you don't have to define the targeting keywords again.

#### function(bidResponse)

{: .table .table-bordered .table-striped }
| Function Name | Description |
| :--- | :---- |
| function(bidResponse) | The function returns a query string targeting value. It is used in pair with the adserverTargeting's `key` param. The key value pair together will be sent for targeting on the ad server's ad unit impression. `bidResponse` is bidder specific and you can find what're available in the [documentation here](bidders.html). |

<a name="bidResponse"></a>

#### Available bidResponse values

{: .table .table-bordered .table-striped }
|   Name |   Type | Description | Example
| :----  |:--------| :-------| :-------|
| `bidder` | String | The bidder code. Used by ad server's line items to identify bidders | `rubicon` |
| `adId` | String |  The unique identifier of a bid creative. It's used by the line item's creative as in [this example](/adops/step-by-step.html). | `123` |
| `pbLg` | String | The low granularity price bucket at 0.50 increment, capped at $5, floored to 2 decimal places. (0.50, 1.00, 1.50, ..., 5.00) | `1.50` |
| `pbMg` | String | The medium granularity price bucket at 0.10 increment, capped at $20, floored to 2 decimal places. (0.10, 0.20, ..., 19.90, 20.00) | `1.60` |
| `pbHg` | String | The high granularity price bucket at 0.01 increment, capped at $20, floored to 2 decimal places. (0.01, 0.02, ..., 19.99, 20.00) | `1.61` |
| `size` | String | The size of the bid creative. Concatenation of width and height by 'x'. | `300x250` |
| `cpm` | float | The exact bid price from the bidder | 1.59 |


<hr class="full-rule">

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

<hr class="full-rule">

<a name="module_pbjs.removeCallback"></a>

### pbjs.removeCallback(cbId) ⇒ `String`
Remove a callback event

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `String` - id for callback

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| cbId | `string` | id of the callback to remove |






</div>



<br>

<br>
