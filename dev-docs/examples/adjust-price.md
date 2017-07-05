---
layout: example
title: Adjust Price
description: Adjust Bid Price

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- <strong>Adjust bidder price to show real earnings</strong>
- This may be necessary because some bidders return net price, while others return gross price
- Integration with DFP's GPT single request asynchronous mode
- One set of line items for all bidders
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>)
- Standard price granularity


jsfiddle_link: jsfiddle.net/prebid/hn06j4f4/11/embedded/html,result

code_height: 2725
code_lines: 125

pid: 80
---

<br>
<br>
<br>
<br>
<br>

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br>

<div markdown="1">
#### Line 31 to 38: Adjust Bid Price

Some bidders return gross prices, instead of the net prices (what the publisher will actually get paid). For example, a publisher’s net price might be 15% below the returned gross price. In this case, the publisher may want to adjust the bidder’s returned price to run a true header bidding auction. Otherwise, this bidder’s gross price will unfairly win over your other demand sources who report the real price.

(AppNexus does return the net price. This is just an example for adjusting bid prices.)


</div>
