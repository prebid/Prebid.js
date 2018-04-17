---
layout: page
title: Setting up Prebid Video in DFP (Beta)
head_title: Setting up Prebid Video in DFP
description: Setting up Prebid Video in DFP
pid: 3
hide: false
top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Setting up Prebid Video in DFP (Beta)
{: .no_toc}

This page describes how to set up video creatives in DFP for use with Prebid.js.

For general DFP line item setup instructions, see the other pages in this section.

For engineering setup instructions, see
[Show Video Ads with a DFP Video Tag]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html).

* TOC
{:toc}

## Line Item Setup

- In the **New line item** dialog, under **Inventory sizes**, select the **Video VAST** radio button.

- In the **Master** text area, add your video player size(s).

{: .pb-img.pb-md-img :}
![DFP New Line Item]({{site.baseurl}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-03.png)

Other line item settings and key/value targeting are the same as [those recommended for Prebid display]({{site.baseurl}}/adops/step-by-step.html#step-1-add-a-line-item), with one exception:

+ By default, Prebid.js caps all CPMs at $20.  As a video seller, you may expect to see CPMs higher than $20.  In order to receive those bids, you'll need to make sure your dev team implements custom price buckets as described in the [engineering setup instructions]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html).  Once those changes are made on the engineering side, there should be no changes required from the ad ops side to support CPMs over $20.

{: .alert.alert-success :}
Be sure to duplicate your line item and video creative for each Prebid price bucket you intend to create.

## Creative Setup

1\. For each line item you created above, select **new creative set**.

2\. In the dialog that appears, set the **creative set type** to **"Redirect"**

3\. Set the **VAST tag URL** to:

Prebid.js versions 1.6+, 0.34.6+:
{% highlight html %}
   https://prebid.adnxs.com/pbc/v1/cache?uuid=%%PATTERN:hb_cache_id%%
{% endhighlight %}

Prebid.js versions 1.0-1.5, 0.x-0.34.5:
{% highlight html %}
   https://prebid.adnxs.com/pbc/v1/cache?uuid=%%PATTERN:hb_uuid%%
{% endhighlight %}

   {: .alert.alert-warning :}
   This creative URL is **required** in order to show video ads.  It points to
   a server-side cache hosted by Prebid Server.

   {: .alert.alert-info :}
   **Prebid Cache and the VAST creative URL warning**  
   DFP will show you a warning that fetching VAST from the creative
   URL failed.  This is expected, since the creative URL above points
   to a server-side asset cache hosted by Prebid Server.

   {: .alert.alert-warning :}
   Note that `hb_cache_id` will be the video ad server targeting variable going forward.
   In previous versions, mobile used `hb_cache_id` and video used `hb_uuid`. There will be a
   transition period where both of these values are provided to the ad server.
   Please begin converting video creatives to use `hb_cache_id`.

4\. Set the **duration** to **1**

The resulting creative should look something like the following:

{: .pb-img.pb-md-img :}
![DFP Video Creative Setup]({{site.baseurl}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-04.png)

That's it as far as Prebid setup is concerned.  At this point you can add any other options you would normally use, e.g., labels or tracking URLs.

## Further Reading

+ [Show Video Ads with DFP]({{site.baseurl}}/dev-docs/show-video-with-a-dfp-video-tag.html) (Engineering setup)
+ [Create a Master Video Tag Manually](https://support.google.com/dfp_premium/answer/1068325?hl=en&ref_topic=2480647) (DFP)
+ [Add Key-Values to a Master Video Ad Tag](https://support.google.com/dfp_premium/answer/1080597) (DFP)
+ [DFP Macros](https://support.google.com/dfp_premium/answer/1242718) (DFP)

</div>
