---
layout: post
title: How many bidders should I work with?
head_title: How many bidders for header bidding

description: An analysis of the optimal number of bidders to work with for header bidding, to optimize yield and user experience. 

permalink: /blog/how-many-bidders-for-header-bidding

---

While helping publishers run header bidding, we hear the same questions asked many times:

* How many bidders should I work with?
* How can I maximize revenue while maintaining a good user experience?

We've all heard anecdotally a webpage should not have more than 10 bidders' bids, or the page should not wait for longer than 1 second before it sends the bids to the ad server. Are they true? 

Luckily, the publishers using Prebid.js are curious about these questions too. We thus ran A/B tests and collected real data from pages running header bidding. We measured overall revenue & latency versus the number of bidders and how long the ad server waits for.

<br>

### Q1: How is revenue affected by different factors?

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/blog/experiments/revenue.png)
(_the above data is normalized to CPM = 1 for anonymity_)

Revenue is mainly determined by:

* How many bidders the page works with (as the blue and orange line show).
* How long does the page wait so the most number of bids can get back in time (X-axis).

Conclusions:

##### 1. You make more money when you include more bidders!

* Perhaps not surprising - more competition, better yield. But the below 2 points are even more interesting:

##### 2. When you include more bidders, the page should wait longer too!

* Working with 10 bids (orange) makes incrementally more money as the ad server waits longer. But the 5 bids revenue plateaued.
* As the graph's 0 - 300ms (X-axis) shows, either working with 5 bids or 10 bids makes no difference; In fact, working with 10 bids has a slight dip at 200ms, possibly due to the latency caused by sending out more bid requests.


##### 3. Revenue actually drops if the page waits for too long

* This could be caused by users leaving the page, when the ads took too long to load. 

<br>

### Q2: How is page content load time affected?

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/blog/experiments/page-load-time.png)
_(The above page has on average 130 HTTP requests, 1.5MB data transferred per refresh)_


Page content load time is critical to measure user experience. Your page's content taking 200 millisecond to load delivers a MUCH BETTER experience than if it takes 2 seconds. 

In this test, we measured the front section's load time. We define the front section as what's visible to the user when they open the webpage. For example, when the above graph's Y-axis is at 100ms, it means that the front section took 100ms to load before a user can see it.

Conclusions:

##### Page content load time is NOT really affected by the number of bidders or by how long the page waits.

* The front section continues to load between 60 to 120ms, unaffected by the given factors. 
* **This is expected**, as Prebid.js sends out bids asynchronously and they **do NOT block** the page content from loading. Modern browsers also prioritize the page content load over asynchronous Javascript scripts. 


<br>

### Q3: How about ad load time?

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/blog/experiments/ad-load-time.png)
_(The above page has on average 130 HTTP requests, 1.5MB data transferred per refresh)_

Ad load time measures how long a user has to wait before he/she can see the ad. This is less important than the page's content load time. However, the initial blank space in the ad unit, or the page elements shifting around due to a late ad load, can both demage the user experience.

Conclusions:

##### 1. It's linear. Longer the adserver waits, longer it takes the ads to load.

* This makes perfect sense. It's important to note that the ads load at around 1200ms even when the adserver waits for 2 seconds, because most of the bids come back within 1200ms and Prebid.js stops the adserver from waiting.

##### 2. When your ad server waits for < a threshold (500ms in this case), working with more bids take longer for the ads to load. 

* This makes sense, because sending out more bid requests takes longer.

##### 3. When your ad server waits for > a threshold (500ms in this case), ads load in the same amount of time regardless of the number of bids.

* Our guess is, when the ad server waits for long enough, there's enough time for 10 bid requests. Thus it didn't further delay the ads from loading.



### Recommendations:

Every webpage is different. Every site's users are different. Different publishers will put different weights on revenue vs. user experience. Our main recommendation is: **Create the above 3 graphs.** They will help you understand how many bids you should work with and how long your page should wait for. 

Prebid.js is a good place to start for free : )

<hr class="half-rule">

Note that the above data is collected by pages that run true header bidding auctions, which is defined by Prebid.js as:

* All bid requests are sent out concurrently, not blocking each other or blocking the page content to load.
* All participating bidders are treated equally, given the same amount of time to respond.
* Ad server only waits for a limited amount of time, ignoring all bids that come after.

If your page does not run a true header bidding auction, the above analysis may not apply.
