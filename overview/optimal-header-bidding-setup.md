---
layout: page
title: Optimal Header Bidding Setup
description: What is the optimal header bidding setup and some common problems.

pid: 10

top_nav_section: overview
nav_section: studies

---

<div class="bs-docs-section" markdown="1">

# Optimal Header Bidding Setup


### What's a good header bidding auction:

<div class="row">
<div class="col-sm-6" markdown="1">

{: .pb-md-img :}
![Optimal Header Bidding Auction]({{ site.github.url }}/assets/images/hb-expert/ideal.png)

</div>

<div class="col-sm-6" markdown="1">


This setup (captured using [Headerbid Expert](https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop)) has demonstrated a few facts that made it an ideal header bidding auction.

**1. Asynchronous Calls**
All calls from the header bidding partners are asynchronous. The calls do not block the page, other header bidding partners, or the ad server from loading.

**2. Timeout**
For each impression, all header bidding partners are given a similar amount of time to respond. Any bid that responds later than the timeout are disregarded.

**3. Adserver**
The ad server sees the impression and header bidding info immediately after all header bidding partners finished responding, or when they timed out, whichever happens sooner.

</div>
</div>

<br>

### Poor Header Bidding Setup Examples:

#### Scenario 1


<div class="row">
<div class="col-sm-6" markdown="1">

{: .pb-md-img :}
![Optimal Header Bidding Auction]({{ site.github.url }}/assets/images/hb-expert/loaded-too-late.png)

</div>

<div class="col-sm-6" markdown="1">

**Problem**: This site is under monetized.

**Cause**: Bidders had less time to bid, because they loaded much later than the other bidders.

**How to fix**: Load all bidders together, or use a framework as Prebid.js which already does this.

</div>
</div>


#### Scenario 2

<div class="row">
<div class="col-sm-6" markdown="1">

{: .pb-md-img :}
![Optimal Header Bidding Auction]({{ site.github.url }}/assets/images/hb-expert/adserver-too-early.png)

</div>

<div class="col-sm-6" markdown="1">


**Problem**: This site is under monetized.

**Cause**: Too many bidder's bids got ignored, because they responded later than the ad server request was sent out.

**How to fix**: Load these bidders earlier in the header, or experiment with extending the timeout without causing impression loss.


</div>
</div>

#### Scenario 3

<div class="row">
<div class="col-sm-6" markdown="1">

{: .pb-md-img :}
![Optimal Header Bidding Auction]({{ site.github.url }}/assets/images/hb-expert/adserver-too-late.png)

</div>

<div class="col-sm-6" markdown="1">

**Problem**: This site may suffer impression loss.

**Cause**: Ad server loaded too late - it waited 1500 ms after the first header bidding request was sent out.

**How to fix**: Set a shorter timeout for the page and remove any bidder that is blocking the ad server from loading.

</div>
</div>

#### Scenario 4


<div class="row">
<div class="col-sm-6" markdown="1">

{: .pb-md-img :}
![Optimal Header Bidding Auction]({{ site.github.url }}/assets/images/hb-expert/bidder-delay-adserver.png)

</div>

<div class="col-sm-6" markdown="1">

**Problem**: This site may suffer impression loss

**Cause**: Bidders responded too late and delayed the ad server from loading.

**How to fix**: Set a shorter timeout for the page.

</div>
</div>

<br>

### Analyze Your Own Site

Add the Plugin [Headerbid Expert](https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop) to your browser.

<div class="pb-md-img">
<a href="https://chrome.google.com/webstore/detail/headerbid-expert/cgfkddgbnfplidghapbbnngaogeldmop" target="_blank"><img src="/assets/images/hb-expert/headerbid-expert-logo.png" alt="headerbid-expert-logo" style="cursor:pointer">
</a>
</div>


</div>



