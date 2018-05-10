---
layout: page
title: Enable Deals
head_title: Enable Deals in Prebid for Header Bidding
description: Enable Deals in Prebid for Header Bidding Analysis.
pid: 4

hide: false

top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Enable Deals in Prebid
{:.no_toc}

In order to enable deals for prebid, the ad ops setup is slightly different from the standard header bidding setup. Specifically:

+ From the ad ops side, you'll create separate orders and line items that target the deal ID key-values. These line items will be at different (probably higher) priorities than your standard header bidding line items.

+ From the dev side, if your page is using the standard prebid.js key-values, no change or work is required.

{: .bg-info :}
In this example we will use the DFP setup to illustrate, but the steps are basically the same for any ad server.

* TOC
{:toc}

### Step 1: Understand Key-values

Whenever a bidder responds with a bid containing a deal ID, Prebid.js will generate and attach deal-related key-values to the ad server call in the format: `hb_deal_BIDDERCODE = DEAL_ID`.

For example, given the submitted bids, prices, and deals shown here:

```
bid 1: Bidder = Rubicon,  CPM = 1.50, Deal ID = RBC_123
bid 2: Bidder = AppNexus, CPM = 1.20, Deal ID = APN_456
```

The key-values attached to the ad server call (that the line items will target) will be:

```
hb_pb_rubicon    = 1.50
hb_deal_rubicon  = RBC_123
hb_pb_appnexus   = 1.20
hb_deal_appnexus = APN_456
// hb_adid, hb_size, and hb_adid omitted
```

{: .bg-info :}
Whether your Ad Ops setup [sends all bids to the ad server](/adops/send-all-bids-adops.html) or just [sends the top bid to the ad server](/adops/step-by-step.html), Prebid.js will generate the deal key-values for every bidder. The reason is that you may want to give deals higher priorities in the ad server, which needs to see all deal-enabled bids.

<br>

### Step 2: Create Key-values

For each header bidding partner you work with, create a keyword in the format of `hb_deal_BIDDERCODE`, e.g., `hb_deal_pubmatic`. For more examples of the keyword format, see the [API Reference for `pbjs.getAdserverTargeting`]({{site.github.url}}/dev-docs/publisher-api-reference.html#module_pbjs.getAdserverTargeting).

<br>

{: .pb-img.pb-lg-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/deals/key-val.png)

<br>

### Step 3: Create Line Items for Deals

In DFP, create a new line item.

Enter all the **Inventory sizes** for your deal (or deals):

{: .pb-img.pb-md-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/inventory-sizes.png)

<br />

Set the **priority** to the level you prefer.

{: .pb-img.pb-lg-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/deals/deal-priority.png)

<br>

Set **Display Creatives** to *One or More* since we'll have one or more creatives attached to this line item.

Set **Rotate Creatives** to *Evenly*.

{: .pb-img.pb-md-img :}
![Display and Rotation]({{ site.github.url }}/assets/images/demo-setup/display-and-rotation.png)

<br>

Then you'll need to target the **inventory** that you want to this deal to run on.

<br>

**Use Key-values targeting to target deal ID(s)**

There are two ways to target deal IDs using *Key-values* targeting:

1. If you would like the deals to have the same priority and target the same inventory, you can include multiple deal IDs (as shown below).
2. Otherwise, you must create a separate line item for each deal ID you want to target.

{: .pb-img.pb-lg-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/deals/targeting.png)

<br>

### Step 4: Attach Creatives to Line Items

For instructions on attaching creatives to the line item, see [Add a Creative](/adops/step-by-step.html#step-2-add-a-creative).

</div>
