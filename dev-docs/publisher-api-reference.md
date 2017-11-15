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

{: .alert.alert-danger :}
Methods marked as deprecated will be removed in version 1.0 (scheduled for release Q4 2017).  
After a transition period, documentation for these methods will be removed from Prebid.org (likely early 2018).

<a name="module_pbjs"></a>

## pbjs

* [pbjs](#module_pbjs)

  * [.getAdserverTargeting()](#module_pbjs.getAdserverTargeting)
  * [.getAdserverTargetingForAdUnitCode([adUnitCode])](#module_pbjs.getAdserverTargetingForAdUnitCode)
  * [.getBidResponses()](#module_pbjs.getBidResponses)
  * [.getBidResponsesForAdUnitCode(adUnitCode)](#module_pbjs.getBidResponsesForAdUnitCode)
  * [.getHighestCpmBids([adUnitCode])](#module_pbjs.getHighestCpmBids)
  * [.getAllWinningBids()](#module_pbjs.getAllWinningBids)
  * [.setTargetingForGPTAsync([codeArr])](#module_pbjs.setTargetingForGPTAsync)
  * [.setTargetingForAst()](#module_pbjs.setTargetingForAst)
  * [.allBidsAvailable()](#module_pbjs.allBidsAvailable) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.enableSendAllBids()](#module_pbjs.enableSendAllBids) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.setPriceGranularity(granularity)](#module_pbjs.setPriceGranularity) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.renderAd(doc, id)](#module_pbjs.renderAd)
  * [.removeAdUnit(adUnitCode)](#module_pbjs.removeAdUnit)
  * [.requestBids(requestObj)](#module_pbjs.requestBids)
  * [.addAdUnits(Array)](#module_pbjs.addAdUnits)
  * [.addBidResponse(adUnitCode, bid)](#module_pbjs.addBidResponse) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.bidderSettings](#module_pbjs.bidderSettings)
  * [userSync](#module_pbjs.userSync)
  * [.addCallback(event, func)](#module_pbjs.addCallback) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.removeCallback(cbId)](#module_pbjs.removeCallback) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.buildMasterVideoTagFromAdserverTag(adserverTag, options)](#module_pbjs.buildMasterVideoTagFromAdserverTag) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.setBidderSequence(order)](#module_pbjs.setBidderSequence) <strong style="background-color:#fcf8f2;border-color:#f0ad4e">Deprecated; will be removed in 1.0</strong>
  * [.onEvent(event, handler, id)](#module_pbjs.onEvent)
  * [.offEvent(event, handler, id)](#module_pbjs.onEvent)
  * [.enableAnalytics(config)](#module_pbjs.enableAnalytics)
  * [.aliasBidder(adapterName, aliasedName)](#module_pbjs.aliasBidder)
  * [.setConfig(options)](#module_pbjs.setConfig)
  * [.getConfig([string])](#module_pbjs.getConfig)
  * [.adServers.dfp.buildVideoUrl(options)](#module_pbjs.adServers.dfp.buildVideoUrl)

<a name="module_pbjs.getAdserverTargeting"></a>

### pbjs.getAdserverTargeting() ⇒ `object`

Returns all ad server targeting for all ad units. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.

The targeting keys can be configured in [ad server targeting](#module_pbjs.bidderSettings).

When [deals are enabled]({{site.baseurl}}/adops/deals.html), the object returned by this method may include a field `hb_deal_BIDDERCODE`, where `BIDDERCODE` is replaced by the name of the bidder, e.g., AppNexus, Rubicon, etc.

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
  "/9968336/header-bid-tag-1": {
    "hb_bidder": "openx",
    "hb_adid": "147ac541a",
    "hb_pb": "1.00"
  },
  "/9968336/header-bid-tag-2": {
    "hb_bidder": "appnexus",
    "hb_adid": "147ac541a",
    "hb_pb": "2.50",
    "hb_deal_appnexus": "ABC_123"
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
| Param               | Type    | Description                                                                                                                     |                                                           |
|---------------------+---------+---------------------------------------------------------------------------------------------------------------------------------+-----------------------------------------------------------|
| `bidder`            | String  | The bidder code. Used by ad server's line items to identify bidders                                                             |                                                 `rubicon` |
| `adId`              | String  | The unique identifier of a bid creative. It's used by the line item's creative as in [this example]({{site.github.url}}/adops/send-all-bids-adops.html#step-3-add-a-creative). |                                                     `123` |
| `width`             | Integer | The width of the returned creative size.                                                                                        |                                                       300 |
| `height`            | Integer | The height of the returned creative size.                                                                                       |                                                       250 |
| `cpm`               | Float   | The exact bid price from the bidder                                                                                             |                                                      1.59 |
| `requestTimestamp`  | Integer | The time stamp when the bid request is sent out in milliseconds                                                                 |                                             1444844944106 |
| `responseTimestamp` | Integer | The time stamp when the bid response is received in milliseconds                                                               |                                             1444844944185 |
| `timeToRespond`     | Integer | The amount of time for the bidder to respond with the bid                                                                       |                                                        79 |
| `adUnitCode`        | String  | adUnitCode to get the bid responses for                                                                                         |                               "/9968336/header-bid-tag-0" |
| `statusMessage`     | String  | The bid's status message                                                                                                        | "Bid returned empty or error response" or "Bid available" |
| `dealId`            | String  | (Optional) If the bid is [associated with a Deal]({{site.baseurl}}/adops/deals.html), this field contains the deal ID.          |                                                 "ABC_123" |

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

Returns bidResponses for the specified adUnitCode. See full documentation at [pbjs.getBidResponses()](#module_pbjs.getBidResponses).

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `Object` - bidResponse object

{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | --- |
| adUnitCode | Required | `String` | adUnitCode |

<hr class="full-rule">

<a name="module_pbjs.getHighestCpmBids"></a>

### pbjs.getHighestCpmBids([adUnitCode]) ⇒ `Array`

Use this method to retrieve an array of winning bids.

+ `pbjs.getHighestCpmBids()`: with no argument, returns an array of winning bid objects for each ad unit on page
+ `pbjs.getHighestCpmBids(adUnitCode)`: when passed an ad unit code, returns an array with the winning bid object for that ad unit

<hr class="full-rule">

<a name="module_pbjs.getAllWinningBids"></a>

### pbjs.getAllWinningBids() ⇒ `Array`

Use this method to get all of the bids that have won their respective auctions.  Useful for [troubleshooting your integration](http://prebid.org/dev-docs/prebid-troubleshooting-guide.html).

+ `pbjs.getAllWinningBids()`: returns an array of bid objects that have won their respective auctions.

<hr class="full-rule">

<a name="module_pbjs.setTargetingForGPTAsync"></a>

### pbjs.setTargetingForGPTAsync([codeArr])

Set query string targeting on all GPT ad units. The logic for deciding query strings is described in the section Configure AdServer Targeting. Note that this function has to be called after all ad units on page are defined.

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | -- |
| [codeArr] | Optional | `array` | an array of adUnitCodes to set targeting for. |

<hr class="full-rule">

<a name="module_pbjs.setTargetingForAst"></a>

### pbjs.setTargetingForAst()

Set query string targeting on all AST ([AppNexus Seller Tag](https://wiki.appnexus.com/x/JAUIBQ)) ad units.  Note that this function has to be called after all ad units on page are defined.  For working example code, see [Using Prebid.js with AppNexus Publisher Ad Server]({{site.github.url}}/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).

**Kind**: static method of [pbjs](#module_pbjs)

<hr class="full-rule">

<a name="module_pbjs.allBidsAvailable"></a>

### pbjs.allBidsAvailable() ⇒ `bool`

{: .alert.alert-danger :}
This method is deprecated and will be removed in version 1.0 (scheduled for release Q4 2017).

Returns a bool if all the bids have returned or timed out

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `bool` - all bids available

<hr class="full-rule">


<a name="module_pbjs.enableSendAllBids"></a>

### pbjs.enableSendAllBids()

{: .alert.alert-info :}
Added in version 0.9.2

{: .alert.alert-danger :}
This method is deprecated as of version 0.27.0 and will be removed in version 1.0 (scheduled for release Q4 2017).  Please use [`setConfig`](#module_pbjs.setConfig) instead.

After this method is called, Prebid.js will generate bid keywords for all bids, instead of the default behavior of only sending the top winning bid to the ad server.

With the sendAllBids mode enabled, your page can send all bid keywords to your ad server. Your ad server will see all the bids, then make the ultimate decision on which one will win. Some ad servers, such as DFP, can then generate reporting on historical bid prices from all bidders.

Note that this method must be called before `pbjs.setTargetingForGPTAsync()` or `pbjs.getAdserverTargeting()`.

After this method is called, `pbjs.getAdserverTargeting()` will give you the below JSON (example). `pbjs.setTargetingForGPTAsync()` will apply the below keywords in the JSON to GPT (example below)


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

{: .alert.alert-danger :}
This method is deprecated as of version 0.27.0 and will be removed in version 1.0 (scheduled for release Q4 2017).  Please use [`setConfig`](#module_pbjs.setConfig) instead.

This method is used to configure which price bucket is used for the `hb_pb` keyword.  For an example showing how to use this method, see the [Simplified price bucket setup](/dev-docs/examples/simplified-price-bucket-setup.html).

Accepted values:

+ `"low"`: $0.50 increments, capped at $5 CPM
+ `"medium"`: $0.10 increments, capped at $20 CPM (the default)
+ `"high"`: $0.01 increments, capped at $20 CPM
+ `"auto"`: Applies a sliding scale to determine granularity as shown in the [Auto Granularity](#autoGranularityBucket) table below.
+ `"dense"`: Like `"auto"`, but the bid price granularity uses smaller increments, especially at lower CPMs.  For details, see the [Dense Granularity](#denseGranularityBucket) table below.
+ `customConfigObject`: If you pass in a custom config object (as shown in the [Custom CPM Bucket Sizing](#customCPMObject) example below), you can have much finer control over CPM bucket sizes, precision, and caps.

<div class="alert alert-danger" role="alert">
  <p>
  If you define 'adserverTargeting' in your own <code>bidderSettings</code> object, the <code>setPriceGranularity</code> method won't have any effect, since it assumes you are setting your own custom values.
  </p>
</div>

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

<a name="customCPMObject"></a>

#### Custom CPM Bucket Sizing

To set up your own custom CPM buckets, create an object like the following, and pass it into `setPriceGranularity`:

```javascript
const customConfigObject = {
  "buckets" : [{
      "precision": 2,  //default is 2 if omitted - means 2.1234 rounded to 2 decimal places = 2.12
      "min" : 0,
      "max" : 5,
      "increment" : 0.01
    },
    {
      "precision": 2,
      "min" : 5,
      "max" : 8,
      "increment" : 0.05
    },
    {
      "precision": 2,
      "min" : 8,
      "max" : 20,
      "increment" : 0.5
    }]
};

//set custom config object
pbjs.setPriceGranularity(customConfigObject);
```

<hr class="full-rule">

<a name="module_pbjs.renderAd"></a>

### pbjs.renderAd(doc, id)

This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously. This function is usually used in the ad server's creative.

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
| requestObj.adUnitCodes | Optional | `Array of strings` | adUnit codes to request. Use this or `requestObj.adUnits`. Default to all `adUnitCodes` if empty. |
| requestObj.adUnits | Optional | `Array of objects` | AdUnitObjects to request. Use this or `requestObj.adUnitCodes`. Default to all `adUnits` if empty. |
| requestObj.timeout | Optional | `Integer` | Timeout for requesting the bids specified in milliseconds |
| requestObj.bidsBackHandler | Optional | `function` | Callback to execute when all the bid responses are back or the timeout hits. |

<hr class="full-rule">

<a name="module_pbjs.addAdUnits"></a>

### pbjs.addAdUnits(Array)

Define ad units and their corresponding header bidding bidders' tag IDs.  For usage examples, see [Getting Started]({{site.baseurl}}/dev-docs/getting-started.html).

**Kind**: static method of [pbjs](#module_pbjs)

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| Array | `Object` &#124; `Array of objects` | of adUnits or single adUnit Object. |

**adUnit**

{: .table .table-bordered .table-striped }
| Name          | Scope     | Type     | Description                                                                                                                                                                                                    |
| :----         | :-------- | :------- | :-----------                                                                                                                                                                                                   |
| `code`        | required  | string   | A unique identifier that you create and assign to this ad unit.  This identifier will be used to set query string targeting on the ad. If you're using GPT, we recommend setting this to the slot element ID.  |
| `sizes`       | required  | array    | All the sizes that this ad unit can accept.                                                                                                                                                                    |
| `bids`        | required  | array    | An array of bid objects. Find the [complete reference here](bidders.html).                                                                                                                                     |
| `sizeMapping` | optional  | array    | Declaratively specifies ad sizes to be shown when device's screen is greater than or equal to a given size.  For more information, see [the example]({{site.github.url}}/dev-docs/examples/size-mapping.html). |

{% include sizemapping-and-screen-widths.md %}

**bid**

{: .table .table-bordered .table-striped }
|   Name |  Scope   |    Type | Description |
| :----  |:--------| :-------| :----------- |
| `bidder` |    required |  string |    The bidder code. Find the [complete list here](bidders.html). |
| `params` |    required |  object |    The bidder's preferred way of identifying a bid request. Find the [complete reference here](bidders.html). |

<hr class="full-rule">

<a name="module_pbjs.addBidResponse"></a>

### pbjs.addBidResponse(adUnitCode, bid)

{: .alert.alert-danger :}
This method is deprecated and will be removed in version 1.0 (scheduled for release Q4 2017).

This function should be called by the bidder adapter to register a bid response for the auction.  It will also run any callbacks added using [`pbjs.addCallback`](#module_pbjs.addCallback).

<hr class="full-rule">

<a name="module_pbjs.bidderSettings"></a>

### pbjs.bidderSettings

#### 1. Overview

The bidderSettings object provides a way to define some behaviors for the
platform and specific adapters. The basic structure is a 'standard' section with defaults for all adapters, and then one or more adapter-specific sections that override behavior for that bidder:

{% highlight js %}

pbjs.bidderSettings = {
    standard: {
         [...]
    },
    indexExchange: {
         [...]
    },
    rubicon: {
         [...]
    },
}

{% endhighlight %}

Defining bidderSettings is optional; the platform has default values for all of the options.
Adapters may specify their own default settings, though this isn't common.
Some sample scenarios where publishers may wish to alter the default settings:

* using bidder-specific ad server targeting instead of Prebid-standard targeting
* passing additional information to the ad server
* adjusting the bid CPM sent to the ad server

#### 2. Bidder Setting Attributes

{: .table .table-bordered .table-striped }
| Attribute | Scope | Version | Default | Description |
| --- | --- | --- | --- | --- |
| alwaysUseBid | adapter-specific | all | false | Useful when working with a prebid partner not returning a cpm value. |
| adserverTargeting | standard or adapter-specific | all | see below | Define which key/value pairs are sent to the ad server. |
| bidCpmAdjustment | standard or adapter-specific | all | n/a | Could, for example, adjust a bidder's gross-price bid to net price. |
| sendStandardTargeting | adapter-specific | 0.13.0 | true | If adapter-specific targeting is specified, can be used to suppress the standard targeting for that adapter. |
| suppressEmptyKeys | standard or adapter-specific | 0.13.0 | false | If custom adserverTargeting functions are specified that may generate empty keys, this can be used to suppress them. |

<div class="alert alert-danger" role="alert">
  <p>
  If you define 'adserverTargeting' in your own <code>bidderSettings</code> object, the <code>setPriceGranularity</code> method won't have any effect, since it assumes you are setting your own custom values.
  </p>
</div>

##### 2.1. alwaysUseBid

By default, only the winning bid (with the highest cpm) will be sent to the ad server.
However, if you're working with a Prebid partner that's not returning a CPM value, it
won't be able to compete against the other bids. One option is to use [enableSendAllBids()](publisher-api-reference.html#module_pbjs.enableSendAllBids). But if you want to send the highest CPM
bid along with all non-CPM bids, just specify this flag and the adapter-specific adserverTargeting object will always be sent to the ad server.

##### 2.2. adserverTargeting

As described in the [AdOps documentation]({{site.baseurl}}/adops.html), Prebid has a recommended standard
set of ad server targeting that works across bidders. This standard targeting approach is
defined in the adserverTargeting attribute in the 'standard' section, but can be overridden
per adapter as needed. Both scenarios are described below.

**Keyword targeting for all bidders**

The below code snippet is the *default* setting for ad server targeting. For each bidder's bid, Prebid.js will set 4 keys (`hb_bidder`, `hb_adid`, `hb_pb`, `hb_size`) with their corresponding values. The key value pair targeting is applied to the bid's corresponding ad unit. Your ad ops team will have the ad server's line items target these keys.

If you'd like to customize the key value pairs, you can overwrite the settings as the below example shows. *Note* that once you updated the settings, let your ad ops team know about the change, so they can update the line item targeting accordingly. See the [Ad Ops](../adops.html) documentation for more information.

<a name="bidderSettingsDefault"></a>
<a name="default-keywords">

There's no need to include the following code if you choose to use the *below default setting*.

{% highlight js %}

pbjs.bidderSettings = {
    standard: {
        alwaysUseBid: false,
        adserverTargeting: [{
            key: "hb_bidder",
            val: function(bidResponse) {
                return bidResponse.bidderCode;
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
            key: 'hb_size',
            val: function (bidResponse) {
                return bidResponse.size;
            }
        }]
    }
}

{% endhighlight %}

<a name="key-targeting-specific-bidder"></a>
**Keyword targeting for a specific bidder**

Let’s say the bidder prefers a separate set of line items. You can overwrite the bidder
settings as the below example for AppNexus shows.

*Note that the line item setup has to match the targeting change*

{% highlight js %}
pbjs.bidderSettings = {
    appnexus: {
      sendStandardTargeting: false,
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


In other words, the above config sends 2 pairs of key/value strings targeting for every AppNexus bid and for every ad unit. The 1st pair would be `apn_pbMg` => the value of `bidResponse.pbMg`. The 2nd pair would be `apn_adId` => the value of `bidResponse.adId`. You can find the documentation of bidResponse object [here](bidders.html#common-bidresponse).

Note that sendStandardTargeting is set to false so that the standard Prebid targeting (hb_bidder, etc.) aren't also sent to the ad server.

**Price Buckets**

Now let's say you would like to define you own price bucket function rather than use the ones available by default in prebid.js. You can overwrite the bidder settings as the below example shows:

*Note: this will only impact the price bucket sent to the ad server for targeting. It won't actually impact the cpm value used for ordering the bids.*


{% highlight js %}

pbjs.bidderSettings = {
    standard: {
        [...]
        {
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
        }
	[...]
    }
}

{% endhighlight %}


##### 2.3. bidCpmAdjustment

Some bidders return gross prices instead of the net prices (what the publisher will actually
get paid). For example, a publisher's net price might be 15% below the returned gross price.
In this case, the publisher may want to adjust the bidder's returned price to run a true
header bidding auction. Otherwise, this bidder's gross price will unfairly win over your
other demand sources who report the real price.

{% highlight js %}

pbjs.bidderSettings = {
  standard: { ... }
  aol: {
    bidCpmAdjustment : function(bidCpm, bid){
      // adjust the bid in real time before the auction takes place
      console.log('Bidder is: ' + bid.bidderCode);
      return bidCpm * .85;
    }
  }
};

{% endhighlight %}

In the above example, the AOL bidder will inherit from "standard" adserverTargeting keys, so that you don't have to define the targeting keywords again.


##### 2.4. sendStandardTargeting

This boolean flag minimizes key/value pairs sent to the ad server when
adapter-specific targeting is specified. By default, the platform will send both adapter-specific adServerTargeting as well as the standard adServerTargeting.

While sending extra targeting the ad server may not matter, this flag can be used to
suppress the standard targeting for adapters that define their own.

See the [example above](#key-targeting-specific-bidder) for example usage.

##### 2.5. suppressEmptyKeys

If a custom adServerTargeting function can return an empty value, this boolean flag can be used to avoid sending those empty values to the ad server.

<hr class="full-rule">

<a name="module_pbjs.userSync"></a>

### UserSync

UserSync configuration allows Publishers to control how adapters behave with respect to dropping pixels or scripts to cookie users with IDs.
This practice is called 'userSync' because the aim is to let the bidders match IDs between their cookie space and the DSP cookie space.
There's a good reason for bidders to be doing this -- DSPs are more likely to bid on impressions where they know something about the history of a user.
However, there are also good reasons why Publishers may want to control the use of these practices:

* page performance - Publishers may wish to move ad-related cookie work to much later in the page load after ads and content have loaded.
* user privacy - Some publishers may want to opt out of these practices even though it limits their user's values on the open market.
* security - Publishers may want to control which bidders are trusted to inject images and javascript into their pages.

The default behavior of the platform is to allow every adapter to drop up to 5 image-based user syncs. The sync images will be dropped 3 seconds after the auction starts. Here are some examples of config that will change the default behavior.

Push the user syncs to later in the page load:
{% highlight js %}
pbjs.setConfig({ userSync: {
    syncDelay: 5000       // write image pixels 5 seconds after the auction
}});
{% endhighlight %}

Turn off userSync entirely:
{% highlight js %}
pbjs.setConfig({ userSync: {
    syncEnabled: false
}});
{% endhighlight %}

Allow iframe-based syncs:
{% highlight js %}
pbjs.setConfig({ userSync: {
    iframeEnabled: true
}});
{% endhighlight %}

Only certain adapters are allowed to sync, either images or iframes:
{% highlight js %}
pbjs.setConfig({ userSync: {
    enabledBidders: ['abc','xyz'], // only these bidders are allowed to sync
    iframeEnabled: true,
    syncsPerBidder: 3,            // and no more than 3 syncs at a time
    syncDelay: 6000,              // 6 seconds after the auction
}});
{% endhighlight %}

The same bidders can drop sync pixels, but the timing will be controlled by the page:
{% highlight js %}
pbjs.setConfig({ userSync: {
    enabledBidders: ['abc','xyz'], // only these bidders are allowed to sync, and only image pixels
    enableOverride: true          // publisher will call pbjs.triggerUserSyncs()
}});
{% endhighlight %}

Here are all the options for userSync control:

{: .table .table-bordered .table-striped }
| Attribute | Type | Description |
| --- | --- | --- |
| syncEnabled | boolean | Enables/disables the userSync feature. Defaults to true. |
| iframeEnabled | boolean | Enables/disables the use of iframes for syncing. Defaults to false. |
| syncDelay | integer | The delay in milliseconds for autosyncing once the first auction is run. 3000 by default. |
| syncsPerBidder | integer | Number of registered syncs allowed per adapter. Default is 5. Set to 0 to allow all. |
| enabledBidders | array | Array of names of trusted adapters which are allowed to sync users. |
| enableOverride | boolean | Allows the publisher to manually trigger the user syncs to fire by calling pbjs.triggerUserSyncs(). |

As noted, there's a function available to give the page control of when registered userSyncs are added.
{% highlight js %}
pbjs.triggerUserSyncs()
{% endhighlight %}

#### How it works

The [userSync.registerSync()]({{site.baseurl}}/dev-docs/bidder-adaptor.html#step-6-register-user-sync-pixels) function called by the adapter keeps a queue of valid userSync requests. It prevents unwanted sync entries from being placed on the queue:

* Removes undesired sync types. (i.e. enforces the iframeEnabled flag)
* Removes undesired adapter registrations. (i.e. enforces the enabledBidders option)
* Makes sure there's not too many queue entries from a given adapter. (i.e. enforces syncsPerBidder)

When user syncs are run, regardless of whether they are invoked by the platform or by the page calling pbjs.triggerUserSyncs(), the queue entries are randomized and appended to the bottom of the HTML head tag. If there's no head tag, then they're appended to the end of the body tag.

<hr class="full-rule">

<a name="module_pbjs.addCallback"></a>

### pbjs.addCallback(event, func) ⇒ `String`

{: .alert.alert-danger :}
This method is deprecated and will be removed in version 1.0 (scheduled for release Q4 2017).  Please use [`onEvent`](#module_pbjs.onEvent) or [`offEvent`](#module_pbjs.onEvent) instead.

Add a callback event

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `String` - id for callback

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| event | `String` | event to attach callback to Options: `adUnitBidsBack` |
| func | `function` | function to execute. Parameters passed into the function: ((bidResObj&#124;bidResArr), [adUnitCode]); |

<hr class="full-rule">

<a name="module_pbjs.removeCallback"></a>

### pbjs.removeCallback(cbId) ⇒ `String`

{: .alert.alert-danger :}
This method is deprecated and will be removed in version 1.0 (scheduled for release Q4 2017).  Please use [`onEvent`](#module_pbjs.onEvent) or [`offEvent`](#module_pbjs.onEvent) instead.

Remove a callback event

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `String` - id for callback

{: .table .table-bordered .table-striped }
| Param | Type | Description |
| --- | --- | --- |
| cbId | `string` | id of the callback to remove |

<hr class="full-rule" />

<a name="module_pbjs.buildMasterVideoTagFromAdserverTag"></a>

### pbjs.buildMasterVideoTagFromAdserverTag(adserverTag, options) ⇒ `String`

{: .alert.alert-danger :}
This method is deprecated as of version [0.26.0](https://github.com/prebid/Prebid.js/releases/tag/0.26.0) and will be removed in version 1.0 (scheduled for release Q4 2017).  Please use [`pbjs.adServers.dfp.buildVideoUrl`](#module_pbjs.adServers.dfp.buildVideoUrl) instead.

**Kind**: static method of [pbjs](#module_pbjs)

**Returns**: `String` - Video ad tag

{: .table .table-bordered .table-striped }
| Param       | Type     | Description                                        |
| ---         | ---      | ---                                                |
| adserverTag | `String` | Ad tag for your video ad server.                   |
| options     | `Object` | Object describing the ad server and video ad code. |

For example, if you're using DFP, your `adserverTag` might be
something like this example taken from the
[DFP help page on master video tags](https://support.google.com/dfp_premium/answer/1068325):

```
http://pubads.g.doubleclick.net/gampad/ads?env=vp&gdfp_req=1&impl=s&output=vast&iu=/6062/video-demo&sz=400x300&unviewed_position_start=1&url=http://www.simplevideoad.com&ciu_szs=728x90,300x250&correlator=7105
```

While your `options` object might look something like:

```javascript
var options = {
  'adserver': 'dfp',
  'code': 'video1' // Must match the `code` of the video adUnit declared elsewhere
};
```

For an example showing how to use this method, see [Show Video Ads with a DFP Video Tag]({{site.github.url}}/dev-docs/show-video-with-a-dfp-video-tag.html).

<hr class="full-rule" />

<a name="module_pbjs.setBidderSequence"></a>

### pbjs.setBidderSequence(order)

{: .alert.alert-danger :}
This method is deprecated as of version 0.27.0 and will be removed in version 1.0 (scheduled for release Q4 2017).  Please use [`setConfig`](#module_pbjs.setConfig) instead.

{: .alert.alert-danger :}
**BREAKING CHANGE**  
As of version 0.27.0, To encourage fairer auctions, Prebid will randomize the order bidders are called by default. To replicate legacy behavior, call `pbjs.setBidderSequence('fixed')`.

This method shuffles the order in which bidders are called.

It takes an argument `order` that currently accepts the following strings:

- `"random"`: shuffle the sequence bidders are called in
- `"fixed"`: bidders are called in the order they are defined within the `adUnit.bids` array on page

Example use:

```javascript
pbjs.setBidderSequence('fixed'); /* defaults to 'random' as of 0.27.0 */
```

<a name="module_pbjs.onEvent"></a>

<p>
</p>

### pbjs.onEvent(event, handler, id)

**pbjs.offEvent(event, handler, id)**

The methods `onEvent` and `offEvent` are provided for you to register
a callback to handle a Prebid.js event.

They replace the following deprecated methods:

- [.addCallback(event, func)](#module_pbjs.addCallback)
- [.removeCallback(cbId)](#module_pbjs.removeCallback)

The optional `id` parameter provides more finely-grained event
callback registration.  This makes it possible to register callback
events for a specific item in the event context.

For example, `bidWon` events will accept an `id` for ad unit code.
`bidWon` callbacks registered with an ad unit code id will be called
when a bid for that ad unit code wins the auction. Without an `id`
this method registers the callback for every `bidWon` event.

{: .alert.alert-info :}
Currently, `bidWon` is the only event that accepts the `id` parameter.

The available events are:

{: .table .table-bordered .table-striped }
| Event         | Description                            |
|---------------+----------------------------------------|
| auctionInit   | The auction has started                |
| auctionEnd    | The auction has ended                  |
| bidAdjustment | A bid was adjusted                     |
| bidTimeout    | A bid timed out                        |
| bidRequested  | A bid was requested                    |
| bidResponse   | A bid response has arrived             |
| bidWon        | A bid has won                          |
| setTargeting  | Targeting has been set                 |
| requestBids   | Bids have been requested from adapters |

The example below shows how to use these methods:

{% highlight js %}

        /* Define your event handler callbacks */
        var allSlotsBidWon = function allSlotsBidWon() {
            console.log('allSlotsBidWon called');
        };

        /* In this event handler callback we use the `pbjs.offEvent`
           method to remove the handler once it has been called */
        var rightSlotBidWon = function rightSlotBidWon() {
            console.log('rightSlotBidWon: ', arguments);
            pbjs.offEvent('bidWon', rightSlotBidWon, rightSlotCode);
        };

        googletag.cmd.push(function () {

            /* Ad slots need to be defined before trying to register
               callbacks on their events */

            var rightSlot =
              googletag.defineSlot(rightSlotCode, rightSlotSizes, rightSlotElementId).addService(googletag.pubads());

            var topSlot =
              googletag.defineSlot(topSlotCode, topSlotSizes, topSlotElementId).setTargeting().addService(googletag.pubads());

            pbjs.que.push(function () {

                /* Register a callback for every `bidWon` event */
                pbjs.onEvent('bidWon', allSlotsBidWon);

                /* Register a callback for just the rightSlot `bidWon`
                   event */
                pbjs.onEvent('bidWon', rightSlotBidWon, rightSlotCode);

                pbjs.setTargetingForGPTAsync();
                ...

{% endhighlight %}

<a name="module_pbjs.enableAnalytics"></a>

### pbjs.enableAnalytics(config)

Enable sending analytics data to the analytics provider of your choice.

For usage, see [Integrate with the Prebid Analytics API]({{site.baseurl}}/dev-docs/integrate-with-the-prebid-analytics-api.html).

For a list of analytics adapters, see [Analytics for Prebid]({{site.baseurl}}/overview/analytics.html).

<a name="module_pbjs.aliasBidder"></a>

### pbjs.aliasBidder(adapterName, aliasedName)

To define an alias for a bidder adapter, call this method at runtime:

{% highlight js %}

pbjs.aliasBidder('appnexusAst', 'newAlias');

{% endhighlight %}

Defining an alias can help avoid user confusion since it's possible to send parameters to the same adapter but in different contexts (e.g, The publisher uses `"appnexusAst"` for demand and also uses `"newAlias"` which is an SSP partner that uses the `"appnexusAst"` adapter to serve their own unique demand).

It's not technically necessary to define an alias, since each copy of an adapter with the same name gets a different ID in the internal bidder registry so Prebid.js can still tell them apart.

If you define an alias and are using `pbjs.sendAllBids`, you must also set up additional line items in the ad server with keyword targeting that matches the name of the alias.  For example:

+ `hb_pb_newalias`
+ `hb_adid_newalias`
+ `hb_size_newalias`
+ `hb_deal_newalias`

<a name="module_pbjs.setConfig"></a>

### pbjs.setConfig(options)

{: .alert.alert-info :}
Added in version 0.27.0

`setConfig` is designed to allow for advanced configuration while reducing the surface area of the public API.  For more information about the move to `setConfig` (and the resulting deprecations of some other public methods), see [the Prebid 1.0 public API proposal](https://gist.github.com/mkendall07/51ee5f6b9f2df01a89162cf6de7fe5b6).

See below for usage examples.

{: .alert.alert-warning :}
The `options` param object must be JSON - no JavaScript functions are allowed.

Turn on debugging:

{% highlight js %}
pbjs.setConfig({ debug: true });
{% endhighlight %}

Set a global bidder timeout:

{% highlight js %}
pbjs.setConfig({ bidderTimeout: 3000 });
{% endhighlight %}

{: .alert.alert-warning :}
**Bid Timeouts and JavaScript Timers**  
Note that it's possible for the timeout to be triggered later than expected, leading to a bid participating in the auction later than expected.  This is due to how [`setTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout) works in JS: it queues the callback in the event loop in an approximate location that *should* execute after this time but *it is not guaranteed*.  
With a busy page load, bids can be included in the auction even if the time to respond is greater than the timeout set by Prebid.js.  However, we do close the auction immediately if the threshold is greater than 200ms, so you should see a drop off after that period.  
For more information about the asynchronous event loop and `setTimeout`, see [How JavaScript Timers Work](https://johnresig.com/blog/how-javascript-timers-work/).

Turn on enable send all bids mode:

{% highlight js %}
pbjs.setConfig({ enableSendAllBids: true })
{% endhighlight %}

Set the order in which bidders are called:

{% highlight js %}
pbjs.setConfig({ bidderSequence: "fixed" })   /* default is "random" as of 0.27.0 */
{% endhighlight %}

Set the publisher's domain where Prebid is running, for cross-domain iFrame communication:

{% highlight js %}
pbjs.setConfig({ publisherDomain: "https://www.theverge.com" )
{% endhighlight %}

Set a delay (in milliseconds) for requesting cookie sync to stay out of the critical path of page load:

{% highlight js %}
pbjs.setConfig({ cookieSyncDelay: 100 )
{% endhighlight %}

Set a default price granularity scheme:

{% highlight js %}
pbjs.setConfig({ priceGranularity: "medium" })
{% endhighlight %}

{: .alert.alert-info :}
Note that the allowed values for `priceGranularity` have not changed: string values, or the custom CPM bucket object.

Set a custom price granularity scheme:

{% highlight js %}
const customGranularity = {
  'buckets': [{
      'min': 0,
      'max': 3,
      'increment': 0.01
  }]
};

pbjs.setConfig({
    priceGranularity: customGranularity
})
{% endhighlight %}

Set config for [server-to-server]({{site.baseurl}}/dev-docs/get-started-with-prebid-server.html) header bidding:

{% highlight js %}
pbjs.setConfig({
    s2sConfig: {
        accountId: '1',
        enabled: true,
        bidders: ['appnexus', 'pubmatic'],
        timeout: 1000,
        adapter: 'prebidServer',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
    }
})
{% endhighlight %}

Set arbitrary configuration values:

`pbjs.setConfig({ <key>: <value> });`

#### Troubleshooting your configuration

If you call `pbjs.setConfig` without an object, e.g.,

{% highlight js %}
pbjs.setConfig('debug', 'true'))
{% endhighlight %}

then Prebid.js will print an error to the console that says:

```
ERROR: setConfig options must be an object
```

If you don't see that message, you can assume the config object is valid.

<a name="module_pbjs.getConfig"></a>

### pbjs.getConfig([string])

{: .alert.alert-info :}
Added in version 0.27.0

The `getConfig` function is for retrieving the current configuration object or subscribing to configuration updates. When called with no parameters, the entire config object is returned. When called with a string parameter, a single configuration property matching that parameter is returned.

{% highlight js %}
/* Get config object */
config.getConfig()

/* Get debug config */
config.getConfig('debug')
{% endhighlight %}

The `getConfig` function also contains a 'subscribe' ability that adds a callback function to a set of listeners that are invoked whenever `setConfig` is called. The subscribed function will be passed the options object that was used in the `setConfig` call. Individual topics can be subscribed to by passing a string as the first parameter and a callback function as the second.  For example:

{% highlight js %}

/* Subscribe to all configuration changes */
getConfig((config) => console.log('config set:', config));

/* Subscribe to only 'logging' changes */
getConfig('logging', (config) => console.log('logging set:', config));

/* Unsubscribe */
const unsubscribe = getConfig(...);
unsubscribe(); // no longer listening

{% endhighlight %}

<a name="module_pbjs.adServers.dfp.buildVideoUrl"></a>

### pbjs.adServers.dfp.buildVideoUrl(options) ⇒ `String`

{: .alert.alert-info :}
This method was added in 0.26.0.  For a usage example and instructions showing how to build Prebid.js to include this method, see [Show Video Ads with DFP]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html).

This method returns a DFP video ad tag URL which is built by combining publisher-provided URL parameters with Prebid.js key-values.

This method takes a single `options` object as an argument, described below:

{: .table .table-bordered .table-striped }
| Field  | Type   | Description                                                                                                                                     |
|--------|--------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| adUnit | object | (Required) The Prebid adUnit to which the returned URL will map.                                                                                |
| bid    | object | (Optional) The Prebid bid for which targeting will be set. If this is not defined, Prebid will use the bid with the highest CPM for the adUnit. |
| params | object | (Required) Querystring parameters that will be used to construct the DFP video ad tag URL.                                                      |

The `options.params` object is described below:

{: .table .table-bordered .table-striped }
| Field          | Type   | Description                                                                                                                                                                                                                                                                                                          | Example                                       |
|----------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| iu             | string | (Required) DFP adUnit ID.  For more information, see the [DFP documentation on `iu`](https://support.google.com/dfp_premium/answer/1068325?hl=en#iu)                                                                                                                                                                 | `/19968336/prebid_cache_video_adunit`         |
| cust_params    | object | (Optional) Key-value pairs that will be sent to DFP on the video ad tag URL.  If present, any key-values here will be merged with Prebid standard targeting key-values.  For more information, see the [DFP documentation on `cust_params`](https://support.google.com/dfp_premium/answer/1068325?hl=en#cust_params) | {section: "blog", anotherKey: "anotherValue"} |
| "arbitraryKey" | string | (Optional) Any additional querystring parameters that will be used to construct the DFP video ad tag URL.                                                                                                                                                                                                            | `output: "vast"`                              |

{: .alert.alert-info :}
Note: Prebid.js will choose reasonable default values for any required DFP URL parameters that are not included in the `options.params` object.

For more information about the options supported by the DFP API, see [the DFP API docs](https://support.google.com/dfp_premium/answer/1068325?hl=en#env).

#### Example Usage

For a usage example in context, see [Show Video Ads with DFP]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html).

```javascript
pbjs.requestBids({
    bidsBackHandler: function(bids) {
        var videoUrl = pbjs.adServers.dfp.buildVideoUrl({
            adUnit: videoAdUnit,
            params: {
                iu: '/19968336/prebid_cache_video_adunit',
                cust_params: {
                  section: "blog",
                  anotherKey: "anotherValue"
                },
                hl: "en",
                output: "vast",
                url: "http://www.referer-url.com"
            }
        });
        invokeVideoPlayer(videoUrl);
    }
});
```

This call returns the following DFP video ad tag URL:

```
https://pubads.g.doubleclick.net/gampad/ads?env=vp&gdfp_req=1&output=vast&unviewed_position_start=1&correlator=1507127916397&sz=640x480&url=http://www.referer-url.com&iu=/19968336/prebid_cache_video_adunit&cust_params=hb_bidder%3DappnexusAst%26hb_adid%3D26d4996ee83709%26hb_pb%3D10.00%26hb_size%3D640x480%26hb_uuid%3D16c887cf-9986-4cb2-a02f-8e9bd025f875%26section%3Dblog%26anotherKey%3DanotherValue&hl=en
```

</div>
