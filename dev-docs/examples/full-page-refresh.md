---
layout: example
title: Full Page Refresh
description: Full Page Refresh Example

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Ability to <strong>refresh all ad units</strong>
- Integration with DFP's GPT single request asynchronous mode
- One set of line items for all bidders
- Standard keyword targeting setup (<a href="/dev-docs/publisher-api-reference.html#bidderSettingsDefault">reference</a>)
- Standard price granularity

jsfiddle_link: jsfiddle.net/prebid/amg49spy/18/embedded/html,result
code_height: 2662
code_lines: 122

pid: 35
---

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br>

<div markdown="1">
#### Line 31 to 41: Refresh bids listener

The refresh button triggers this function call. `pbjs.requestBids` will set keyword targeting and refresh the DFP ad units when:

- All bids for all ad units came back, or
- PREBID_TIMEOUT set in the `timeout` parameter is hit.

See `pbjs.requestBids` [reference](/dev-docs/publisher-api-reference.html#module_pbjs.requestBids) for more details.

</div>
