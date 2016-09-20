---
layout: page
title: Setting up Prebid Video in DFP
head_title: Setting up Prebid Video in DFP
description: Setting up Prebid Video in DFP
pid: 3
hide: false
top_nav_section: adops
nav_section: tutorials
---

# Setting up Prebid Video in DFP (Beta)
{: .no_toc}

This page describes how to set up DFP video creatives for use with
Prebid.js.

For DFP line item setup instructions, see the other pages in this section.

For Prebid Video engineering setup instructions, see
[Show Video Ads with a DFP Video Tag]({{site.github.url}}/dev-docs/show-video-with-a-dfp-video-tag.html).

Note that this feature is still in Beta.

* TOC
{:toc}

## Line Item Setup

1. In the DFP "New line item" dialog, select the **"Video VAST"** radio button to set up your Prebid line item to serve video creatives.

2. Add your video player size(s) under **"Master"**.

    ![DFP New Line Item]({{site.github.url}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-03.png)

3. Other line item settings and key/ value targeting are identical to [those recommended for Prebid display]({{site.github.url}}/adops/step-by-step.html#step-1-add-a-line-item).  Be sure to duplicate your line item and video creative for each Prebid price bucket you intend to create!

## Creative Setup

1. Enter the **"New creative set"** dialog by selecting **new creative set** from each line item you created above. 

2. Select **"Redirect"** as the **creative set type**:

   ![DFP New Creative Set]({{site.github.url}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-01.png)

3. Set the **VAST tag URL** to 

   ```
   https://ib.adnxs.com/bounce?/getuid?%%DESCRIPTION_URL_UNESC%%
   ```

4. Set the **duration** to **1**

   ![Creative settings]({{site.github.url}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-02.png)

5. That's it as far as Prebid setup is concerned.  At this point you
   can add any other options you would normally use, e.g., labels or
   tracking URLs.

## Further Reading

The links below have more information about header bidding video
setups and DFP video ads.

### DFP
{: .no_toc}

+ [Create a Master Video Tag Manually](https://support.google.com/dfp_premium/answer/1068325?hl=en&ref_topic=2480647)

+ [Add Key-Values to a Master Video Ad Tag](https://support.google.com/dfp_premium/answer/1080597)

+ [DFP Macros](https://support.google.com/dfp_premium/answer/1242718)
