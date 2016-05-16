---
layout: page
title: Common Issues
description: Common Issues for developers implementing Prebid.js Header Bidding.
pid: 10

top_nav_section: dev_docs
nav_section: troubleshooting

---

<div class="bs-docs-section" markdown="1">

# Common Issues

**1. Price Granularity Miss Match**

For example, if your site's price granularity setup is at $0.10 increment, but the line items are expecting $0.50 increments, bid prices such as $0.71 or $0.99 would not match any line items. 

<br>

**2. Non prebid line items are at higher priority**

If you have sponsorship line items running, even with lower bid prices, the prebid line items won't win. Use your ad server debug tool to find this out (such as the [DFP developer console documented](/dev-docs/toubleshooting-tips.html)).

<br>

**3. Bids coming back, but ads don't show up**

Check the bid prices. If they are low and are reduced to $0 due to price granularity settings, your ad server may not choose to serve them (or you may not have $0 line items in your ad server). For example, at a $0.50 price granularity and a bid price being $0.40, the actual price key value that ad server will see is $0.00.


</div>