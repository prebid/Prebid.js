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
{:.no_toc}

This page lists some common issues publishers run into when setting up Prebid.

* TOC
{:toc}

## Price Granularity Mismatch
{:toc}

For example, if your site's price granularity setup is at $0.10 increment, but the line items are expecting $0.50 increments, bid prices such as $0.71 or $0.99 would not match any line items. 

## Non-Prebid line items are at higher priority
{:toc}

If you have sponsorship line items running, even with lower bid prices, the Prebid line items won't win. To find out whether you have higher-priority line items running, use your ad servers' debugging tools, such as the [Google Publisher Console](https://support.google.com/dfp_sb/answer/2462712?hl=en&visit_id=1-636195762630970892-522080225&rd=1).

## Bids are coming back, but ads don't show up
{:toc}

Check the bid prices. If they are low and are getting reduced to $0 due to price granularity settings, your ad server may choose not to serve them (or you may not have line items targeting $0 bids in your ad server).  For example, if you set a $0.50 price granularity and get a bid price of $0.40, the actual price key-value that your ad server will see is $0.00.

## Related Reading
{:toc}

+ [Prebid FAQ]({{site.github.url}}/dev-docs/faq.html)
+ [Prebid Tips for Troubleshooting]({{site.github.url}}/dev-docs/toubleshooting-tips.html)

</div>
