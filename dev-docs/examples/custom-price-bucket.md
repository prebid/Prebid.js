---
layout: example
title: Custom Price Bucket
description: Custom Price Bucket Prebid.js Example with DFP GPT

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- <strong>Custom keyword targeting setup (for price)</strong>
- Standard price granularity
- Integration with DFP's GPT single request asynchronous mode
- One set of line items for all bidders

jsfiddle_link: jsfiddle.net/prebid/bp9magow/87/embedded/html,result
code_height: 3166
code_lines: 146

pid: 100
---
<br>
<br>
<br>


<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>


<div markdown="1">
#### Line 31 to 59: Customize ad server targeting keywords

In this example, the keywords sent to DFP are changed from the default `hb_pb` to `custom_bid_price_key`. It also customized the bid price from default `pbMg` to custom logic. The logic is:

- Send $0.01 granularity price when the bid price is between $0 to $3. 
- Send $0.10 granularity price when the bid price is between $3 to $5. 
- Send $0.50 granularity price when the bid price is between $5 to $20. 
- Send $20.00 as the keyword value for any bids above $20. 

This logic may be driven by the effort to reduce the number of line items while capturing the most accurate bid prices.

You can see the effect of this customization if you click into the Result tab of this JSFiddle gadget.
</div>




<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br>

<div markdown="1">
#### Line 84 to 87: Set targeting with custom keywords

`pbjs.setTargetingForGPTAsync()` will now use your custom keywords for targeting. The keywords can also be retrieved from calling `pbjs.getTargetingForGPTAsync()`. The result can be found in the Result tab of this JSFiddle gadget, and we've also copied it below:

{% highlight js %}

{
  "div-gpt-ad-1438287399331-0": {
    "custom_bidder_key": "appnexus",
    "hb_adid": "59e004b6d",
    "custom_bid_price_key": "0.50"
  },
  "div-gpt-ad-1438287399331-1": {
    "custom_bidder_key": "appnexus",
    "hb_adid": "41eb482fe",
    "custom_bid_price_key": "0.50"
  }
}

{% endhighlight %}


</div>
