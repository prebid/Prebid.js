---
layout: page
title: Bidders' Params
description: Documentation on bidders' params
pid: 21

top_nav_section: dev_docs
nav_section: reference
---

<div class="bs-docs-section" markdown="1">

# Bidders' Params

This page contains documentation on the specific parameters required by each supported bidder.

For each bidder listed below, you'll find:

* **Bidder Code**: The unique code Prebid.js uses to identify the bidder
* **"Send All Bids" Ad Server Keys**: Used for sending all bids to the ad server, as described in [Send All Bids to Ad Server]({{site.github.io}}/blog/send-all-bids-to-adserver)
* **"Default Deal ID" Ad Server Key**: Used for enabling deals using Prebid.js, as described in [Enable Deals in Prebid]({{site.github.url}}/adops/deals.html)
* **Bid Params**: Ad request parameters required by a given bidder, such as the tag ID, site ID, or query string parameters.

In addition to the bidder-specific parameters, there are <a href="#common-bidresponse">common parameters</a> that appear in all bid responses.

{% assign bidder_pages = (site.pages | where: "layout", "bidder") %}

# Bidders

<ul>
{% for page in bidder_pages %}
<li><a href="#{{ page.biddercode }}">{{ page.title }}</a></li>
{% endfor %}
</ul>

</div>

<div class="bs-docs-section" markdown="1">

# Common

<a name="common-bidresponse"></a>

### bidResponse

These parameters in the `bidReponse` object are common across all bidders.


{: .table .table-bordered .table-striped }
|   Name |   Type | Description | Example
| :----  |:--------| :-------| :-------|
| `bidder` | String | The bidder code. Used by ad server's line items to identify bidders | `appnexus` |
| `adId` | String |  The unique identifier of a bid creative. It's used by the line item's creative as in [this example]({{site.github.url}}/adops/send-all-bids-adops.html#step-3-add-a-creative). | `123` |
| `pbLg` | String | The low granularity price bucket at 0.50 increment, capped at $5, floored to 2 decimal places. (0.50, 1.00, 1.50, ..., 5.00) | `1.50` |
| `pbMg` | String | The medium granularity price bucket at 0.10 increment, capped at $20, floored to 2 decimal places. (0.10, 0.20, ..., 19.90, 20.00) | `1.60` |
| `pbHg` | String | The high granularity price bucket at 0.01 increment, capped at $20, floored to 2 decimal places. (0.01, 0.02, ..., 19.99, 20.00) | `1.61` |
| `size` | String | The size of the bid creative. Concatenation of width and height by 'x'. | `300x250` |
| `width` |	Integer |	The width of the bid creative in pixels. |	300 |
| `height` |	Integer |	The height of the bid creative in pixels. |	250 |
| `adTag` | String | The creative's payload in HTML | `<html><body><img src="http://cdn.com/creative.png"></body></html>` |

</div>


{% for page in bidder_pages %}

<div class="bs-docs-section" markdown="1">

<h1><a name="{{ page.biddercode }}" />{{ page.title }}</h1>

<h3>bidder code:</h3>

<code>{{ page.biddercode }}</code>

{% if page.biddercode_longer_than_12 != true %}

<h4> Send All Bids Ad Server Keys: </h4>

<code>hb_pb_{{ page.biddercode }}</code>
<code>hb_adid_{{ page.biddercode }}</code>
<code>hb_size_{{ page.biddercode }}</code>

<h4> Default Deal ID Ad Server Key: </h4>
<code>hb_deal_{{ page.biddercode }}</code>

{% endif %}

{{ page.content }}
</div>

{% endfor %}
