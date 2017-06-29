---
layout: example
title: Ad Unit Refresh/ Infinite Scroll
description: Individual Ad Unit Refresh Example with DFP GPT

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Ability to <strong>refresh individual ad units</strong>. Useful for infinite scrolling ad slots
- Integration with DFP's GPT single request asynchronous mode
- One set of line items for all bidders
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>)
- Standard price granularity

jsfiddle_link: jsfiddle.net/prebid/dzrs3gfL/62/embedded/html,result
code_height: 2900
code_lines: 134

pid: 20
---

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>



<div markdown="1">
#### Line 34 to 53: Refresh bids listener

The refresh button for each ad unit triggers its corresponding function call. `pbjs.requestBids` can request bids for selected only ad units. The call will set keyword targeting and refresh the DFP ad units when:

- All bids for all ad units came back, or
- PREBID_TIMEOUT set in the `timeout` parameter is hit.

See `pbjs.requestBids` [reference](/dev-docs/publisher-api-reference.html#module_pbjs.requestBids) for more details.

</div>
