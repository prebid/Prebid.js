---
layout: example
title: Postbid Example
description: Postbid Example

top_nav_section: dev_docs
nav_section: quick-start

hide: true

why_link: /overview/what-is-post-bid.html

about: 
- Post-bid is a 3rd party tag creative you setup in your ad server. For each ad unit of your site, create one line item in DFP targeting that ad unit. This line item's <strong>creative will contain the below code</strong>.
- If your ad unit supports multiple sizes, create multiple Post-bid creatives for each size. 
- There is no need for per-price-bucket-per-line-item setup, because the post-bid creative is chosen after the ad server has chosen the line item. 
- This post-bid creative <strong>supports passback</strong>. See more info on passbacks in the below line-by-line explanation.

jsfiddle_link: jsfiddle.net/prebid/akLqdj3d/8/embedded/html,result
code_height: 1864
code_lines: 84

pid: 10
---

{% include dev-docs/build-from-source-warning.md %}

<br><br>
<br><br>
<br>


<div markdown="1">
#### Line 5: Enter your creative's size.

If your ad server's ad unit can support multiple sizes, then create multiple creatives within your ad server with this code snippet (with size differences).

</div>

<br><br>
<br><br>
<br><br>

<div markdown="1">
#### Line 8 to 22: Enter the header bidding bids' information. 

These bids correspond to this ad unit. Refer to [Bidder Params](/dev-docs/bidders.html) for what bidders and their spec that are supported.

</div>

<br><br>
<br><br>
<br><br>

<div markdown="1">

#### Line 25: Set Bid Timeout

Define how long your creative can wait for the bids to come back. The creative with the highest bid (if any) within the timeout will render. If no creative or bid is back within the timeout, the passback tag (if provided) will serve. If all bids respond within the timeout, the creative will render the highest bid as soon as the bids are back, before the timeout hits.

</div>

<div markdown="1">

#### Line 29: Set Passback Tag HTML

The passback tag will serve if no bids are back within the defined timeout. You can generate the passback tag HTML from your SSP or ad networks' tag UI. Note that the exported tag should be in HTML. 

This generated HTML tag is most likely in iFrame or a mix of Javascript and HTML. If there are Javascript tags in it, make sure you break out the "script" keyword, like shown in the left. 

</div>

<br>

<div markdown="1">

#### Line 38: Do Not Edit Below This Line

If you are unfamiliar with Prebid.js or Javascript, changing the below may cause the creative unable to render. 

</div>


