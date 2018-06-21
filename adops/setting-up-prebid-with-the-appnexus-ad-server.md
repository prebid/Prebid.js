---
layout: page
title: Setting up Prebid with the AppNexus Publisher Ad Server
head_title: Setting up Prebid with the AppNexus Publisher Ad Server
description: Setting up Prebid with the AppNexus Publisher Ad Server
pid: 3
hide: false
top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">
    
# Setting up Prebid with the AppNexus Publisher Ad Server
{: .no_toc}

This page describes how to set up the AppNexus Publisher Ad Server to work with Prebid.js from an Ad Ops perspective.

In some cases there are links to the [AppNexus wiki](https://wiki.appnexus.com) which may require a customer login.

Once the Ad Ops setup is complete, developers will need to add code to the page as shown in the example [Using Prebid.js with AppNexus as your Ad Server]({{site.github.url}}/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).

{: .alert.alert-success :}
**AppNexus Publisher Ad Server Features**  
Note that the functionality described on this page uses some features that are only available in the AppNexus Publisher Ad Server product, such as [key-value targeting](https://wiki.appnexus.com/x/-PQdBQ).  For more information, contact your AppNexus representative.

{: .alert.alert-info :}
**Object Limits**  
Note that using Prebid with AppNexus as your ad server may cause you to
hit your AppNexus [Object Limits](https://wiki.appnexus.com/x/CwIWAg).

* TOC
{:toc}

## Step 1. Add Key-Values

In the [key-value targeting](https://wiki.appnexus.com/x/-PQdBQ) in Console, set up the keys and values shown below.  Keep in mind that all of the keys described below should use string values (**not** numeric).

If you are only sending the winning bid to the ad server, set up your keys like so:

{: .table .table-bordered .table-striped }
| Key         | Value (string) |
|-------------+----------------|
| `hb_pb`     | `0.1`          |
| `hb_bidder` | `"rubicon"`   |

Otherwise, if you are [sending all bids to the ad server]({{site.github.url}}/dev-docs/publisher-api-reference.html#module_pbjs.enableSendAllBids), you'll have to create a key for each bidder (e.g., `hb_pb_rubicon`, `hb_pb_partner1`, `hb_pb_partner2`, etc.), and all of the price bucket values for that key.

{: .table .table-bordered .table-striped }
| Key              | Value (string) |
|------------------+----------------|
| `hb_pb_rubicon` | `0.1`          |

Depending on the price granularity you want, you may find one of the following CSV files helpful.  Each file has the buckets for that granularity level predefined.  You can avoid manually setting up key-value targeting by uploading the appropriate CSV file on the [key-values screen](https://wiki.appnexus.com/x/-PQdBQ):

+ [10cent-prebid-buckets.csv]({{site.github.url}}/assets/csv/10cent-prebid-buckets.csv)
+ [25cent-prebid-buckets.csv]({{site.github.url}}/assets/csv/25cent-prebid-buckets.csv)
+ [dense-prebid-buckets.csv]({{site.github.url}}/assets/csv/dense-prebid-buckets.csv)

For more information about how to set up price bucket granularity in Prebid.js code, see the API documentation for [`pbjs.setPriceGranularity`]({{site.github.url}}/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity).

{: .alert.alert-success :}
You can only report on price bucket values if you provide them in the <a href="https://wiki.appnexus.com/x/-PQdBQ">Key-Value Targeting UI</a>.

## Step 2. Add Creatives

You'll need one creative per ad size you'd like to serve.  You can re-use a creative across any number of line items and campaigns.

Follow the creative setup instructions in [Add Creatives](https://wiki.appnexus.com/x/GoGzAQ) with the settings described below.  

- The creative **Type** should be **Third-party creative**.

- The **Creative format** should be **Third-party tag**.

- The **Tag type** is HTML.

- Make sure the **Serve in iFrame** box is not checked.

- The creative content should be the HTML and JavaScript shown below.

{: .alert.alert-success :}
If you are using "send all bids" mode, the macro in the call to `renderAd` below should match the header bidding partner associated with that creative, e.g., `'#{HB_ADID_RUBICON}'`, `'#{HB_ADID_PARTNER}'`, etc.

{% highlight html %}
<script>
 var w = window;
 for (i = 0; i < 10; i++) {
     w = w.parent;
     if (w.pbjs) {
         try {
             w.pbjs.renderAd(document, '#{HB_ADID}');
             break;
         } catch (e) {
             continue;
         }
     }
 }
</script>
{% endhighlight %}

{: .alert.alert-warning :}
**Creative Expiration**  
Note that creatives are automatically marked as inactive by the AppNexus systems after 45 days of inactivity.  This may happen to Prebid creatives since they are loaded relatively infrequently compared to other use cases.  For help with mitigating this issue, please contact your AppNexus representative.

## Step 3. Set up Line Items

You'll need to create one line item for every price bucket you intend to serve.

For example, if you want to have $0.10 price granularity, you'll need 201 line items, one for each of your key-value targeting settings from Step 1.

For each line item, follow the line item setup instructions in [Create a Line Item](https://wiki.appnexus.com/x/MYCzAQ), with the following settings:

- Set the **Revenue Type** to *CPM*.

- Set the **Revenue Value** to one of the price bucket key-values from Step 1, e.g., \$0.2.

- Under **Associated Creatives**, choose to manage creatives at the line item level.

- Associate as many creative sizes with the line item as you need.  Set the **Creative Rotation** to *Even*.

- In your line item's targeting settings, use the key-value that matches the line item's price bucket, e.g. (you set these up in Step 1).

- Still in the targeting settings, target the custom category `prebid_enabled`. This will allow you to turn targeting on and off for a placement (or an entire placement group) by adding it to the custom category, which you'll do in one of the later steps.  This is useful for troubleshooting.

For more information about targeting custom content categories, see [Content Category Targeting](https://wiki.appnexus.com/x/XAEcB).

## Step 4. Set up Campaigns

For each line item, create one campaign to associate with it.  The campaign should have an unlimited budget, start running right away, and run indefinitely.

You shouldn't have to do anything else. All other settings (such as budget and targeting) are inherited from the line item.

For more information, see the full campaign setup instructions at [Create a Campaign](https://wiki.appnexus.com/x/04KUAg).

## Step 5. Add the `prebid_enabled` Custom Category to Placements

Make sure the placements you're using for Prebid are added to the following custom category: `prebid_enabled`.

This will make sure these placements are targeted by the line items you just set up.

It will also make it easy to turn the targeting on and off for a given placement (or placement group) by adding or removing it from the custom category.  This can be very useful when troubleshooting.

## Related Topics

+ [Getting Started with Prebid.js for Header Bidding]({{site.github.url}}/adops.html)

+ [Using Prebid.js with AppNexus as your Ad Server]({{site.github.url}}/dev-docs/examples/use-prebid-with-appnexus-ad-server.html) (Developer example)

</div>
