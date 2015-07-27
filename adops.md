---
layout: default
title: Ad Ops
description: Ad Ops Guide
pid: 4
hide: false
isHome: false
---

###Common problems

1. How to avoid creating tens of thousands of line items and creatives? We've seen publishers creating 1 set of line items (each set has 1000 line items in it with $0.01 increment) for each creative size (there could be 20 sizes) and each bidder (there could be 5 bidders a publisher works with). That's 100,000 line items!
2. How to not get confused by all the targeting params? Every bidder has a different set of targeting params. You could end up having to manage 30 targeting parameters across thousands of line items and creatives!
3. What are some helpful reports that are relevant to header bidding? What reports should I run to ensure I'm optimizing header bidding together with my class 1 and mediation line items?

###Our goals

1. Help you get down to 500 line items and a few creatives to manage all creative sizes and bidders. Adding a new bidder requires absolutely no change to any existing setup.
2. Only manage 4 targeting parameter. 
3. Helpful reports that can help you understand and optimize your header bidding setup.



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


###eCPM

Set up your line items:

{: .table .table-bordered .table-striped }
|	 |	Low Granularity (good for testing) 	|	Medium Granularity (recommended/default)	 | High |
| :----  |:--------| :-------| :----------- |
|	$0 - $3 |	$0.50 increment |	$0.01 increment | TBD |
| $3 - $5 |	capped at $3.00 |	$0.02 increment |	TBD |
| $5 - $10 |	capped at $3.00	|	$0.05 increment |	TBD |
| $10 - $20 |	capped at $3.00	|	$0.10 increment (optional) |	TBD |
| > $20 |	capped at $3.00 	|	capped at $20.00 	| TBD 	|



###Targeting

#####Target all ad units
???

#####Target price bucket

Each line item should target the price bucket string `hb_pb`. The targeted value should be of equavalent value to eCPM set at the line item.

**Important**: the price bucket value should always be at **2 decimal** places. 

</div>

<div class="bs-docs-section" markdown="1">


#Creatives Setup


<div class="bs-callout bs-callout-info">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#creatives-dfp" role="tab" data-toggle="tab">DFP</a></li>
        <li role="presentation"><a href="#creatives-custom" role="tab" data-toggle="tab">Custom Ad Server</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="creatives-dfp" markdown="1">

DFP supports creative **size override**, which allows us to use **1 creative only** to run all bidders' all sizes header bidding setup.

####Step 1: New Creative

Create a new 3rd party tag creative. 

#####Code snippet

Use the below code snippet:

{% highlight js %}

<script>
	try{ window.top.pbjs.renderAd(document, '%%PATTERN:hb_adid%%', '%%PATTERN:hb_bidder%%'); } catch(e) {/*ignore*/}
</script>

{% endhighlight %}

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

Use the below code snippet for the creative:

{% highlight js %}

<script>
	try{ window.top.pbjs.renderAd(document, '%%PATTERN:hb_adid%%', '%%PATTERN:hb_bidder%%'); } catch(e) {/*ignore*/}
</script>

{% endhighlight %}

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
| hb_adid | The ad Id | `2343_234234` |
| hb_bidder | The bidder code | `appnexus` |
| hb_size | The width and height concatenated | `300x250` |
| hb_pb | The price bucket | 2.10 |

</div>


<div class="bs-docs-section" markdown="1">

###How does it work?

To help simplify the line item and targeting setup on the ad server side, Prebid.js has made 

Let's first take a look at the 



</div>


