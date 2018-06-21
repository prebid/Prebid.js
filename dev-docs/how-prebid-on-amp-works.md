---
layout: page
title: How Prebid on AMP Works
description: How Prebid on AMP Works
pid: 0
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-amp
---

<div class="bs-docs-section" markdown="1">

# How Prebid on AMP Works
{: .no_toc}

{: .pb-img :}
![Prebid AMP Overview Diagram]({{site.github.url}}/assets/images/dev-docs/amp-rtc.png)

This page has information about how Prebid works with AMP to show Prebid ads on AMP pages.

The diagram below shows how the pieces fit together:

1. AMP runtime calls Prebid Server URL, including macros.

2. Prebid Server retrieves demand partner configuration.

3. Prebid Server sends bid requests to demand partners and caches bid responses.

4. Prebid Server responds to AMP runtime with key-value targeting.

5. AMP Network constructs ad request URL and Prebid creative is served.

6. Creative content is retrieved from cache and renders.


## Related Topics

+ [Show Prebid Ads on AMP Pages]({{site.github.url}}/dev-docs/show-prebid-ads-on-amp-pages.html) (Developers)
+ [Setting up Prebid for AMP in DFP]({{site.github.url}}/adops/setting-up-prebid-for-amp-in-dfp.html) (Ad Ops)

</div>

<!-- Reference Links -->

[PBS]: {{site.baseurl}}/dev-docs/get-started-with-prebid-server.html
[RTC-Overview]: https://github.com/ampproject/amphtml/blob/master/extensions/amp-a4a/rtc-documentation.md
