---
layout: example
title: Simplified Price Bucket Setup
description: Simplified Price Bucket Setup with Prebid.js

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Simplified price bucket setup with one function call to <a href="/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity"><code>pbjs.setPriceGranularity()</code></a>

jsfiddle_link: jsfiddle.net/prebid/bp9magow/14/embedded/html,result
code_height: 2400
code_lines: 109

pid: 0
---

{% include dev-docs/build-from-source-warning.md %}

<br>
<br>
<br>

<div markdown="1">
#### Line 1 to 59: Set timeout and define ad units

Here we use the same setup as in the [Basic Example](/dev-docs/examples/basic-example.html).

</div>

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br>

<div markdown="1">
#### Line 60: Set price granularity

The simplest way to set price granularity is to use the helper method [`pbjs.setPriceGranularity`](/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity).  For more information about this method, see [its documentation](/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity).

You can see the effect of this setting if you click into the **Result** tab of the example.

If you need more control over pricing granularity, see the [Custom price bucket granularity](/dev-docs/examples/custom-price-bucket.html) example.
</div>
