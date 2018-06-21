---
layout: page
title: Prebid.js Troubleshooting Guide
head_title: Prebid.js Troubleshooting Guide
description: How to troubleshoot Prebid.js from the perspective of an ad call from start to finish.
pid: 10
top_nav_section: dev_docs
nav_section: troubleshooting
---

<div class="bs-docs-section" markdown="1">

# Prebid.js Troubleshooting Guide
{:.no_toc}

Use this guide to troubleshoot your Prebid.js integration. You can follow this guide sequentially to determine if Prebid.js is working as intended on your website. It takes you through the ad call from start to finish.

* TOC
{:toc}

## Check Your Prebid Version

The open source code in Prebid.js can change frequently. To see what version of Prebid.js you are using, open your browser console and type `pbjs.version;`.

You can reference this against the changes listed in the [Prebid.js Release Notes](https://github.com/prebid/Prebid.js/releases).

## Delay the Ad Server Call so Key-Values can be Set

Make sure that you delay any calls to the ad server. This allows all of the key-values to be set before the auction in the ad server occurs.

Within DFP, this is achieved by adding the following code to your page.  It should be called before any of the ad server code to make sure it runs first.

{% highlight js %}
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];
googletag.cmd.push(function() {
     googletag.pubads().disableInitialLoad();
});
{% endhighlight %}

## Check the Ad Units on the Page

Make sure the ad units configured for Prebid.js match up with the ad units that have been set up in your ad server.

You can review what ad units have been configured for Prebid by opening your browser console and typing `pbjs.getBidResponses();`. This will show a list of what div IDs are present:

{: .pb-lg-img :}
![pbjs.getBidResponses() showing ad units in browser console]({{site.github.url}}/assets/images/overview/prebid-troubleshooting-guide/ad-units.png "pbjs.getBidResponses() showing ad units in browser console")

## List your Bids and Bidders

Open your browser console and type `pbjs.getBidResponses();` to see a list of the ad units that have been configured.  This also shows what bids have been returned from each of the bidder partners in chronological order as shown in the screenshot below.

To see all of the winning bids, open your browser console and type [`pbjs.getAllWinningBids();`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.getAllWinningBids).

{: .alert.alert-danger :}
Keep in mind that any bid responses that come back after [the timeout you configured during setup]({{site.github.url}}/dev-docs/getting-started.html#set-the-ad-server-timeout) will not be sent to the ad server.

{: .alert.alert-success :}
You can also [print this data to the console in table format](http://prebid.org/dev-docs/toubleshooting-tips.html#see-all-bids-in-the-console) for easier reading.

{: .pb-lg-img :}
![pbjs.getBidResponses() in browser console]({{site.github.url}}/assets/images/overview/prebid-troubleshooting-guide/bids.png "pbjs.getBidResponses()")

## Verify your Ad Server Targeting

After the auction on page has occurred, Prebid.js will set key-value targeting for the ad server for those bids that have been returned before the [timeout you configured during setup]({{site.github.url}}/dev-docs/getting-started.html#set-the-ad-server-timeout).

To see what values Prebid.js intends to send to the ad server, open your browser console and type `pbjs.getAdserverTargeting();` as shown below:

{: .pb-lg-img :}
![pbjs.getAdserverTargeting() in browser console]({{site.github.url}}/assets/images/overview/prebid-troubleshooting-guide/ad-server-target.png "pbjs.getAdserverTargeting()")

{: .alert.alert-danger :}
Note that if no bids are returned, no key-values will be set. You may need to increase your timeout setting or reach out to your bidder partners to determine why no bid responses are being sent.

## Check the Ad Server's Auction

After the Prebid auction has occurred and key-values have been set for the ad server, the ad server will use the line items targeting those key-values within its auction.

If you're using DFP, you can verify this by using the [Google Publisher Console](https://support.google.com/dfp_sb/answer/2462712?hl=en), which can be accessed as follows:

+ Open your browser's console and type `googletag.openConsole();`

+ Append `googfc` as a query parameter to the URL.  Then, click the *Delivery Diagnostics* option to reveal most of the information described below.

To make sure your ad server is set up correctly, answer the following questions:

+ **How many ads have been fetched for an ad unit?** Ideally, only 1 ad will be requested on page load. If not, check for unnecessary extra calls to the ad server in your page's source code.  
  {: .pb-med-img :}
  ![Google Publisher Console Ad fetch count]({{site.github.url}}/assets/images/overview/prebid-troubleshooting-guide/ad-server-1.png "Google Publisher Console Ad fetch count")

+ **Are the key-values being set in the ad server?** If not, review your page's source code to ensure that the Prebid auction completes **before** sending the key-value targeting to the ad server.  
  {: .pb-lg-img :}
  ![DFP Delivery Troubleshooting]({{site.github.url}}/assets/images/overview/prebid-troubleshooting-guide/ad-server-2.png "DFP Delivery Troubleshooting")

+ **Has the ad server order been activated?** If not, you'll have to activate the order to see Prebid-delivered ads.

+ **Are there other higher priority campaigns running within your ad server?** Higher priority campaigns will prevent Prebid ads with a higher CPM bid from winning in the ad server's auction. For testing purposes, you may want to pause these campaigns or have them excluded when the prebid key values are present.

+ **Is there other remnant inventory in the ad server with a higher CPM that is winning?** To test for this, you may want to use a test creative set up within a bidder partner that has a high CPM or create artificial demand with a [bidCPMadjustment]({{site.github.url}}/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings).

+ **Have you set up all of the line items in the ad server to match the [setPriceGranularity setting]({{site.github.url}}/dev-docs/examples/custom-price-buckets.html) within Prebid.js?**  All of the line items that correspond to your price granularity settings must be set up in your ad server.  When there are gaps in the price granularity of your line item setup, bids will be reduced according to the size of the gap.  For example, with [dense granularity]({{site.github.url}}/dev-docs/publisher-api-reference.html#dense-granularity), a $3.32 bid will be sent to the ad server as $3.30.

## Look for the Winning Bid

When a prebid line item wins the ad server's auction, a `renderAd` event will be logged in the browser console. To see this event, you need to do either of the following before the auction:

+ Have typed `pbjs.logging=true` into your your browser console

+ Appended `pbjs_debug=true` as a query parameter to the URL

When this event is logged, it shows that Prebid.js has requested to render the ad from the winning bidder partner, and that this partner's bid has won both the Prebid and ad server auctions.

{: .pb-lg-img :}
![renderAd event in browser console]({{site.github.url}}/assets/images/overview/prebid-troubleshooting-guide/render-ad.png "renderAd event in browser console")

## Related Topics

+ [Developer Troubleshooting Tips]({{site.github.url}}/dev-docs/toubleshooting-tips.html)

+ [Common Setup Issues]({{site.github.url}}/dev-docs/common-issues.html)

</div>
