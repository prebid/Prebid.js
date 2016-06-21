---
layout: post
title: Enable Deals in Prebid

description: Enable Deals in Prebid for header bidding.

permalink: /blog/enable-deals

---

Prebid is making it easier for publishers to run deals in header bidding! 

<br>

#### Benefits:

- No development change is required to enable deals! If your pages are using the standard key-values, simply upgrade to the latest prebid.js to enable deals.

- Easy ad ops setup with a complete [step by step guide](/adops/deals.html). Setup deal line items in a few minutes.

<br>

#### How to implement it?

In order to enable deals for prebid, the ad ops setup are slightly different from the standard header bidding setup. Specifically:

+ From the ad ops side, you'll create separate orders and line items that target the deal ID key-values. These line items will be at different priorities than your standard header bidding line items. Follow the step by step [Deals Ad Ops Guide](/adops/deals.html) to implement.

+ From the dev side, if your page is using the standard prebid.js key-values, no change is required. 

Note that the initial list of bidders that support deals are: Pubmatic, TripleLift, AppNexus, bRealTime. More bidder adaptors are implementing deals currently. If you'd like to check progress on a bidder, create a [Github issue](https://github.com/prebid/Prebid.js/issues). 
