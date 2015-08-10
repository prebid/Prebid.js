---
layout: post
title: Bidder Analysis on price and latency
head_title: Header Bidding Bidder Analysis on Price and Latency

description: An analysis of header bidding bidders' price granularity and latency report.

permalink: /blog/header-bidding-bidder-analysis

---

While implementing Prebid.js' adaptors for different bidders, we've noticed not all bidders return exact price to the publisher's page. Different bidders also have vastly different response latency. We hope the analysis here can help you make smart decisions when implementing header bidding. 

{: .table .table-bordered .table-striped }
|	Bidder |	Price 	|	*Latency (rough estimate)   |
| :----  |:--------| :-------|
| Amazon | Estimated at $0.50 increment | 300ms |
| AOL | Unknown | Unknown |
| AppNexus | Exact | 200ms, however async calls have to be made for multiple slots |
| Casale | Exact | Unknown | 
| Criteo | Estimated | 200ms |
| OpenX | Exact | 600ms |
| Pubmatic | Exact | 400ms |
| Rubicon | Exact | 400ms |
| Sonobi | Exact | Unknown |
| YieldBot | Estimated at $1.00 increment | Unknown |

*Note that the above latency estimate was done in New York, US with fast Internet connection. To provide more accurate report, publishers can implement latency trackers through the prebid.js API.

###Live Test:

{% include live_demo.html %}