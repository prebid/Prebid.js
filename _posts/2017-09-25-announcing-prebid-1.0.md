---
layout: post
title: Announcing Prebid.js 1.0
head_title: Announcing Prebid.js 1.0 release milestone
description: This week, we're pleased to announce the Prebid.js 1.0 release milestone
permalink: /blog/announcing-prebid-1-0
---

## Prebid 1.0 - here at last

It's been a long time since we [first released Prebid.js](http://prebid.org/blog/happy-birthday-prebid-js); so long, in fact, that people have questioned why were are still a [pre 1.0 library.](https://github.com/prebid/Prebid.js/issues/891) While I'd like to think it's because we had everything right from the start - we definitely did not - we've been hard at work to make things even better. We've also grown a lot since then, and even [made some friends along the way](http://prebid.org/blog/announcing-prebid-org).

Suffice to say, we are ready to cross over the 1.0 milestone :rocket:. A great part about us working on the Prebid 1.0 journey is that we ended up delivering many of the original ideas already, instead of waiting for the big release. So, some of these features are already inside Prebid.js today.


## What to expect

The best part of Prebid.js has, and always will be, the community that supports it. Since the library has many open ended APIs, we haven't had to change many core things about the library. So you won't have to do a whole lot to get a lot. Here are some things that are changing:

As a **publisher**, you can look forward to the following when adopting Prebid.js 1.0:

- Universal adunit type support for Native, Video and banner.
- Faster performance due to cutting out of additional JS libraries and simplified adapter code.
- Module integration support for things like [*multiple currency support*](http://prebid.org/dev-docs/modules/currency.html), [*user syncing*](http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.userSync), [*simplified config APIs*](http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.setConfig). 
- Better support for single page applications/sites (concurrency).
- Better size mapping and responsive site support.

**If you have a Demand Adapter that works with Prebid.js -  we need your help to work with Prebid 1.0!**

- Once you update your adapter to work with the base adapter in 1.0 - you will be able to integrate with more ad formats easier such as Native and Video. 
- We have broken down the parts of what an adapter does into separate functions - this will make it easier to integrate and test your adapter.
- We have some additional requirements on what needs to be returned and what kind of endpoints are supporteed (only XHR). Please see the full [adapter guide](http://prebid.org/dev-docs/bidder-adapter-1.html) for details.

## What's next

We've released [Prebid 1.0!](https://github.com/prebid/Prebid.js/releases/tag/1.0.0) Download or build it now from master!

## How to get involved

We **need** the community's help to successfully launch Prebid.js 1.0. We have been working hard to make sure that it will be as painless as possible to transition, while still being able to make some needed breaking changes. 

Please let us know your feedback and how we can make Prebid.js and the Prebid community even better!

Prebid 1.0 Documentation:

- [Prebid publisher guide](http://prebid.org/dev-docs//prebid-1.0-API.html)
- [Prebid adapter guide](http://prebid.org/dev-docs/bidder-adapter-1.html)

As always, we love PRs. Thanks for contributing. 

By [Matt Kendall](https://github.com/mkendall07), PMC Chair, Prebid.js & Engineering Manager, AppNexus. 
