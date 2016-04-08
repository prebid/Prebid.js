---
layout: page
title: Before you start
head_title: Getting Started with Prebid.js for Header Bidding
description: An overview of Prebid.js, how it works, basic templates and examples, and more.
pid: 0
is_top_nav: yeah
permalink: /adops.html
top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Before You Start

> Here are a few things to understand and to decide before implementing Prebid.js. Make sure you understand [how Prebid.js works](/overview/intro.html) before moving on.

### 1: Decide on price bucket granularity

With pre-bid, you’ll need to setup line items to tell your ad server how much money the “bidder” demand is worth to you. This process is done via key-values.

Example:


* Prebid.js is going to call your bidders for their price, then pass it into your ad server on the query-string. You want to target this bid price with a line item that earns you the same amount if it serves.

* If you had 1-line item for every bid at a penny granularity of $0.01, $0.02, $0.03, ..., 1.23, ..., $4.56 you’d need 1,000 line items just to represent bids from $0-$10. We call this the “Exact” granularity option.

* Creating 1,000 line items can be a hassle, so publishers typically use price buckets to represent price ranges that matter. For example, you could group bids into 10 cent increments, so bids of $1.06 or $1.02 would be rounded down into a single price bucket of $1.00.

Our recommendation is to start with $1 or 10 cent granularity until you’re more comfortable with Prebid.js. At $1, you only need to setup 10-20 line items – easy. When you’re ready, get more granular with the price buckets to improve yield.

<br>

### 2: One set of line items for all bidders vs. for each bidder

+ <a href="#all-bidders">One set of line items for all bidders</a>
+ <a href="#per-bidder">One set of line items per bidder</a>

#### One set of line items for all bidders <a name="all-bidders"/>

One set of line items for all bidders is the recommended way of setting up your line items.  Choose this option if you prefer an easier, low-maintenance setup:

- It's quicker and easier to setup, because you only have to create one set of line items.

- It's easier to maintain because adding more bidders requires no change to your line item setup.

- It's less error-prone because you only need to maintain 3 keywords:

{% include default-keyword-targeting.md %} 

For instructions on setting up pre-bid with one set of line items for all bidders, see [Step by Step guide to DFP setup](/adops/step-by-step.html).

#### One set of line items per bidder <a name="per-bidder"/>

Choose one set of line items for each bidder if you:

- Have to rely on line item reporting (not query string reporting) to get winning bid by bidder analytics
    - With one set of line items for all bidders, Prebid.js only sends the highest bid to the ad server (and is thus not able to send the other bids if you have more than 1 bidder in a header auction). This is sufficient if the winning bids matter most to you. For example, a bidder bidding 100% of time but losing in every auction still has a fill rate of 0%. However, if having access to all bid information is important to you, use one set of line items for each bidder.

- Require bid landscape data for header bidding partners
    - With one set of line items for all bidders, Prebid.js sends the bidder information (Which bidder has the highest price) via a keyword `bidder=bidder_name`. To run a report to attribute winning bids to bidders, you will need to rely on your ad server's keyword reports. DFP supports this, but some ad servers do not. DFP does not support running reports for more than 2 keywords. Therefore, if you have existing reports that already rely on keywords, and you want to add a winning bid by bidder dimension, use one set of line items for each bidder.

For more information, see [How to simplify line item setup](/overview/how-to-simplify-line-item-setup.html).

<br>

### 3: Work together with your dev team

Implementing header bidding requires much more collaboration with your dev team than normal Ad Ops setup. For example:

- Setting up price granularity requires you and the dev team working together to ensure the price buckets match. We have seen cases when the code on page sends $0.10 increments, while the line item setup expects $0.50 increments. This results in the ad server not catching 80% of the bids.
