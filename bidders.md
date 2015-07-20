---
layout: default
title: Bidders
description: Documentation on bidders
pid: 2
isHome: false
---

<div class="bs-docs-section" markdown="1">
#Common

<a name="common-bidresponse"></a>

###bidResponse
These parameters in the bidReponse object are common across all bidders. Some may not be available for certain bidders and they're marked for each bidder:

{: .table .table-bordered .table-striped }
| Name | Type | Description | Example |
| :--- | :---- | :---------- | :------ |
| `cpm` |	Float |	The bid price in the currency's unit amount. For example, 1.2 in USD would be 1 dollar and 20 cents ($1.20). |	1.2 |
| `adTag` | String | The creative's payload in HTML | `<html><body><img src="http://cdn.com/creative.png"></body></html>` |
| `width` |	Integer |	The width of the bid creative in pixels. |	300 |
| `height` |	Integer |	The height of the bid creative in pixels. |	250 |
| `dealId` |	String |	The Deal ID. |	"827372323" |

</div>

<div class="bs-docs-section" markdown="1">
#AppNexus

###bidder code: 
`appnexus`

###bidId

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `tagId` | required | The placement ID from AppNexus. | "234234" |
| `invCode` | optional | The inventory code you set up in a placement. Has to be used together with memberId. | "code234234" |
| `memberId` | optional | Your member ID in AppNexus. Only useful to be used together with invCode. | "123" |

<a href="appnexus-bidresponse"></a>

###bidResponse

{: .table .table-bordered .table-striped }
| Name | Type | Description | Example |
| :--- | :---- | :---------- | :------ |
| `adId` |	String |	The unique identifier of a bid's creative. It's used by the line item's creative. |	"234235_746323" |
| `keyLg` |	String |	A concatenated key showing the ad size and a "low granularity" CPM at $0.50 increments. |	"300x250p1.50" |
| `keyMg` |	String |	A concatenated key showing the ad size and "medium granularity" CPM at $0.10 increments. |	"728x90p1.90" |
| `keyHg` |	String |	A concatenated key showing the ad size and "high granularity" CPM at $0.01 increments. |	"468x60p1.59" |
| `adUrl` |	String |	The creative URL. Mime type is text/html. Can be rendered in an iFrame. |	"http://nym1.b.adnxs.com/ab?e=wqT..." |
| `cpm` |	Float |	Supported. [Reference](#common-bidresponse) |	 |
| `adTag` | String |	Supported. [Reference](#common-bidresponse) |	 |
| `width` |	Integer |	Supported. [Reference](#common-bidresponse) |	 |
| `height` |	Integer |	Supported. [Reference](#common-bidresponse) |	 |
| `dealId` |	String |	Supported. [Reference](#common-bidresponse) |	 |


###Line item setup
Depending on what granularity of keys you have chosen from `keyLg`, `keyMg`, `keyHg`, set up the corresponding line items:

* `keyLg`: 20 line items per size at $0.50 increment. For example: 
* `keyMg`: 100 line items per size at $0.10 increment. For example: 
* `keyHg`: 1000 line items per size at $0.01 increment. For example: 

###Creative setup
In your adserver, for each size, you can have a 3rd party tag creative with the below content. The value passed into apn_adid will be what pbjs.renderAd() will use to identify the creative. 

{% highlight js %}
<script type="text/JavaScript">
    try{ window.top.pbjs.renderAd(document, '%%PATTERN:apn_adid%%'); } catch(e) {/*ignore*/}
</script>
{% endhighlight %}

</div>

<div class="bs-docs-section" markdown="1">
#Amazon
</div>

<div class="bs-docs-section" markdown="1">
#Criteo
</div>

<div class="bs-docs-section" markdown="1">
#OpenX
</div>

<div class="bs-docs-section" markdown="1">
#Pubmatic
</div>

<div class="bs-docs-section" markdown="1">
#Rubicon
</div>