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
  * [.getHighestCpmBids([adUnitCode])](#module_pbjs.getHighestCpmBids) ⇒ `Array`
  * [.setTargetingForGPTAsync([codeArr])](#module_pbjs.setTargetingForGPTAsync)
  * [.setTargetingForAst()](#module_pbjs.setTargetingForAst)
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
  * [.buildMasterVideoTagFromAdserverTag(adserverTag, options)](#module_pbjs.buildMasterVideoTagFromAdserverTag) ⇒ `String`
  * [.setBidderSequence(order)](#module_pbjs.setBidderSequence)

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

<a name="module_pbjs.setTargetingForGPTAsync"></a>

### pbjs.setTargetingForGPTAsync([codeArr])

Set query string targeting on all GPT ad units. The logic for deciding query strings is described in the section Configure AdServer Targeting. Note that this function has to be called after all ad units on page are defined.

**Kind**: static method of [pbjs](#module_pbjs)


{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description |
| --- | --- | --- | -- |
| [codeArr] | Optional | `array` | an array of adUnitodes to set targeting for. |

<hr class="full-rule">

<a name="module_pbjs.setTargetingForAst"></a>

### pbjs.setTargetingForAst()

Set query string targeting on all AST ([AppNexus Seller Tag](https://wiki.appnexus.com/x/JAUIBQ)) ad units.  Note that this function has to be called after all ad units on page are defined.  For working example code, see [Using Prebid.js with AppNexus Publisher Ad Server]({{site.github.url}}/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).

**Kind**: static method of [pbjs](#module_pbjs)

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
| requestObj.adUnitCodes | Optional | `Array of strings` | adUnit codes to request. Use this or requestObj.adUnits |
| requestObj.adUnits | Optional | `Array of objects` | AdUnitObjects to request. Use this or requestObj.adUnitCodes |
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
per adapter as needed. Both secenarios are described below.

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


In otherwords, the above config sends 2 pairs of key/value strings targeting for every AppNexus bid and for every ad unit. The 1st pair would be `apn_pbMg` => the value of `bidResponse.pbMg`. The 2nd pair would be `apn_adId` => the value of `bidResponse.adId`. You can find the documentation of bidResponse object [here](bidders.html#common-bidresponse).

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

<a name="module_pbjs.addCallback"></a>

### pbjs.addCallback(event, func) ⇒ `String`
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

This method shuffles the order in which bidders are called.

It takes an argument `order` that currently only accepts the string `"random"` to shuffle the sequence bidders are called in.

If the sequence is not set with this method, the bidders are called in the order they are defined within the `adUnit.bids` array on page, which is the current default.

Example use:

```javascript
pbjs.setBidderSequence('random');
```

</div>
