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

## Overview

At a high level, the way Prebid.js serves a DFP video creative is:

1. Publisher page loads Prebid.js
2. Prebid sends out bid requests for video slot
3. Bidders respond with
    1. VAST URL
    2. Price
4. Prebid creates "master video ad tag" (DFP tag).  For engineering
   instructions, see
   [Show Video Ads with a DFP Video Tag]({{site.github.url}}/dev-docs/show-video-with-a-dfp-video-tag.html).
5. Video player on page loads the master video ad tag
6. DFP selects winning LI based on master video ad tag
7. If Prebid LI is selected, DFP tag returns VAST document where
    1. Prebid LI's VAST tag URL is returned as "VASTAdTagURI"
    2. Creative macros are populated
8. Video player plays VAST content

## Creative Setup

1. In DFP, set the type of creative set to **"Redirect"**:

   ![DFP New Creative Set]({{site.github.url}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-01.png)

2. Set the **VAST tag URL** to 

   ```
   https://ib.adnxs.com/bounce?/getuid?%%DESCRIPTION_URL_UNESC%%
   ```

   ![Creative settings]({{site.github.url}}/assets/images/ad-ops/dfp-creative-setup/dfp-creative-setup-02.png)

3. That's it as far as Prebid setup is concerned.  At this point you
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
