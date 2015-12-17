---
layout: page
title: Bidder Price & Latency Analysis
description: An analysis of header bidding bidders' price granularity and latency.

pid: 80

top_nav_section: overview
nav_section: studies

permalink: /header-bidding-bidder-analysis.html

---
<div class="bs-docs-section" markdown="1">

# Bidder Price & Latency Analysis

While implementing Prebid.js' adaptors for different bidders, we've noticed not all bidders return exact price to the publisher's page. Different bidders also have vastly different response latency. We hope the analysis here can help you make smart decisions when implementing header bidding. 

<!--| Amazon | Estimated at $0.50 increment | 300ms | -->

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
| YieldBot | Exact | 300ms |

*Note that the above latency estimate was done in New York, US with fast Internet connection. To provide more accurate report, publishers can implement latency trackers through [Prebid.js Analytics](/overview/ga-analytics.html).

</div>