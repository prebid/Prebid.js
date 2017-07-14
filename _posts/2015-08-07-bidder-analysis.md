---
layout: post
title: Bidder Analysis on price and latency
head_title: Header Bidding Bidder Analysis on Price and Latency

description: An analysis of header bidding bidders' price granularity and latency report.

permalink: /blog/header-bidding-bidder-analysis

---

{: .alert.alert-warning :}
The content on this page is from 2015 and is now obsolete.

While implementing Prebid.js' adaptors for different bidders, we've noticed not all bidders return exact price to the publisher's page. Different bidders also have vastly different response latency. We hope the analysis here can help you make smart decisions when implementing header bidding. 

{: .table .table-bordered .table-striped }
|	Bidder |	Price 	|	*Latency (rough estimate)   |
| :----  |:--------| :-------|
| AOL | Unknown | Unknown |
| AppNexus | Exact | 200ms, however async calls have to be made for multiple slots |
| Casale | Exact | Unknown | 
| Criteo | Estimated | 200ms |
| OpenX | Exact | 500ms |
| Pubmatic | Exact | 400ms |
| Rubicon | Exact | 400ms |
| Sonobi | Exact | Unknown |
| YieldBot | Estimated at $1.00 increment | Unknown |

*Note that the above latency estimate was done in New York, US with fast Internet connection. To provide more accurate report, publishers can implement latency trackers through the prebid.js API.

### Live Test

{% include live_demo.html %}

#### The above ad is auctioned with Prebid.js.

* **Hover over** the timeline bars to discover how long each bidder takes.
* Ad server is set to only wait for **up to 400ms**. If all bidders respond faster than that, Prebid.js will load the ad server early. If not, Prebid.js will ignore bidders that took too long. 
* You may notice Javascript cannot initiate all bidder calls at once. To prevent bidders that get installed last to always have less time to respond, Prebid.js helps you keep the auction fair and rotate the order that bidders get called.
