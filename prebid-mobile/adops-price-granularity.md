---
layout: page
title: Price Granularity
description: Price granularity
pid: 2
top_nav_section: prebid-mobile
nav_section: prebid-mobile-adops
---

<div class="bs-docs-section" markdown="1">

# Price Granularity

With Prebid Mobile, you’ll need to setup line items to tell your ad server how much money the “bidder” demand is worth to you. This process is done via key-values.

Example:


* Prebid Mobile is going to call Prebid Server which calls your bidders for their price, then passes it into your ad server on the query-string. You want to target this bid price with a line item that earns you the same amount if it serves.

* If you had 1-line item for every bid at a penny granularity of $0.01, $0.02, $0.03, ..., 1.23, ..., $4.56 you’d need 1,000 line items just to represent bids from $0-$10. We call this the “Exact” granularity option.

* Creating 1,000 line items can be a hassle, so publishers typically use price buckets to represent price ranges that matter. For example, you could group bids into 10 cent increments, so bids of $1.06 or $1.02 would be rounded down into a single price bucket of $1.00.

## Accepted values for price granularity

+ `"low"`: $0.50 increments, capped at $5 CPM
+ `"med"`: $0.10 increments, capped at $20 CPM (the default)
+ `"high"`: $0.01 increments, capped at $20 CPM
+ `"auto"`: Applies a sliding scale to determine granularity as shown in the [Auto Granularity](#autoGranularityBucket) table below.
+ `"dense"`: Like `"auto"`, but the bid price granularity uses smaller increments, especially at lower CPMs.  For details, see the [Dense Granularity](#denseGranularityBucket) table below.

<a name="autoGranularityBucket"></a>

#### Auto Granularity

{: .table .table-bordered .table-striped }
| CPM                 | 	Granularity                  |  Example |
|---------------------+----------------------------------+--------|
| CPM <= $5            | 	$0.05 increments             | $1.87 floored to $1.85 |
| CPM <= $10 and > $5  | 	$0.10 increments             | $5.09 floored to $5.00 |
| CPM <= $20 and > $10 | 	$0.50 increments             | $14.26 floored to $14.00 |
| CPM > $20           | 	Caps the price bucket at $20 | $24.82 floored to $20.00 |

<a name="denseGranularityBucket"></a>

#### Dense Granularity

{: .table .table-bordered .table-striped }
| CPM        | 	Granularity                  | Example |
|------------+-------------------------------+---------|
| CPM <= $3  | 	$0.01 increments             | $1.87 floored to $1.87 |
| CPM <= $8 and >$3  | 	$0.05 increments             | $5.09 floored to $5.05 |
| CPM <= $20 and >$8 | 	$0.50 increments             | $14.26 floored to $14.00 |
| CPM >  $20 | 	Caps the price bucket at $20 | $24.82 floored to $20.00 |


{: .alert.alert-success :}
**Action Item:** Once you have decided the price granularity, go to Prebid Server [account page](https://prebid.adnxs.com/account/) to set the price granularity setting for your account.


The below screenshot is taken from the Prebid Server account page where you can choose your price granularity setting from the options.

{: .pb-img.pb-md-img :}
![Key-values]({{ site.github.url }}/assets/images/prebid-mobile/adops-price-granularity/pg-setting.png)

</div>