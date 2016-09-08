---
layout: page
title: Ad Ops Guide
head_title: Ad Ops Guide for Header Bidding
description: An ad ops guide for implementing header bidding with prebid.js.
pid: 30

is_top_nav: yeah

---

<div class="bs-docs-section" markdown="1">

#Overview

> **Prebid.js** brings header bidding, and thus **dynamic-allocation-like** functionality to **all** SSPs and other programmatic partners.

If you spend an absurd about of time reviewing SSP reports to figure out which one makes you the most money, or are sick of dealing with passbacks on SSPs that can’t fill all your inventory – say hi to Prebid.js.

In an ideal world, every one of your SSPs would work similarly to dynamic allocation, where everything competes on price and is handled by your ad server. 

Prebid.js empowers publishers to create dynamic-allocation-like functionality for SSPs and other programmatic partners. Each partner competes on price for every impression at the same time, eliminating “first look” and “waterfalls” to help make publishers more money. 

The result? More transparency into market demand, more control over the bid process, and a greater array of advertiser demand.

</div>


<div class="bs-docs-section" markdown="1">

#How does it work?

![Ad Ops Diagram]({{ site.github.url }}/assets/images/adops-intro.png)

##### 1. Bidders
* You configure prebid.js and setup one or more supported “bidders” (SSP, retargeters, ad networks, etc. – whatever they’re called)
* As the page loads, prebid.js will asynchronously call each bidder to request how much they’re willing to pay for the impression. Note: the asynchronous calls mean the pages’ content continues to render without interruption.

##### 2. Timer on page
* To allow time for prebid.js to run, a timer is wrapped around the ad server tags on page. When bids are returned, or the timer runs out, the ad call to the publisher’s ad server is made – with a little extra information piggybacked onboard.

##### 3. Ad server requests with key-value targeting
* When bids are received, prebid.js adds the bidder, size, price, and creative URL to your ad server’s call via key-values on the query string.

##### 4. Line items
* Within your ad server, line items are setup to target the various bid prices and sizes, allowing the bidders’ programmatic demand compete with other line items or integrated exchanges (like Google Ad Exchange) based on price. More details on price bucket and line item setup below.

##### 5. Creative
* A small snippet of JavaScript is setup as a creative on each pre-bid line item. When a programmatic line item is picked by your ad server, the “creative” JS snippet tells prebid.js which bidder to serve. The short code snippet documented here handles all bidders and all sizes.


Voila, you have dynamic allocation-like functionality for the major SSPs and exchanges.

<br>

#### What key value targeting does prebid.js return to your ad server?


{: .table .table-bordered .table-striped }
|   Default Key | Scope |    Description     |   Example  |
| :----  |:--------| :-------| :-------|
| hb_pb | Required | The price bucket. Used by the line item to target. | `2.10` |
| hb_adid | Required | The ad Id. Used by the ad server creative to render ad. | `234234` |
| hb_bidder | Required | The bidder code. Useful for logging and reporting to learn about which bidder has higher fill rate/CPM. | `rubicon` |
| hb_size | Optional | The width and height concatenated. | `300x250` |
| hb_cpm | Optional | The exact price the bidder bids for. It offers more accuracy than `hb_pb` and can be used by the line item to target. | `2.11` |


<a name="price-bucket-def"></a>

#### Price Bucket Definition

{: .table .table-bordered .table-striped }
| bidResponse variable |    Description     |   Example  |
| :----  |:--------| :-------|
| `pbLg` | The low granularity price bucket at 0.50 increment, capped at $5, floored to 2 decimal places. (0.50, 1.00, 1.50, ..., 5.00) | `1.50` |
| `pbMg` | The medium granularity price bucket at 0.10 increment, capped at $20, floored to 2 decimal places. (0.10, 0.20, ..., 19.90, 20.00) | `1.60` |
| `pbHg` | The high granularity price bucket at 0.01 increment, capped at $20, floored to 2 decimal places. (0.01, 0.02, ..., 19.99, 20.00) | `1.61` |

</div>


<div class="bs-docs-section" markdown="1">

#Getting Started

> Here's what you need to implement header bidding via Prebid.js 

#### Step 1: Setup a test page

Publishers who successfully implement Prebid.js typically start with a test page consisting of 2 ad units, for example 300x250 and 728x90.

#### Step 2: Decide on price bucket granularity

With pre-bid, you’ll need to setup line items to tell your ad server how much money the “bidder” demand is worth to you. This process is done via key-values.

Example:

* Prebid.js is going to call your bidders for their price, then pass it into your ad server on the query-string. You want to target this bid price with a line item that earns you the same amount if it serves.

* If you had 1-line item for every bid at a penny granularity of $0.01, $0.02, $0.03, ..., 1.23, ..., $4.56 you’d need 1,000 line items just to represent bids from $0-$10. We call this the “Exact” granularity option.

* Creating 1,000 line items can be a hassle, so publishers typically use price buckets to represent price ranges that matter. For example, you could group bids into 10 cent increments, so bids of $1.06 or $1.02 would be rounded down into a single price bucket of $1.00.

Our recommendation is to start with $1 or 10 cent granularity until you’re more comfortable with Prebid.js. At $1, you only need to setup 10-20 line items – easy. When you’re ready, get more granular with the price buckets to improve yield.

#### Step 3: Sign-up for bidders

To maximize earning potential, we recommend you sign-up for the various bidders prebid.js supports (more will be added):

* AppNexus
* Rubicon Project
* OpenX
* PubMatic

#### Step 4: Implement Prebid.js

Work with your development team to implement prebid.js as documented in Publisher API. We recommend you start with one bidder. You’ll need an account with the bidder and will need to provide your developer with the bidder’s tag/site IDs (documentation here) an


</div>


<div class="bs-docs-section demo-setup" markdown="1">

# Step by step guide for setting up DFP for Prebid.js

<iframe width="853" height="480" src="https://www.youtube.com/embed/-bfI24_hwZ0?rel=0" frameborder="0" allowfullscreen></iframe>

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

To simplify the line item setup, the default behavior of Prebid.js is to [send the highest price bid only to the ad server]({{ site.github.url }}/blog/how-to-simplify-line-item-setup#pbjs-sends-highest-price-only). To run reporting such as:

* For bidder X, at what CPM does it fill?
* For bidder X, what's the fill rate out of all the winning header bidding bids?

It's important to enable DFP report on free-form query strings ([DFP doc for report on custom targeting](https://support.google.com/dfp_premium/answer/3108447?hl=en)). Follow the below steps: 

{: .pb-md-img :}
![GPT Query Strings for Header Bidding]({{ site.github.url }}/assets/images/demo-setup/gpt-query-strings.png)

1. In DFP's top navigation bar, go to Inventory.
2. Click on Custom Targeting on the left.
3. Add key `hb_bidder`.
4. Add values for this key. The values should be the bidders' bidder code [documented here](bidders.html) under each bidder. You have to add the bidder code for the bidder that you want to run report on.

</div>

<!--
<div class="bs-docs-section" markdown="1">

#Reporting

</div>

-->


<!-- 
### You’re ready!

Once your test pages serve and you’re comfortable with pre-bid:

* Add more line items for higher granularity. Use the default setting for bidderSettings.
* Implement prebid.js in your site. -->

