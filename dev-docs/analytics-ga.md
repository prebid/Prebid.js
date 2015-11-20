---
layout: page
title: Analytics with GA
description: Prebid.js Analytics with GA
pid: 30

top_nav_section: dev_docs
nav_section: reference

---

<div class="bs-docs-section" markdown="1">

# Prebid Analytics with GA

### Code Example

{% highlight js %}

// If you're using GA, this should already be in your page:
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

// Add the below code snippet to your page
pbjs.que.push(function() {
    pbjs.enableAnalytics({
        provider: 'ga',
        options: {
            global: 'ga', // <string> name of GA global. Default is 'ga'
            enableDistribution: false,
        }
    });
});

{% endhighlight %}

##### A few requirements:

1. This code snippet has to be inserted after the 'ga' param is available.
2. This code snippet has to be inserted after pbjs.que has been defined.

##### Distribution Data

Note: we recommend disabling `enableDistribution` if you are using more than 4 bidders. This is because GA throttles the number of events that can be logged (20 initial + 2/second). Distribution data provides you with a histogram of CPM distribution and bid load time (latency) for each bidder. See distribution data [demo here](/blog/header-bidding-analytics-coming-soon/#histogram-analysis-of-latency-and-cpm-distribution).

To renable logging distribution data, we're implementing a data reporting queue in the next few releases to address this issue. See [this link](https://developers.google.com/analytics/devguides/collection/protocol/v1/limits-quotas) for details on GA's throttling.


### How is Prebid.js using GA's events:

Prebid.js sends out Events (see [GA docs here](https://developers.google.com/analytics/devguides/collection/analyticsjs/events)):

In this example, the page has 1 ad unit with 3 bidders. The timeout is set to 400ms. Let's go through what Prebid Analytics sends out to GA:

{: .table .table-bordered .table-striped }
|	Time |	What Happened 	|	 GA Events Sent |
| :----  |:--------| :-------|
|	15ms |	Prebid.js sends out bid requests to bidders AppNexus, OpenX, and Pubmatic. | Event 1: Category=`Prebid.js Bids`, Action=`Requests`, Label=`appnexus`, Value=1.<br>Event 2: Category=`Prebid.js Bids`, Action=`Requests`, Label=`openx`, Value=1.<br>Event 3: Category=`Prebid.js Bids`, Action=`Requests`, Label=`pubmatic`, Value=1 |
|	203ms |	AppNexus's bid came back with a CPM of $2.314 and a latency of 188ms. |	Event 1: Category=`Prebid.js Bids`, Action=`Bids`, Label=`appnexus`, Value=231.<br>Event 2: Category=`Prebid.js Bids`, Action=`Bid Load Time`, Label=`appnexus`, Value=188 |
|	274ms |	Pubmatic's bid came back with a CPM of $0 and a latency of 259ms. |	No bid event sent out because it is a no bid. <br> Event 1: Category=`Prebid.js Bids`, Action=`Bid Load Time`, Label=`appnexus`, Value=259 |
| 415ms | Timeout is up because 400ms has passed since bid requests were sent. OpenX has timed out. | Event 1: Category=`Prebid.js Bids`, Action=`Timeouts`, Label=`openx`, Value=1 |
| 476ms | OpenX's bid came back with a CPM of $2.831 and a latency of 461ms (a bid may still come back after a timeout). | Event 1: Category=`Prebid.js Bids`, Action=`Bids`, Label=`openx`, Value=283. <br> Event 2: Category=`Prebid.js Bids`, Action=`Bid Load Time`, Label=`openx`, Value=461 |
| 572ms | DFP completed its auction and the AppNexus $2.314 bid won. | Event 3: Category=`Prebid.js Bids`, Action=`Wins`, Label=`appnexus`, Value=231 |


* Note that a Win event is a true win, meaning that it is not just the highest bid in the header bidding auction, but the winning bid across the entire auction hosted by the ad server and the creative was served back to the page.

### How to verify it works

After you've implemented the above code snippet, load the page a few times, wait for one to two hours for GA's data pipeline to finish, and go to your GA Reporting screen. Navigate to Behavior > Events. You should be able to find (if you have many other events, filter Event Category by `Prebid.js`)

##### GA Category Screenshot:

![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/GA-event-categories.png)

<br>

##### GA Action Screenshot:

![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/GA-event-actions.png)

<br>

##### GA Label Screenshot:

![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/GA-event-labels.png)

As you can see, this reporting screen cannot help you answer questions as: What's bidder AppNexus's avg bid CPM and bid load time. Take a look at the next 2 sections:

### Better Reports within GA

With a custom report in GA, you can get: 

![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/GA-custom-report.png)

This can be built by:

![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/GA-build-report.png)

However, this is still not the most ideal dashboard, because it's hard to find information you need quickly. Build a Spreadsheet dashboard in the next section.

### Spreadsheet Dashboard

> Find the [demo of the Spreadsheet Dashboard here](https://docs.google.com/spreadsheets/d/11czzvF5wczKoWGMrGgz0NFEOM7wsnAISbp_MpmGzogU/edit?usp=sharing).

To build your own version of this report dashboard:

#### Step 1. 

Install the [Google Analytics Spreadsheet Add-on](https://developers.google.com/analytics/solutions/google-analytics-spreadsheet-add-on?hl=en). Understand how the add-on works.

#### Step 2. 

Make a local copy of the [Demo Dashboard](https://docs.google.com/spreadsheets/d/11czzvF5wczKoWGMrGgz0NFEOM7wsnAISbp_MpmGzogU/edit?usp=sharing).

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/sheet-copy-dashboard.png)
<br>
<br>

#### Step 3. 

In your local copy, go to the Report Configuration tab, update the GA profile ID (you should be able to get this ID from step 1)

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/sheet-report-config.png)

<br>

#### Step 4. Run report!

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/sheet-run-report.png)

<br>

#### Step 5. You can also schedule daily reports:

{: .pb-lg-img :}
![Prebid Diagram Image]({{ site.github.url }}/assets/images/dev-docs/sheet-schedule-report.png)

</div>