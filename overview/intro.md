---
layout: page
title: What is Prebid?
description: An overview of Prebid, how it works, basic templates and examples, and more for header bidding.
pid: 0
is_top_nav: yeah
top_nav_section: overview
nav_section: intro
---

<div class="bs-docs-section" markdown="1">

# What is Prebid?
{:.no_toc}

Prebid is a free open source library and community that helps publishers implement Header Bidding on their websites & apps.

Header Bidding (also known as header auctions, parallel bidding, or header bidding) is a technique that involves running SSP & Ad Exchange code directly on page so publishers can receive bids on their inventory that may be unavailable through their primary ad server and exchange.

The returned bids are then passed into the ad server so they can compete with direct demand and the primary ad server's exchange on a level playing field.

* TOC
{:toc}

## A Brief History of Header Bidding

The early days of Header Bidding were dominated by bad practices, closed proprietary tech, poor standards, and little to no cooperation between competing companies. The result for publishers was headache - having to manually patch together various solutions from different companies and hope their developer didn't spend 3 weeks coding the wrong thing.

Launched in 2015, Prebid changed the game and made header bidding easy for publishers. By creating a simple, open tech layer upon which companies could add their code to a standard but optimized foundation, Prebid made it easier to implement header bidding the right way, and offered the largest repository of working adapters.

Today, Prebid is the most widely used Header Bidding "container" or "wrapper" on the web. The ecosystem supports 60+ demand partners, numerous publishers, and analytics providers. 

## Benefits of Prebid

Prebid offers publishers multiple benefits designed to foster a better header bidding experience. The highlights include:

1. Free & open source, so anyone can contribute or review the code
2. Largest repository of working Header Bidding Adapters
3. Asynchronous and single time-out to provide a better user experience
4. Prebid Server to run faster auctions with more partners
5. Tools & analytics to optimize your setup
6. Multiple options on formats (display, video, native) & channels (mobile, desktop)
7. Helpful community with lots of free setup advice, as well as professional setup & services

## How Does Prebid Work?

At a high level, header bidding involves just a few steps:

1. The ad server's tag on page is paused, bound by a timer, while the Prebid library fetches bids and creatives from various SSPs & exchanges you want to work with.

2. Prebid passes information about those bids (including price) to the ad server's tag on page, which passes it to the ad server as query string parameters.

3. The ad server has line items targeting those bid parameters.

4. If the ad server decides Prebid wins, the ad server returns a signal to Prebid telling the library to write the winning creative to the page. All finished!

![Ad Ops Diagram]({{ site.github.url }}/assets/images/adops-intro.png)

The Prebid library is composed of two pieces: the Core wrapper code and the Adapters a publisher wants to work with.

## Prebid Core

The Prebid Core is intended to be lightweight, while achieving all the foundation a good header bidding wrapper needs to provide, including:

+ Sending bid requests to the partners you want
+ Handling the bids they return
+ Sending said bids into the ad server
+ Logging events for reporting
+ ... and so on

We want Prebid Core to be fast, fair, and open because it represents the header bidding wrapper itself.

Before you can add a header bidding adapter, publishers need at least the Prebid Core installed on their website or app.

## Prebid Adapters

The Prebid Adapters plug into Prebid Core and are meant to be interchangeable depending on who the publisher wants to work with. There are two types of adapters: demand and analytics.

Demand Adapters are supposed to represent the SSPs & Exchanges you want to work with. There are currently over 60 demand adapters. This set of working header bidding integrations is part of what makes Prebid so special. Each company maintains their own Prebid adapter to provide the freshest code for publishers, rather than a proprietary wrapper solution trying to reverse engineer another company's adapter. It's a win-win for everyone.

Analytics adapters are relatively new, but offer the ability to learn more about latency, revenues, bid rates, etc. Please see our [analytics page]({{site.github.url}}/dev-docs/integrate-with-the-prebid-analytics-api.html) for more information.

## Further Reading

+ [Getting Started]({{site.github.url}}/overview/getting-started.html)

</div>
