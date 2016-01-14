---
layout: page
title: Step by step
head_title: Getting Started with Prebid.js for Header Bidding
description: An overview of Prebid.js, how it works, basic templates and examples, and more.
pid: 0


nav_section: tutorials
display: false

---


<div class="bs-docs-section demo-setup" markdown="1">

# Step by step guide for setting up DFP for Prebid.js



<iframe width="853" height="480" src="https://www.youtube.com/embed/-bfI24_hwZ0?rel=0" frameborder="0" allowfullscreen></iframe>

<div class="alert alert-danger" role="alert">
  <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
  <span class="sr-only">Correction:</span>
  Correction: in Line Item setting, "Display Creative" should choose "One or More", not "As Many as Possible" as described in the video.
</div>


</div>


<div class="bs-docs-section demo-setup" markdown="1">

#Line Item Setup

> It can be helpful to understand [how Prebid.js helps simplify line item setup]({{ site.github.url }}/blog/how-to-simplify-line-item-setup/) before implementing these steps.

In this section, we’ll help you start creating the line items to target the bids being passed into your ad server by prebid.js.

Note: for the rest of this document, we assume you’ll create ≈10 line items in $0.50 increments from $0.50 to $5.

### Naming

Naming is fully customizable, and we recommend something simple like `Prebid_[PRICE_BUCKET]` to help you identify your various buckets. 

Examples: 

* Line item 1 → name of “Prebid_0.50”
* Line item 2 → name of “Prebid_1.00”
* Line item 3 → name of “Prebid_1.50”
* Line item 4 → name of “Prebid_2.00”

### Setting Revenue (Rate)

Rate, or line item revenue, depending on ad server naming conventions, should be equal to your price bucket on each line item. Why? You need to inform your ad server knows how much the programmatic bid is worth to you for decisioning and reporting.

Examples: 

* Prebid_0.50 → rate of $0.50
* Prebid_1.00 → rate of $1.00
* Prebid_1.50 → rate of $1.50
* Prebid_2.00 → rate of $2.00

### Sizes

If your ad server requires size on the Line Item (like DoubleClick for Publishers), you’ll want to add all of your possible creative sizes to each line item.

For example, if you have 300x250 and 728x90 on your page, each line item would have both sizes applied.

<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">

{: .pb-md-img :}
![GPT Line Item Sizes]({{ site.github.url }}/assets/images/demo-setup/gpt-line-item-sizes.png)


</div>
</div>
</div>

### Settings


<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">

The line item type should typically be "price priority" in DFP. That will enable the line items to compete on price. The goal can be set to ‘unlimited’ and with no end date.

{: .pb-md-img :}
![GPT Line Item Sizes]({{ site.github.url }}/assets/images/demo-setup/gpt-line-item-settings.png)


</div>
</div>
</div>




### Targeting

Each line item should have the following targets:

* Inventory – the ad units where prebid.js is running.
* Custom Criteria / Key-Value – the price buckets (default key is hb_pb) added to your ad call’s query string by prebid.js. The targeted value should be of equivalent value to eCPM set at the line item.

    Example: for a line item setup to represent $1.00 bids, you’d set rate to $1.00 and target the key-value of hb_pb=1.00

    **Important**: the price bucket value should always be at 2 decimal places. E.g. 1.00 not 1.


<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">

![GPT Line Item Sizes]({{ site.github.url }}/assets/images/demo-setup/gpt-line-item-targeting.png)


</div>
</div>
</div>




### Priorities

We recommend setting the priority of pre-bid line items to the same level as other non-guaranteed line items, or in DoubleClick for Publishers, the same level as dynamic allocation competes.



</div>





<div class="bs-docs-section" markdown="1">


<a name="creative-setup"></a>

#Creatives Setup



When your ad server determines a prebid.js line item won the impression, we need to return the winning creative ID to the page so Prebid.js can call the ad. To do this, simply add the creative below to your line items.


{% highlight js %}

<script>
    try{ window.top.pbjs.renderAd(document, '%%PATTERN:hb_adid%%'); } catch(e) {/*ignore*/}
</script>

{% endhighlight %}


<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">


A couple of important points:

* DoubleClick for Publishers (DFP) supports creative size override, which allows you to use one creative handle multiple sizes. Set each creative size to 1x1, then leverage DFP’s size override.

* Determine the maximum number of ad units your pages can have. Please duplicate and set up that number of creatives. All your line items can share that set of creatives.

    Why? The same creative cannot be served into more than 1 ad unit in a single DoubleClick for Publishers GPT request call. If you have 5 ad units on a page, your prebid line items would have ≥ 5 creatives of size 1x1 and the code snippet above.


</div>
</div>
</div>


### Step 1: New Creative


<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">

* Create a new 3rd party tag creative.
* Add the code snippet above.
* Select 1x1 for creative size

{: .pb-lg-img :}
![GPT Line Item Sizes]({{ site.github.url }}/assets/images/demo-setup/gpt-creative.png)


</div>
</div>
</div>

### Step 2: Add the creative to all line items


<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">


Go to your line items and switch to the creatives tab. DFP will display a warning prompting you to upload creatives of the line items’ accepted sizes. Click add existing creative for a size and you’ll see the below screen.

{: .pb-lg-img :}
![Add Creative to Line Item]({{ site.github.url }}/assets/images/demo-setup/add-creative-to-line-item.png)

Click “Show all” next to the “filtering for creatives with size” in this screen. You should be able to find the creative you’ve just submitted in the previous step.



</div>
</div>
</div>




### Step 3: Add more sizes to the creative


<div class="bs-callout">

    <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#li-sizes-dfp" role="tab" data-toggle="tab">DFP</a></li>
    </ul>

<div class="tab-content">

<div role="tabpanel" class="tab-pane active" id="li-sizes-dfp" markdown="1">


Step 2 has added one size override into the creative, but there’re still many sizes uncovered. Click into the creative, and you can find:

{: .pb-md-img :}
![Creative Size Override]({{ site.github.url }}/assets/images/demo-setup/creative-size-override.png)

Add all the sizes you need into the “Size overrides” box.



</div>
</div>
</div>



<div class="bs-docs-section" markdown="1">

#Query Strings

To simplify the line item setup, the default behavior of Prebid.js is to [send the highest price bid only to the ad server]({{ site.github.url }}/overview/how-to-simplify-line-item-setup.html#pbjs-sends-highest-price-only). To run reporting such as:

* For bidder X, at what CPM does it fill?
* For bidder X, what's the fill rate out of all the winning header bidding bids?

It's important to enable DFP report on free-form query strings ([DFP doc for report on custom targeting](https://support.google.com/dfp_premium/answer/3108447?hl=en)). Follow the below steps: 

{: .pb-md-img :}
![GPT Query Strings for Header Bidding]({{ site.github.url }}/assets/images/demo-setup/gpt-query-strings.png)

1. In DFP's top navigation bar, go to Inventory.
2. Click on Custom Targeting on the left.
3. Add key `hb_bidder`.
4. Add values for this key. The values should be the bidders' bidder code [documented here](/dev-docs/bidders.html) under each bidder. You have to add the bidder code for the bidder that you want to run report on.

</div>