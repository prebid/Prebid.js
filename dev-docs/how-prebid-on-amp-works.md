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

This page has information about how Prebid.js works with AMP to show Prebid ads on AMP pages.

The diagram below shows how the pieces fit together.  In the list below, the items with numbers correspond with the numbered actions in the diagram.

1. The content page (`publisher.com/amp_page.html` in the diagram) is just a normal AMP page that serves over HTTPS
    + It has a `meta` element pointing to the cross-domain host where Prebid.js runs (in `remote.html`).  It needs to be a cross-domain host so that Prebid.js can execute in a secure environment that doesn't affect the AMP page.
    + It uses the `amp-ad` element, which loads an iframe from a different domain (which is what we call the "cross-domain host" below).  This element contains some JSON configuration info which is sent to the cross-domain host.

2. The creative (`creative.html` in the diagram) is what your ad ops team loads into your ad server.  It's a mostly standard Prebid.js creative with a few tweaks to allow it to work in AMP-land, and it's what serves into the iframe defined by the `amp-ad` element.

3. When the creative is delivered into the `amp-ad` element, it posts a message to the cross-domain host (`remote.html`) asking for Prebid creatives.

4. The cross-domain host (`amp.publisher.com/remote.html` in the diagram) runs a Prebid auction, fetching creatives for each of the ad slots defined in the content page.

5. The cross-domain host, having run the auction across N bidders and fetched creative content for each ad slot, posts a message back to the creative with the actual content to render.

6. The creative renders the creative content it receives from the cross-domain host, and an ad is shown to the user.

For more information, see [the AMP example in our Github repo](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp) (which uses the same filenames as in the diagram below), and the **Related Topics** list at the bottom of this page.

![Prebid AMP Overview Diagram]({{site.github.url}}/assets/images/dev-docs/prebid-amp.png)

## Related Topics

+ [Show Prebid Ads on AMP Pages]({{site.github.url}}/dev-docs/show-prebid-ads-on-amp-pages.html) (Developers)
+ [Setting up Prebid for AMP in DFP]({{site.github.url}}/adops/setting-up-prebid-for-amp-in-dfp.html) (Ad Ops)

</div>
