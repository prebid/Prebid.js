---
layout: page
title: Setting up Prebid for AMP in DFP
head_title: Setting up Prebid for AMP in DFP
description: Setting up Prebid for AMP in DFP
pid: 3
hide: false
top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Setting up Prebid for AMP in DFP
{: .no_toc}

This page describes how to set up a line item and creative to serve on AMP pages with Prebid.js.

{: .alert.alert-success :}
For engineering setup instructions, see [Show Prebid Ads on AMP Pages]({{site.github.url}}/dev-docs/show-prebid-ads-on-amp-pages.html).

* TOC
{:toc}

## Line Item Setup

In addition to your other line item settings, you'll need the following:

+ Enter the **Inventory Sizes** of the creatives you want the line item to use, e.g., *300x250*, *300x50*, etc.

+ Set the **Type** to *Price Priority*

+ Set **Display creatives** to *One or More*.

+ Set **Rotate creatives** to *Evenly*.

+ In the targeting section, select **Key-values** targeting.  You'll need to coordinate with your development team on what key-values you want to target.

Save your line item and add a creative.

## Creative Setup

On the new creative screen, select the **Third party** creative type.

Ensure that the **Serve into a SafeFrame** box is checked.

Enter the below code snippet in the **Code snippet** text area.

{: .alert.alert-success :}
You can always get the latest version of the creative code below from [the AMP example creative file in our GitHub repo](https://github.com/prebid/prebid-universal-creative/blob/master/template/amp/dfp-creative.html).

{% include dev-docs/amp-creative.md %}

## Further Reading

+ [Show Prebid Ads on AMP Pages]({{site.github.url}}/dev-docs/show-prebid-ads-on-amp-pages.html)
+ [How Prebid on AMP Works]({{site.github.url}}/dev-docs/how-prebid-on-amp-works.html)

</div>

<!-- Reference Links -->

[PBS]: {{site.baseurl}}/dev-docs/get-started-with-prebid-server.html
[RTC-Overview]: https://github.com/ampproject/amphtml/blob/master/extensions/amp-a4a/rtc-documentation.md
