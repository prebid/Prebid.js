---
layout: post
title: Send All Bids to Ad Server

description: 
New way to load DFP lightning fast with Prebid for header bidding.

permalink: /blog/dfp-instant-load

---

Prebid is making it easier for publishers to send all header bidding bids, (not just the winning bid), to the ad server. 

<br>

#### Benefits:

The ad server can see all the bids, instead of only the winning bids. For some ad servers, such as DFP, sending all the bids can enable bid landscape type reporting.

<br>

#### How to implement it?

+ Your developers will edit your JS code on the site to call the `pbjs.enableSendAllBids()` method.  For details, see [send all bids to the ad server with Prebid.js](/dev-docs/examples/send-all-bids.html) and the description in the [Publisher API Reference](/dev-docs/publisher-api-reference.html#module_pbjs.enableSendAllBids).

+ From the ad ops side, you'll need to set up one order per bidder, so that each order can have a set of line items using targeting keywords that include the bidder's name.  For example, if you are working with [Rubicon](/dev-docs/bidders.html#rubicon), you would use `hb_pb_rubicon` in your line item's key-value price targeting, and `hb_adid_rubicon` in the creative.

For more details:

- **Ad ops**: Please follow the step by step [Ad Ops Guide](/adops/send-all-bids-adops.html).
- **Dev**: Please follow the line by line code example [documented here](/dev-docs/examples/send-all-bids.html).
