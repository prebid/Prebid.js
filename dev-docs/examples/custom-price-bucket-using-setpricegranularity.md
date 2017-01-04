---
layout: example
title: Custom Price Bucket using `setPriceGranularity`
description: Custom Price Bucket using the `setPriceGranularity` method 

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Custom keyword targeting setup (for price) using the <code>setPriceGranularity</code> method.
- For more info on <code>setPriceGranularity</code>, see <a href="/dev-docs/publisher-api-reference.html#customCPMObject">the API reference</a>.
- Integration with DFP's GPT single request asynchronous mode.
- One set of line items for all bidders.

jsfiddle_link: jsfiddle.net/prebid/bp9magow/65/embedded/html,result
code_height: 3166
code_lines: 146
pid: 101
---

<br>
<br>
<br>

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>


<div markdown="1">

#### Line 32 to 63: Set Custom Price Granularity

In this example, we customize the bid price to use our own custom logic.  The logic is:

- Use $0.01 price increments when the bid price is between $0 and $5
- Use $0.05 price increments when the bid price is between $5 and $8
- Use $0.50 price increments when the bid price is between $8 and $20
- Use $1.00 price increments when the bid price is between $21 and $99

To see the effect of this customization, click into the **Result** tab of this JSFiddle.
</div>

<br /><br /><br /><br /><br /><br />
<br /><br /><br /><br /><br /><br />
<br /><br /><br /><br /><br /><br />
<br /><br /><br /><br /><br /><br />
<br /><br /><br /><br /><br /><br />
<br /><br /><br /><br /><br /><br />

<div markdown="1">
#### Line 87 to 90: Set targeting with custom keywords

`pbjs.setTargetingForGPTAsync()` will now use your custom keywords for targeting.

The keywords can be retrieved by calling `pbjs.getAdserverTargeting()` as shown on line 91.

</div>
