---
layout: page
title: Prebid Mobile Overview
description: Prebid Mobile Overview
pid: 0
is_top_nav: yeah
top_nav_section: prebid-mobile
nav_section: prebid-mobile
---

<div class="bs-docs-section" markdown="1">

# Prebid Mobile Overview
{:.no_toc}

Prebid Mobile provides libraries for Android and iOS that provide an end-to-end open-source header bidding solution for mobile app publishers.

Benefits and features include:

- Single integration point with Prebid Server with direct access to more mobile buyers
- Server side configuration management for bidders and other settings, no need to update your app to make changes
- Minimized latency due to background pre-caching of creatives
- Increased yield due to increased competition between demand sources
- A lightweight library that uses simple query strings to send ad requests and to pass results

### How it Works

The Prebid Mobile SDK sends requests to Prebid Server to help app developers to access additional demand that is not available from their mobile ad network.

This means you **must** have a Prebid Server account in order to use Prebid Mobile. To set up your Prebid Server account for Prebid Mobile, refer to [Get Started with Prebid Server]({{site.github.url}}/prebid-mobile/prebid-mobile-pbs.html)

 1. As the Prebid Mobile module runs, it fetches bids from your demand partners integrated with Prebid Server.
 2. Our Prebid Mobile module sends this bid information to your primary ad server SDK using key/value targeting.
 3. The primary ad server SDK sends a request to the primary ad server including these custom parameters.  These parameters will match the key/value targeting previously configured on Prebid line items by your ad ops teams.
 4. If the Prebid Mobile bid wins, the primary ad server returns our creative JS to your primary ad server SDK's ad view.
 5. The creative JS in the ad view fetches the actual cached creative content from Prebid Server. When this happens, the impression is counted.

{: .pb-img.pb-lg-img :}
![How Prebid Mobile Works - Diagram]({{site.baseurl}}/assets/images/prebid-mobile/prebid-mobile.png)

</div>
