---
layout          : page
title           : Setting up Prebid with the AppNexus Ad Server
head_title      : Setting up Prebid with the AppNexus Ad Server
description     : Setting up Prebid with the AppNexus Ad Server
pid             : 3
hide            : false
top_nav_section : adops
nav_section     : tutorials
---

<div class="bs-docs-section" markdown="1">
    
# Setting up Prebid with the AppNexus Ad Server
{: .no_toc}

This page describes how to set up the AppNexus Ad Server to work with Prebid.js from an Ad Ops perspective.

In some cases there are links to the [AppNexus wiki](https://wiki.appnexus.com) which may require a customer login.

Once the Ad Ops setup is complete, developers will need to add code to the page as shown in the example [Using Prebid.js with AppNexus as your Ad Server]({{site.github.url}}/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).

{: .alert.alert-success :}
**AppNexus Ad Server Features**  
Note that the functionality described on this page uses some features that are only available in the AppNexus Ad Server product, such as [key-value targeting](https://wiki.appnexus.com/x/-PQdBQ).  For more information, contact your AppNexus representative.

{: .alert.alert-info :}
**Object Limits**  
Note that using Prebid with AppNexus as your ad server may cause you to
hit your AppNexus [Object Limits](https://wiki.appnexus.com/x/CwIWAg).

* TOC
{:toc}

## Step 1. Set up one creative per ad size you'd like to serve

Follow the creative setup instructions in [Add Creatives](https://wiki.appnexus.com/x/GoGzAQ), with the following settings:

Set up creatives using all of the sizes you will need.  You can re-use a creative across any number of line items and campaigns.

The creative **Type** should be **Third-party creative**.

The **Creative format** should be **Third-party tag**.

The **Tag type** is HTML.

Make sure the **Serve in iFrame** box is not checked.

The creative content should be the following HTML and JavaScript:

```html
    <script>
    var w = window;
    for (i=0;i<10;i++) {
      w = w.parent;
      if (w.pbjs) {
        try {
          w.pbjs.renderAd(document, '#{HB_ADID}');
          break;
        }
        catch (e) {
          continue;
      }
    }
    </script>
```

{: .alert.alert-warning :}
**Creative Expiration**  
Note that creatives are automatically marked as inactive by the AppNexus Ad Server after 45 days of inactivity.  This may happen to Prebid creatives since they are loaded relatively infrequently compared to other use cases.  For help with mitigating this issue, please contact your AppNexus representative.

## Step 2. Create one line item per price bucket

You'll need to create one line item for every price bucket you intend to serve, e.g.,:

- If you want to have $0.10 price granularity, you'll need 201 line items, with key-value targeting settings ranging from 0, 0.1, ..., 20.00.

For each line item, follow the line item setup instructions in [Create a Line Item](https://wiki.appnexus.com/x/MYCzAQ), with the following settings:

Set the line item's **Revenue Type** to *CPM*, and the **Revenue Value** to the current price bucket, e.g., \$0.1, \$0.2, ...,\$18.90, ..., \$20.00.

Under **Associated Creatives**, you can choose to manage creatives at the line item level.  Note that you can choose to associate creatives at the line item or campaign level, depending on your needs.

Associate as many creative sizes with the line item as you need.  Set the **Creative Rotation** to *Even*.

In your line item, the [key-value targeting](https://wiki.appnexus.com/x/-PQdBQ) should be set to:

{: .table .table-bordered .table-striped }
| Key              | Value        | Note                                                                                                                                                                 |
|------------------+--------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `hb_pb`          | `0.1`        |                                                                                                                                                                      |
| `hb_bidder`      | `"appnexus"` |                                                                                                                                                                      |
| `hb_pb_appnexus` | `0.1`        | Use this key instead of `hb_bidder` if you are using ["send all bids" mode]({{site.github.url}}/dev-docs/publisher-api-reference.html#module_pbjs.enableSendAllBids) |

{: .alert.alert-success :}
You can only report on price bucket values if you provide them in the Key/Value Targeting UI.

Your campaign should also target your Prebid placements using a custom category, `prebid_enabled`. This will allow you to turn targeting on and off for a placement (or an entire placement group) by adding it to the custom category.

For more information about targeting custom content categories, see [Content Category Targeting](https://wiki.appnexus.com/x/XAEcB).

## Step 3. Create a campaign

For each line item, create one campaign to associate with it.  The campaign should have an unlimited budget, start running right away, and run indefinitely.

You shouldn't have to do anything else. All other settings (such as budget and targeting) are inherited from the line item.

You can associate creatives at the campaign or line item level, depending on your needs.

For reference, there are full campaign setup instructions at [Create a Campaign](https://wiki.appnexus.com/x/04KUAg).

## Related Topics

+ [Using Prebid.js with AppNexus as your Ad Server]({{site.github.url}}/dev-docs/examples/use-prebid-with-appnexus-ad-server.html)

</div>
