---
layout: page
title: Enable Deals
head_title: Enable Deals in Prebid for Header Bidding
description: Enable Deals in Prebid for Header Biddinganalysis.
pid: 4

hide: true

top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Enable Deals in Prebid

In order to enable deals for prebid, the ad ops setup are slightly different from the standard header bidding setup. Specifically:

+ From the ad ops side, you'll create separate orders and line items that target the deal ID key-values. These line items will be at different priorities than your standard header bidding line items.

+ From the dev side, if your page is using the standard prebid.js key-values, no change or work is required. 

{: .bg-info :}
In this example we will use DFP setup to illustrate, but the steps are basically the same for any ad server.


### Step 1: Understand Key-values

Whenever a bidder responds a bid with a deal ID in it, Prebid.js will generate and attach deal related key-values onto the ad server call in the below format: `hb_deal_BIDDERCODE = DEAL_ID`. Example:

Submitted bids, prices, and deals:

{% highlight js %}
bid 1: bidder = rubicon, cpm = 1.50, deal Id = RBC_123
bid 2: bidder = appnexus, cpm = 1.20, deal Id = APN_456
{% endhighlight %}

Key-values attached to the ad server call (that the line items will target):

{% highlight js %}
hb_pb_rubicon = 1.50 &
hb_deal_rubicon = RBC_123 &
hb_pb_appnexus = 1.20 &
hb_deal_appnexus = APN_456
// hb_adid, hb_size, and hb_adid omitted
{% endhighlight %}

{: .bg-info :}
Note that either your setup is ["Send All Bids to Ad Server"](/adops/send-all-bids-adops.html) or ["Send Top Bid to Ad Server"](/adops/step-by-step.html), Prebid.js will generate the deal key-values for every bidder. The reason is that you may want to give deals higher priorities in the ad server, which needs to see all deal enabled bids.

<br>

### Step 2: Create Key-values

For each header bidding partner you work with, create a keyword in the format of `hb_deal_BIDDERCODE`. You can find the complete references of deal Id key-value for each bidder [here](). Note that due to [DFP character length limit](https://support.google.com/dfp_premium/answer/1628457?hl=en#Key-values), Index Exchange's key is truncated to `hb_deal_indexExchang`.
<br>

{: .pb-img.pb-lg-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/deals/key-val.png)

<br>

### Step 3: Create Line Items for Deals

In DFP, create a new line item.

Enter all the **inventory sizes** for this deal (or deals):

{: .pb-img.pb-md-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/inventory-sizes.png)

<br>

Set the **priority** to the level you prefer. 

{: .pb-img.pb-lg-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/deals/deal-priority.png)

<br>

Set **Display Creatives** to *One or More* since we'll have one or more creatives attached to this line item.

Set **Rotate Creatives** to *Evenly*.

{: .pb-img.pb-md-img :}
![Display and Rotation]({{ site.github.url }}/assets/images/demo-setup/display-and-rotation.png)

<br>

Target the **inventory** that you want to this deal to run on.

<br>

**Target the deal ID(s)**

If you would like the deals have the same priority and to target the same inventory, you can include multiple deal IDs here. If not, you can create separate line items for each deal ID.

{: .pb-img.pb-lg-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/deals/targeting.png)

<br>


### Step 4: Attach Creatives to Line Items

Please follow the [same step here](/adops/step-by-step.html#step-2-add-a-creative).

</div>