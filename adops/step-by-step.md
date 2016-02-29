---
layout: page
title: Step by step
head_title: Getting Started with Prebid.js for Header Bidding
description: An overview of Prebid.js, how it works, basic templates and examples, and more.
pid: 0
top_nav_section: adops
nav_section: tutorials

---

<div class="bs-docs-section" markdown="1">

# Step by step guide to DFP setup

<iframe width="853" height="480" src="https://www.youtube.com/embed/-bfI24_hwZ0?rel=0" frameborder="0" allowfullscreen="true"></iframe>

<div class="alert alert-danger" role="alert">
  <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
  <span class="sr-only">Correction:</span>
  Correction: in your Line Item settings, 'Display Creative' should be set to 'One or More', not 'As Many as Possible' as described in the video.
</div>

* TOC
{:toc }

## Step 1. Add a line item

In DFP, create a new order with a $0.50 line item.

Enter all of the inventory sizes that your website has.

{: .pb-img.pb-md-img :}
![Inventory Sizes]({{ site.github.url }}/assets/images/demo-setup/inventory-sizes.png)

Because header bidding partners return prices, set the Line Item
**Type** to **Price priority** to enable them to compete on price.

{: .pb-img.pb-sm-img :}
![Price Priority]({{ site.github.url }}/assets/images/demo-setup/price-priority.png)

<br>

Set the **Rate** to $0.50 so that this line item will compete with
your other demand sources at $0.50 ECPM.

{: .pb-img.pb-sm-img :}
![Rate]({{ site.github.url }}/assets/images/demo-setup/rate.png)

<br>

Set **Display Creatives** to *One or More* since we'll have one or
more creatives attached to this line item.

Set **Rotate Creatives** to *Evenly*.

{: .pb-img.pb-md-img :}
![Display and Rotation]({{ site.github.url }}/assets/images/demo-setup/display-and-rotation.png)

Choose the inventory that you want to run header bidding on.

By default, 'prebid.js' will send the highest bid price to DFP using
the keyword `hb_pb`.

This line item will capture the bids in the range from $0.50 to $1 by
targeting the keyword `hb_pb` set to `0.50` in the **Key-values**
section.  Be sure to use 2 decimal places.

{: .pb-img.pb-md-img :}
![Key-values]({{ site.github.url }}/assets/images/demo-setup/key-values.png)

<br>

## Step 2. Add a Creative

Add creatives to this $0.50 line item so it can be duplicated later.

Choose the same advertiser we've assigned the line item to.

Note that this has to be a **Third party** creative.

In this example the creative name is
"Synergy\_Prebid\_Creative".

Copy this creative code snippet and paste it into the **Code
snippet** box.

    <script>
      try{ window.top.pbjs.renderAd(document, '%%PATTERN:hb_adid%%'); } catch(e) {/*ignore*/}
    </script>

{: .pb-img.pb-lg-img :}
![New creative]({{ site.github.url }}/assets/images/demo-setup/new-creative.png)

Make sure the creative size is set to 1x1.  This allows us to set up
size override, which allows this creative to serve on all inventory
sizes.

Next, attach the creative to the $0.50 line item you created in Step
1.

Because our creative size is 1x1, we need to disable the filtering by
clicking on the **Show All** button in the **Use existing creatives**
dialog.

Click into "Synergy\_Prebid\_Creative", click the **Settings** tab,
and override all sizes in the **Size overrides** box.

Save the creative and go back to the line item.

<br>

## Step 3. Duplicate Creatives

DFP has a constraint that one creative can be served to at most one ad
unit in a page under GPT's single request mode.

Let's say your page has 4 ad units.  We need to have at least 4
creatives attached to the line item in case more than 2 bids are
within the $0.50 range.

Therefore, we need to duplicate our Prebid creative 4 times.

Once that's done, we have a fully functioning line item with 4
creatives attached.

<br>

## Step 4. Duplicate Line Items

Now let's duplicate our line item for bids above $0.50.

In the Prebid order page, copy the line item with shared creatives.

This way you only have 4 creatives to maintain, and any updates to
those creatives are applied to all pre-bid line items.

For example, we can duplicate 3 more line items:

-   $1
-   $1.50
-   $2

Let's go into each of them to update some settings.  For each
duplicated line item:

1.  Change the name to reflect the price, e.g., "Prebid\_1.00",
    "Prebid\_1.50"

2.  Change the **Rate** to match the new price of the line item.

3.  In **Key-values**, make sure to target `hb_pb` at the new price,
    e.g., $1.00.  Again, be sure to use 2 decimal places.

4.  (Optional) Set the start time to *Immediate* so you don't have to
    wait.

Repeat for your other line items until you have the pricing
granularity level you want.
