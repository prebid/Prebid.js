---
layout: example
title: Custom Price Bucket
description: Custom Price Bucket Prebid.js Example with DFP GPT

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about: 
- <strong>Custom keyword targeting setup (for price).</strong>
- Standard price granularity (pbMg see <a href="/dev-docs/publisher-api-reference.html#bidResponse">reference here</a>).
- Integration with DFP's GPT single request asynchronous mode.
- One set of line items for all bidders

jsfiddle_link: jsfiddle.net/prebid/bp9magow/2/embedded/html,result
code_height: 2210
code_lines: 143

pid: 10
---


<br>
<br>
<br>

<div markdown="1">
#### Line 1 to 58: Set timeout and define ad units

Same setup as in [Basic Example](/dev-docs/examples/basic-example.html). Check the basic example page for more details.

</div>

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>

<div markdown="1">
#### Line 60 to 88: Customize ad server targeting keywords

In this example, the keywords sent to DFP are changed from the default `hb_pb` to `bid_price`. It also customized the bid price from default `pbMg` ([docs here](http://local/dev-docs/publisher-api-reference.html#bidResponse)) to custom logic. The logic is: 

- Send $0.01 granularity price keywords when the bid price is between $0 to $3. 
- Send $0.10 granularity price keywords when the bid price is between $3 to $5. 
- Send $0.10 granularity price keywords when the bid price is between $5 to $20. 
- Send $20 as the keyword value for any bids above $20. 

This logic may be driven by the effort to reduce the number of line items while capturing the most accurate bid prices. 

You can see the effect of this customization if you click into the Result tab of this JSFiddle gadget.
</div>




<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br>

<div markdown="1">
#### Line 109 to 113: Set targeting with custom keywords

`pbjs.setTargetingForGPTAsync()` will now use your custom keywords for targeting. The keywords can also be retrieved from calling `pbjs.getTargetingForGPTAsync()`. The result can be found in the Result tab of this JSFiddle gadget, and we've also copied it below:

{% highlight js %}

{
  "div-gpt-ad-1438287399331-0": {
    "hb_bidder": "appnexus",
    "hb_adid": "59e004b6d",
    "custom_bid_price": "11.50"
  },
  "div-gpt-ad-1438287399331-1": {
    "hb_bidder": "appnexus",
    "hb_adid": "41eb482fe",
    "custom_bid_price": "11.50"
  }
}

{% endhighlight %}


</div>