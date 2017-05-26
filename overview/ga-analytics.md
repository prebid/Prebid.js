---
layout: page
title: Prebid Analytics GA
description: Prebid.js Analytics with GA for Header Bidding

pid: 10

top_nav_section: overview
nav_section: analytics

---
<div class="bs-docs-section" markdown="1">

# Prebid Analytics with GA

> Are my header bidding demand partners generating more revenue for me? If not, is it because of latency or is it due to low bid CPM? How about discrepancy?

##### Prebid Analytics help you better manage your header bidding partners. It includes:

- Bidder bid/win price analysis by geo, domain, with price range distribution.
- Bid latency by bidder, geo, and domain.
- Seamless integration with your Google Analytics account and scheduled reports delivered to your mailbox. 

<br>

#### Example reports by Prebid.js Analytics:

The day starts from making sure the bidders are not generating less revenue:

![Blocking Ad Calls 1]({{ site.baseurl }}/assets/images/blog/analytics/revenue-by-date.png)

Something is not right here - total revenue from yesterday dropped quite a bit. This could be caused by certain bidders were down or experienced technical issues. Let's take a look at the bidder timeout rate:

![Blocking Ad Calls 1]({{ site.baseurl }}/assets/images/blog/analytics/timeout-by-date.png)

Bidder timeout seems okay. The problem might then be caused by bidders' lower bid rate:

![Blocking Ad Calls 1]({{ site.baseurl }}/assets/images/blog/analytics/bidrate-by-date.png)

Here we go. Bidder 1 and 4 bid much less than usual. You may want to drill down even further - Prebid.js Analytics also provides:

- More metrics such as: bid load time, avg bid CPM, bid rate, avg win CPM, win rate.
- Filter the above metrics further by geo, domain, and OS

> **Try out the product and explore the demo dashboard <a href="https://docs.google.com/spreadsheets/d/11czzvF5wczKoWGMrGgz0NFEOM7wsnAISbp_MpmGzogU/edit?usp=sharing" target="_blank">here</a>!** This will be the base of your dashboard!

<br>

#### Histogram analysis of latency and CPM distribution:

To understand exactly how much time per bidder spent, the Analytics Platform allows you to make the below query:

- For country X, what are bidders' bid load time, for mobile traffic on Android only?

<br>

![Blocking Ad Calls 1]({{ site.baseurl }}/assets/images/blog/analytics/loadtime-histogram.png)

You might derive:

- Bidder 1 is really fast, because 1/3 of its bids are in red, which is in the 200 - 300ms response time range.
- Bidder 5 is really slow, as 1/3 of its bids are in 800 - 1000ms.

<br>

Similar query for bidders' bid CPM:

<br>

![Blocking Ad Calls 1]({{ site.baseurl }}/assets/images/blog/analytics/cpm-histogram.png)

> **Try out the product and explore the demo dashboard <a href="https://docs.google.com/spreadsheets/d/11czzvF5wczKoWGMrGgz0NFEOM7wsnAISbp_MpmGzogU/edit?usp=sharing" target="_blank">here</a>!** This will be the base of your dashboard!

<br>

### How does it work?

Prebid.js has a seamless integration with Google Analytics (other analytics software support coming) and Google Spreadsheet.

1. Prebid.js has a built-in plugin for Google Analytics, i.e. zero development work if your site uses Prebid.js.
2. All data are sent as Events to Google Analytics. You can build reports and dashboards there just as you do today with web traffic data.
3. We've also built dashboards and data visulization in Spreadsheet (where all the above diagrams come from). You can copy our demo dashboard and link it to your Google Analytics account in a few minutes!
4. The Spreadsheet dashboard can be scheduled to run every morning (or in other intervals). You can get 7 day revenue lookback, latency/CPM distribution analysis and more every morning!

### How to get started?

Go to our [Analytics Dev Docs](/dev-docs/analytics-ga.html) to get started!

</div>
