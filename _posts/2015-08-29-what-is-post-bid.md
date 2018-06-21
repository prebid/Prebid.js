---
layout: post
title: What is post-bid?
head_title: What is post-bid and when to use it vs. header bidding.

description: What is post-bid and when to use it vs. header bidding.

permalink: /blog/what-is-post-bid

---



### What is post-bid?

> Post-bid allows a publisher’s mediated demand sources all compete in one auction based on price, after the ad server has picked the post-bid line item. 

In post-bid, the competition among your mediated demand sources compete AFTER your ad server has chosen the winning line item (vs. in header bidding, demand sources compete BEFORE your ad server has seen the impression). In post-bid, your mediated demand sources no longer run daisy chain; they all compete in one single line item based on price.

{: .pb-lg-img :}
![Add Creative to Line Item]({{ site.github.url }}/assets/images/blog/postbid-diagram.png)

Steps:

1. The webpage sends an impression to the ad server.
2. The ad server chooses a winning line item among class 1, exchanges, and the post-bid line items. In this case, the post-bid line item wins because the eCPM on the line item is high (based on historical price) and the higher priority class 1 line items have all exhausted their spend.
3. The post-bid line item’s creative is served to the page. The creative runs an auction for the bidders using prebid.js, which then displays the highest price creative in that creative’s ad slot.


### Why post-bid?

The main reasons we have seen publishers opt for post-bid (instead of header bidding) are:

##### 1. The post-bid setup does not need engineering resources.

The Post-bid creative is just a 3rd party tag. Once it’s served to the page, prebid.js runs an auction across all demand sources. The only technical work is to insert the tag Ids into the 3rd party tag’s JSON config for your demand sources. It’s trivial work.

##### 2. The post-bid setup adds no latency to class 1 ad delivery.

Because post-bid is just a 3rd party tag, your ad server receives the impressions as soon as the page loads. The post-bid setup does not affect the class 1 or exchange spend. Post-bid actually reduces latency compared to a daisy chain mediation setup, because in post-bid all demand sources are requested concurrently, instead of in a waterfall.

Additionally, post-bid does not need additional line items. The initial setup is easier than header bidding.

### How to choose between header bidding and post-bid?

We’ve listed the advantages of post-bid over header bidding in the previous section. The disadvantages are listed below:

##### 1. No dynamic allocation across all demand sources.

The bid price on the post-bid line item is static (based on historical price). It thus has the typical problems of a 3rd party tag line item. Due to this downside, the Post-bid setup cannot make your demand partners compete with class 1 or exchanges. 

##### 2. Reporting is harder.

In your ad server's post-bid line item report, you’d only get an aggregated report of all demand sources. You may need to rely on a 3rd party reporting service to record which demand partner wins how much inventory. 

{: .table .table-bordered .table-striped }
|  | Mediation | Post-bid | Pre-bid (header bidding) |
| :--- | :---- | :---------- | :------ |
| Engineering Resources | Not required | Not required | Required |
| Ad Latency | No additional class 1 latency. Waterfall adds latency when networks do not fill. | No additional class 1 latency. Parallel auction for demand sources thus minimum latency. | Additional class 1 latency from the page's timeout setting. |
| Compete among demand sources | No | Yes | Yes |
| Compete with Class 1 & AdX dynamic allocation | No | No | Yes |
| Monetization Capability | Low | Medium | High |
| Block page content from loading? | No | No | No (with prebid.js) |

### FAQ:

##### 1. If none of the post-bid demand sources fill, can I still passback to another tag, say from Adsense?

Yes. Check out the example.

##### 2. How can I get started?
If you need help, email support@prebid.org.
