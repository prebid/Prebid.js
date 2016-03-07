---
layout: page
title: Bidders' Params
description: Documentation on bidders' params
pid: 21

top_nav_section: dev_docs
nav_section: reference

---

<div class="bs-docs-section" markdown="1">

# Summary

In this page, you can find the below information:

* bidder code: this is the code prebid.js uses to identify bidders.
* bid params: ad request parameters for a bidder. For example, tag Id, site ID, query string parameters. Your page should fill out the required bid params for a bidder to succesfully get a bid back.
* bidder specific bidResponse: in addition to
* Caveats: every bidder is different. In addition to the standardized bidResponse object we propose, there might be caveats that you should know about.

</div>

<div class="bs-docs-section" markdown="1">

# Common

<a name="common-bidresponse"></a>

### bidResponse

These parameters in the bidReponse object are common across all bidders.


{: .table .table-bordered .table-striped }
|   Name |   Type | Description | Example
| :----  |:--------| :-------| :-------|
| `bidder` | String | The bidder code. Used by ad server's line items to identify bidders | `appnexus` |
| `adId` | String |  The unique identifier of a bid creative. It's used by the line item's creative as in [this example](adops.html#creative-setup). | `123` |
| `pbLg` | String | The low granularity price bucket at 0.50 increment, capped at $5, floored to 2 decimal places. (0.50, 1.00, 1.50, ..., 5.00) | `1.50` |
| `pbMg` | String | The medium granularity price bucket at 0.10 increment, capped at $20, floored to 2 decimal places. (0.10, 0.20, ..., 19.90, 20.00) | `1.60` |
| `pbHg` | String | The high granularity price bucket at 0.01 increment, capped at $20, floored to 2 decimal places. (0.01, 0.02, ..., 19.99, 20.00) | `1.61` |
| `size` | String | The size of the bid creative. Concatenation of width and height by 'x'. | `300x250` |
| `width` |	Integer |	The width of the bid creative in pixels. |	300 |
| `height` |	Integer |	The height of the bid creative in pixels. |	250 |
| `adTag` | String | The creative's payload in HTML | `<html><body><img src="http://cdn.com/creative.png"></body></html>` |

</div>

<div class="bs-docs-section" markdown="1">

# AOL

### bidder code:

`aol`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placement` | required | The placement ID from AOL. | "23324932" |
| `network` | required | The network ID from AOL. | |
| `sizeId` | optional | The size ID from AOL. | "170" |
| `alias` | optional | The placement alias from AOL. | "desktop_articlepage_something_box_300_250" |

(The first of the `sizes` set in `adUnit` object will also apply to the AOL bid requests.)


</div>

<div class="bs-docs-section" markdown="1">

# AppNexus

### bidder code:

`appnexus`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placementId` | required | The placement ID from AppNexus. | "234234" |
| `randomKey` | optional | a random key specified by the publisher to send into AppNexus. The value is a publisher specified value. These values map to querystring segments for enhanced targeting on the buy side. Multiple key value pairs can be added here. | `randomKey` => `randomVal`. |
| `invCode` | optional | The inventory code from AppNexus. Must be used with `member` | "abc123" |
| `member` | optional | The member ID  from AppNexus. Must be used with `invCode` | "12345" |

(Sizes set in `adUnit` object will also apply to the AppNexus bid requests.)


</div>

<!--
<div class="bs-docs-section" markdown="1">
#Amazon

###bidder code:
`amazon`

###bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `aid` | required | The site ID for Amazon. | "1234" |

###bidResponse (bidder specific)

{: .table .table-bordered .table-striped }
| Name | Type | Description | Example |
| :--- | :---- | :---------- | :------ |
| `keys` | Array of strings | Amazon's keys | `["a3x2p10", "a1x6p11"]` |

<a name="amazon-caveats"></a>

###Caveats

Prebid.js sends separate key-value targeting for Amazon, because only the obfuscated price is returned. Please follow Amazon's instructions to setup line items and creatives in your ad server.

 Just one `ad unit` is required for this bidder, unlike other bidders where you specify a configuration for each ad unit.

###Default bidder settings

{% highlight js %}
{
	adserverTargeting: [{
		key: "amznslots",
		val: function (bidResponse) {
			return bidResponse.keys;
		}
	}]
}

{% endhighlight %}


</div>

-->

<div class="bs-docs-section" markdown="1">

# Casale (Index)

### bidder code:

`indexExchange`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `id` | required | The placement ID |  |
| `siteID` | required | the site ID | |
| `tier2SiteID` | optional | | |
| `tier3SiteID` | optional | | |


<!-- | `slotId` | required | The slot id taken from casale javascript file. | "1" |
| `casaleUrl` | required | The javascript URL shared by Casale. | "//js.indexww.com/ht/mysite.js" |
 -->

</div>

<!--
<div class="bs-docs-section" markdown="1">

# Criteo

### bidder code:

`criteo`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `nid` | required | The nid from Criteo. | "1234" |
| `cookiename` | required | The cookie name for Criteo. | "ckn_pub" |
| `varname` | optional | The default is `crtg_content`. | "crtg_content" |

### Caveats

##### No price back

Criteo doesn't return the price back directly through their pre-bid API. Prebid.js still manages the ad call for you, but it will NOT auto set the targeting or returning the targeting parameters. Instead, what's inside `crtg_content` will be available in the window Javascript variable. You can continue to manage the `crtg_content` as Criteo's own documentation proposes. Note that the line items and creatives for Criteo will have to be separate too.

When Criteo supports bid price through their API, we will support Criteo in the same manner as the other bidders.

</div> -->

<div class="bs-docs-section" markdown="1">

# OpenX

### bidder code:

`openx`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `jstag_url` | required | The publisher specific URL of jstag | `ox-d.xyz.servedbyopenx.com/w/1.0/jstag?ef=db&nc=23923-EF` |
| `pgid` | required | The page ID | "534205285" |
| `unit` | required | the ad unit ID | "538562284" |


</div>

<div class="bs-docs-section" markdown="1">

# Pubmatic

### bidder code:

`pubmatic`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `publisherId` | required | The publisher ID | "32572" |
| `adSlot` | required | the unit ID | "38519891@300x250" |


</div>

<div class="bs-docs-section" markdown="1">

# Rubicon

### bidder code:

`rubicon`

### Note:
The Rubicon Fastlane adapter requires setup and approval from the Rubicon Project team, even for existing Rubicon Project publishers. Please reach out to your account team or globalsupport@rubiconproject.com for more information and to enable using this adapter.

### bid params

{: .table .table-bordered .table-striped }
| Name | Version | Scope | Description | Example |
| :--- | :------ | :---- | :---------- | :------ |
| `accountId` | 0.6.0 | required | The publisher account ID | `"4934"` |
| `siteId` | 0.6.0 | required | The site ID | `"13945"` |
| `zoneId` | 0.6.0 | required | The zone ID | `"23948"` |
| `sizes` | 0.6.0 | optional | Array of Rubicon Project size IDs. If not specified, the system will try to convert from bid.sizes. | `[15]` |
| `keywords` | 0.6.0 | optional | Array of page-specific keywords. May be referenced in Rubicon Project reports. | `["travel", "tourism"]` |
| `inventory` | 0.6.0 | optional | An object defining arbitrary key-value pairs concerning the page for use in targeting. | `{"rating":"5-star", "prodtype":"tech"}` |
| `visitor` | 0.6.0 | optional | An object defining arbitrary key-value pairs concerning the visitor for use in targeting. | `{"ucat":"new", "search":"iphone"}` |
| `userId` | 0.6.0 | optional | Site-specific user ID may be reflected back in creatives for analysis. Note that userId needs to be the same for all slots. | `"12345abc"` |
| `rp_account` | 0.5.0 | obsolete | Required in 0.5.0 and before, replaced by accountId. | `"4934"` |
| `rp_site` | 0.5.0 | obsolete | Required in 0.5.0 and before, replaced by siteId. | `"13945"` |
| `rp_zonesize` | 0.5.0 | obsolete | Required in 0.5.0 and before, replaced by zoneId and sizes. | `"23948-15"` |


</div>



<div class="bs-docs-section" markdown="1">

# Sovrn

### bidder code:

`sovrn`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `tagid` | required | The sovrn Ad Tag ID | "315045" |

</div>

<div class="bs-docs-section" markdown="1">

# Yieldbot

### bidder code:

`yieldbot`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `psn` | required | The publisher ID |  |
| `slot` | required | The slot |  |

</div>

<div class="bs-docs-section" markdown="1">

# PulsePoint

### bidder code:

`pulsepoint`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `cf` | required | Ad size identifier | `"300X250"` |
| `cp` | required | Publisher Id | `12345` |
| `ct` | required | Ad Tag Id | `12345` |

</div>

<div class="bs-docs-section" markdown="1">

# BRealTime

### bidder code:

`brealtime`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `placementId` | required | The placement ID from BRealTime | `"1234567"` |

</div>

<div class="bs-docs-section" markdown="1">

#  Adform

### bidder code:

`adform`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `mid` | required | | `12345` |
| `adxDomain` | optional | The Adform domain | `"adx.adform.net"` |

</div>

<div class="bs-docs-section" markdown="1">

#  SpringServe

### bidder code:

`springserve`

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `impId` | required | The impression ID | `12345` |
| `supplyPartnerId` | required | The supply partner ID | `1` |

</div>
