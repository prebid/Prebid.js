---
redirect_from: "/getting-started.html"
layout: page
title: Getting Started
head_title: Getting started with Prebid.js for header bidding
description: An overview of Prebid, how it works, basic templates and examples, and more.
pid: 10
top_nav_section: overview
nav_section: intro
---

<div class="bs-docs-section" markdown="1">

# Getting Started
{:.no_toc}

This page has high-level instructions for getting started with Prebid.js.

{: .alert.alert-success :}
If you're working on a mobile app, check out [Prebid Mobile]({{site.baseurl}}/prebid-mobile)!

* TOC
{:toc}

## Overview

At a high level, the way Prebid.js works is:

- You add some code to your page (Prebid.js) that runs an auction among a few demand sources to show ads on the page
- Prebid.js calls each demand source in (default random) order
- The demand sources return bids to the page
- Prebid.js forwards those bids along to your ad server
- Your ad server chooses the winning bid to serve based on line items targeting keywords that match price ranges
- The page serves the creative from the winning bid

For a more in-depth explanation of how header bidding works, see [Header Bidding Explained Step-by-Step](http://www.adopsinsider.com/header-bidding/header-bidding-step-by-step/).

## Step 1. Engineering adds Prebid code to the page

As mentioned above, your page has to be set up with Prebid.js to run an auction among several demand sources (bidders).

Follow the instructions in [Getting Started for Developers]({{site.baseurl}}/dev-docs/getting-started.html).

## Step 2. Ad ops configures your ad server

On the ad server side, you need to set up line items that can bid on each of the possible price ranges a bid could fall into.  These are usually referred to elsewhere on this site as "price buckets".

To simulate a dynamic auction using static line items, each line item targets a narrow portion of the entire range.

To see how it works, follow the instructions in [Send all bids to the ad server - Ad Ops setup]({{site.baseurl}}/adops/send-all-bids-adops.html).  These instructions correspond with the code sample in the developer setup in the previous step.

## Further Reading

For more information, check out the following:

+ [Before You Start]({{site.baseurl}}/adops.html): Learn about considerations of your Prebid.js setup such as price granularity, line item configuration, and more.
+ [Docs by Ad Server]({{site.baseurl}}/adops/docs-by-ad-server.html): Ad ops docs arranged by ad server.
+ [Docs by Format]({{site.baseurl}}/dev-docs/docs-by-format.html): Engineering and ad ops docs arranged by ad format (video, native, etc.).

</div>
