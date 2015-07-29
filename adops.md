---
layout: default
title: Ad Ops
description: Ad Ops Guide
pid: 4
hide: false
isHome: false
---
<div class="bs-docs-section" markdown="1">

#Goals

###Common problems

1. How to avoid creating tens of thousands of line items and creatives? We've seen publishers creating 1 set of line items (each set has 1000 line items in it with $0.01 increment) for each creative size (there could be 20 sizes) and each bidder (there could be 5 bidders a publisher works with). That's 100,000 line items!
2. How to not get confused by all the targeting params? Every bidder has a different set of targeting params. You could end up having to manage 30 targeting parameters across thousands of line items and creatives!
3. What are some helpful reports that are relevant to header bidding? What reports should I run to ensure I'm optimizing header bidding together with my class 1 and mediation line items?

###Our goals

1. Help you get down to 1 set of line items and a few creatives to manage all creative sizes and bidders. Adding a new bidder requires absolutely no change to any existing setup.
2. Only manage 4 targeting parameters. 
3. Helpful reports that can help you understand and optimize your header bidding setup.

</div>

<div class="bs-docs-section" markdown="1">

#How does it work?

![Ad Ops Diagram]({{ site.github.url }}/assets/images/adops-intro.png)

1. headerbid.js contacts bidders in the page's header to get bids back. Note that headerbid.js makes **all calls truly async**, meaning the page's content can continue to render.
2. headerbid.js then sets the targeting parameters on the impressions sent to the ad server. Note that headerbid.js helps you **standardize targeting params across all bidders**. The targeting params are shown in the diagram. The default setting contains (`hb_bidder`, `hb_size`, `hb_pb`, `hb_adid`).
3. With **1 set of line items**, you can now manage header bidding for all bidders and all sizes. Find [more details here](#price-bucket-def) on price bucket setup.
4. headerbid.js helps you standardize all creative setup. The short code snippet [documented here](#creative-setup) **handles all bidders and all sizes**. 


</div>

<div class="bs-docs-section" markdown="1">

#Line Item Setup


###Sizes

Make sure your line items accept all creative sizes that apply to your sites.


<div class="bs-callout bs-callout-info">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#line-items-dfp" role="tab" data-toggle="tab">DFP</a></li>
        <li role="presentation"><a href="#line-items-custom" role="tab" data-toggle="tab">Custom Ad Server</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="line-items-dfp" markdown="1">

Inventory size: select all sizes that apply to your sites.


</div>

<div role="tabpanel" class="tab-pane" id="line-items-custom" markdown="1">

Allmost all ad servers' line items can support multiple sizes. Make sure the sizes cover all that're relevant to your site.

</div>

</div>

</div>

<a name="price-bucket-def"></a>

###eCPM

The line items' eCPM setup:

{: .table .table-bordered .table-striped }
|	 |	Low Granularity (good for testing) 	|	Medium Granularity (recommended/default)	 | High |
| :----  |:--------| :-------| :----------- |
|	$0 - $3 |	$0.50 increment |	$0.01 increment | TBD |
| $3 - $5 |	capped at $3.00 |	$0.02 increment |	TBD |
| $5 - $10 |	capped at $3.00	|	$0.05 increment |	TBD |
| $10 - $20 |	capped at $3.00	|	$0.10 increment (optional) |	TBD |
| > $20 |	capped at $3.00 	|	capped at $20.00 	| TBD 	|



###Targeting

Line item targeting setup:

* **Ad units**

	All line items should target all ad units that you'd like header bidding running on.

* **Price bucket**

	Each line item should target the price bucket string (default setting is `hb_pb`). The targeted value should be of equavalent value to eCPM set at the line item.

	_**Important**_: the price bucket value should always be at **2 decimal** places. 

	_**Important**_: Amazon has the price obfuscated, so make sure to apply the obfuscated price bucket values. Follow [the instructions here](bidders.html#amazon-caveats).

</div>

<div class="bs-docs-section" markdown="1">


<a name="creative-setup"></a>

#Creatives Setup

The below code snippet applies to all ad servers.

{% highlight js %}

<script>
	try{ window.top.pbjs.renderAd(document, '%%PATTERN:hb_adid%%'); } catch(e) {/*ignore*/}
</script>

{% endhighlight %}


<div class="bs-callout bs-callout-info">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#creatives-dfp" role="tab" data-toggle="tab">DFP</a></li>
        <li role="presentation"><a href="#creatives-custom" role="tab" data-toggle="tab">Custom Ad Server</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="creatives-dfp" markdown="1">

DFP supports creative **size override**, which allows us to use the same set of creatives to run all bidders' header bidding setup for all ad sizes.

#####How many creatives should I submit?

**IMPORTANT**: What's the **maximum number of ad units** your page can have? Set up **that number of creatives**. 

WHY? The same creative cannot be served into more than 1 ad unit in a single GPT request call. We thus need to duplicate the creatives. But all creatives can share the same content.


####Step 1: New Creative

Create a new 3rd party tag creative. 

#####Code snippet

As documented above.

#####Target ad unit size

Select 1x1 (no worries in the next section we'll show you how to override the size so the creative can work with all impression sizes).


####Step 2: Add the creative to all line items

Go to your line items and switch to the creatives tab. DFP will display a warning prompting you to upload creatives of the line items' accepted sizes. Click add existing creative for a size and you'll see the below screen.

![Add Creative to Line Item]({{ site.github.url }}/assets/images/add-creative-to-line-item.png)

Click "Show all" next to the "filtering for creatives with size" in this screen. You should be able to find the creative you've just submitted in the previous step.


####Step 3: Add more sizes to the creative

Step 2 has added one size override into the creative, but there're still many sizes uncovered. Click into the creative, and you can find:

![Creative Size Override]({{ site.github.url }}/assets/images/creative-size-override.png)

Add all the sizes you need into the "Size overrides" box.


</div>

<div role="tabpanel" class="tab-pane" id="creatives-custom" markdown="1">

If your ad server supports a creative of dynamic sizes, then check out the DFP tab for a similar setup.

If your ad server's creative can only have one size:

####Step 1

Create one 3rd party tag creative per size. 

####Step 2

As documented above.

####Step 3

Attach all creatives to all line items.

</div>

</div>

</div>


</div>



<div class="bs-docs-section" markdown="1">

#Query Strings

Make sure your ad server supports the below query string keys:

{: .table .table-bordered .table-striped }
|	Default Key String |	Description 	|	Example	 |
| :----  |:--------| :-------|
| hb_pb | The price bucket. Used by the line item to target. | `2.10` |
| hb_adid | The ad Id. Used by the ad server creative to render ad. | `2343_234234` |
| hb_bidder | The bidder code. Useful for logging and reporting. | `appnexus` |
| hb_size | The width and height concatenated. Useful for logging and reporting. | `300x250` |

</div>


<div class="bs-docs-section" markdown="1">

#Get started

###Start with a few line items:

To avoid having to deal with a few hundred line items from the beginning, we recommend your page use the `pbLg` (low granularity price bucket) to quickly get started. Let your developer overwrite the default bidder setting (as [documented here](publisher-api.html#configure-adserver-targeting)) using the below code snippet. 

{% highlight js %}

pbjs.bidderSettings = {
    standard: {
        adserverTargeting: [{
            key: "hb_adid",
            val: function(bidResponse) {
                return bidResponse.adId;
            }
        }, {
            key: "hb_pb",
            val: function(bidResponse) {
                return bidResponse.pbMg;
            }
        }]
    }
}

{% endhighlight %}

Follow the [Line Item Setup](#line-item-setup) and [Creative Setup](#creative-setup) to configure your ad server to support pre-bid. 

###Start with one new ad unit

To avoid the complexity of class 1, mediation, and AdX demand, we recommend getting started with one new ad unit. Create a new ad unit in your ad server and have it accept the line items you created in the previous step.

### Implement prebid.js

Work with your development team to implement prebid.js as documented in [Publisher API](publisher-api.html). We recommend **start with one bidder** first. You'll need to provide dev with the bidder's tag/site IDs (Find the specific bidder documentation [here](bidders.html)) and the ad unit.

We have a whole list of examples here. Use your own bidder bid params and ad units.
* gpt_example.html
* custom_adserver_example.html

### Debug

If your page is not serving pre-bid ads, there could be 2 reasons:

1. The ad server is not configured correctly. 
2. The bidders do not have demand.


### You're ready!

Once your test pages serve and you're comfortable with pre-bid:

* Add more line items for higher granularity. Use the default setting for `bidderSettings`.
* Implement prebid.js in your site. 

</div>

<br>