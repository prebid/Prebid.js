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

For each bidder listed below, you'll find the following information:

{: .table .table-bordered .table-striped }
| **Bidder Code**                     | The unique code Prebid.js uses to identify the bidder                                                                                         |
| **"Send All Bids" Ad Server Keys**  | Used for sending all bids to the ad server, as described in [Send All Bids to the Ad Server]({{site.baseurl}}/adops/send-all-bids-adops.html) |
| **"Default Deal ID" Ad Server Key** | Used for enabling deals using Prebid.js, as described in [Enable Deals in Prebid]({{site.baseurl}}/adops/deals.html)                          |
| **Bid Params**                      | Ad request parameters required by a given bidder, such as the tag ID, site ID, or query string parameters                                     |

In addition to the bidder-specific parameters, there are <a href="#common-bidresponse">common parameters</a> that appear in all bid responses.

For information about which bidders support video and native demand, see <a href="#bidder-video-native">this list of bidders with video and native demand</a>.

{% assign bidder_pages = site.pages | where: "layout", "bidder" %}

- [Bidders](#bidders)
- [Common Bid Response Parameters](#common-bid-response-parameters)
- [Bidders with Video and Native Demand](#bidders-with-video-and-native-demand)
- [Bidders integrated with Prebid Server](#prebid-server-bidders)

## Bidders

<ul>
{% for page in bidder_pages %}
<li>
<a href="#{{ page.biddercode }}">{{ page.title }}</a>
</li>
{% endfor %}
</ul>

</div>

<div class="bs-docs-section" markdown="1">

<a name="common-bidresponse"></a>

## Common Bid Response Parameters
{: .no_toc }

The following parameters in the `bidResponse` object are common across all bidders.

{: .table .table-bordered .table-striped }
| Name     | Type    | Description                                                                                                                                                       | Example                                                                 |
|----------+---------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------|
| `bidder` | String  | Unique bidder code used by ad server's line items to identify the bidder                                                                                          | `"appnexus"`                                                            |
| `adId`   | String  | Unique identifier of a bid creative. Used by the line item's creative as in [this example]({{site.baseurl}}/adops/send-all-bids-adops.html#step-3-add-a-creative) | `"123"`                                                                 |
| `pbLg`   | String  | Low granularity price bucket: $0.50 increment, capped at $5, floored to 2 decimal places (0.50, 1.00, 1.50, ..., 5.00)                                            | `"1.50"`                                                                |
| `pbMg`   | String  | Medium granularity price bucket: 0.10 increment, capped at $20, floored to 2 decimal places (0.10, 0.20, ..., 19.90, 20.00)                                       | `"1.60"`                                                                |
| `pbHg`   | String  | High granularity price bucket: 0.01 increment, capped at $20, floored to 2 decimal places (0.01, 0.02, ..., 19.99, 20.00)                                         | `"1.61"`                                                                |
| `size`   | String  | Size of the bid creative; concatenation of width and height by 'x'                                                                                                | `"300x250"`                                                             |
| `width`  | Integer | Width of the bid creative in pixels                                                                                                                               | `300`                                                                   |
| `height` | Integer | Height of the bid creative in pixels                                                                                                                              | `250`                                                                   |
| `adTag`  | String  | Creative's payload in HTML                                                                                                                                        | `"<html><body><img src=\"http://cdn.com/creative.png\"></body></html>"` |

<a name="bidders-with-video-and-native-demand"></a>
<a name="bidder-video-native"></a>

## Bidders with Video and Native Demand
{: .no_toc }

{% assign bidder_pages = site.pages | where: "layout", "bidder" %}
<table class="table table-bordered table-striped">
<thead><tr>
<th>Bidder</th>
<th>Supported Media Types</th>
<th> Prebid 1.0 Support?</th>
</tr></thead>
<tbody>
{% for page in bidder_pages %}
{% if page.media_types %}
<tr><td> {{page.biddercode}} </td><td> {% if page.media_types contains 'video' and page.media_types contains 'native' %} video, native {% elsif page.media_types contains 'native' %} native {% elsif page.media_types contains 'video' %} video {% endif %} </td><td> {% if page.prebid_1_0_supported %}X{% endif %} </td></tr>
{% endif %}
{% endfor %}
</tbody>
</table>

<a name="prebid-server-bidders"></a>

## Bidders integrated with Prebid Server
{: .no_toc }

Demand from the bidders listed below is available via the [Prebid Server integration]({{site.baseurl}}/dev-docs/get-started-with-prebid-server.html).

- [appnexus](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L740)
- [districtm](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L741)
- [indexExchange](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L742)
- [pubmatic](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L743)
- [pulsepoint](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L744)
- [rubicon](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L745)
- [lifestreet](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L748)
- [conversant](https://github.com/prebid/prebid-server/blob/master/pbs_light.go#L749)
</div>

{% for page in bidder_pages %}

<div class="bs-docs-section" markdown="1">
<h2><a name="{{ page.biddercode }}" >{{ page.title }}</a></h2>

{% if page.s2s_only == true %}  
<h3>Note:</h3> This is a S2S adapter only.
{% endif %}

<h3>Bidder Code</h3>

<code>{{ page.biddercode }}</code>

{% if page.biddercode_longer_than_12 != true %}

<h3>"Send All Bids" Ad Server Keys</h3>

<code>hb_pb_{{ page.biddercode }}</code>
<code>hb_adid_{{ page.biddercode }}</code>
<code>hb_size_{{ page.biddercode }}</code>

{% endif %}

{% if page.bidder_supports_deals != false %}

<h3>"Default Deal ID" Ad Server Key</h3>

<code>hb_deal_{{ page.biddercode }}</code>

{% endif %}

{{ page.content }}

</div>

{% endfor %}
