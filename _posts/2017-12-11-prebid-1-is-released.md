---
layout: post
title: Prebid.js 1.0 is Released!
head_title: Announcing the release of Prebid.js 1.0
description: This week, we're pleased to announce the release of Prebid.js 1.0
permalink: /blog/prebid-1-is-released
---

We're pleased to announce the release of [Prebid.js 1.0!](https://github.com/prebid/Prebid.js/releases/tag/1.0.0) [Download it]({{site.baseurl}}/download.html) or [build it from master](https://github.com/prebid/Prebid.js/blob/master/README.md#Build)!

As a publisher, you can look forward to the following improvements when adopting Prebid.js 1.0:

- Universal ad unit type support for [native](http://prebid.org/dev-docs/show-native-ads.html), [video](http://prebid.org/dev-docs/show-video-with-a-dfp-video-tag.html), and banner
- Faster performance due to using fewer JS libraries and simplifying adapter code
- Module integrations that support things like:
    - [*Multiple currencies*]({{site.baseurl}}/dev-docs/modules/currency.html)
    - [*User syncing*]({{site.baseurl}}/dev-docs/publisher-api-reference.html#setConfig-Configure-User-Syncing)
    - [*Simplified config APIs*]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.setConfig)
- Better support for single page applications/sites (concurrency)
- Better [size mapping and responsive site support](http://prebid.org/dev-docs/publisher-api-reference.html#setConfig-Configure-Responsive-Ads)

For more information, see:

- [Prebid 1.0 Publisher API Changes]({{site.baseurl}}/dev-docs//prebid-1.0-API.html): A complete list of all 1.0 API changes
- [Publisher API Reference]({{site.baseurl}}/dev-docs/publisher-api-reference.html): Updated to mark all deprecated methods that are no longer available in version 1.0
