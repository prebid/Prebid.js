---
layout: page
title: Conditional Ad Units - <font color="red">NEW!</font>
description: Using labels for conditional ad units
top_nav_section: dev_docs
nav_section: features
hide: false
---

<div class="bs-docs-section" markdown="1">

# Conditional Ad Units
{:.no_toc}

The `sizeConfig` feature is useful for [responsive ad designs]({{site.baseurl}}/dev-docs/publisher-api-reference.html#setConfig-Configure-Responsive-Ads), but a number of other scenarios are supported as well:

* TOC
{:toc}

By supporting these scenarios, header bidding can be more efficient - the browser can send bids to a more surgical set of bidders based on device size or other attributes the page code can create.

The basic steps are:

1. Build up an array of 'labels' from two sources: either as an output of `sizeConfig`, as an optional argument to [`requestBids()`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.requestBids), or both.
1. Apply label targeting to AdUnits or specific bids.

See the [Publisher API reference]({{site.baseurl}}/dev-docs/publisher-api-reference.html#setConfig-Configure-Responsive-Ads) for syntax.

## What if some bidders should be skipped for some devices?

Say a particular bidder is focused on mobile phone demand, so it's really not worthwhile 
to send them requests from display or tablets.

We'll start with how to set up the labels from `sizeConfig`:

{% highlight js %}

pbjs.setConfig({
  sizeConfig: [{
       mediaQuery: '(min-width: 1200px)',
       sizesSupported: [[970,90], [728,90], [300,250], [160,600]],
       labels: [ "display"]
     }, {
       mediaQuery: '(min-width: 768px) and (max-width: 1199px)',
       sizesSupported: [[468,60], [300,250], [160,600]],
       labels: [ "tablet"]
     }, {
       mediaQuery: '(min-width: 0px) and (max-width: 767px)',
       sizesSupported: [[300,50],[320,50],[120,20],[168,28]],
       labels: [ "phone"]
  }]
});

{% endhighlight %}

In the above `sizeConfig`, labels are applied for each of the 3 screen sizes that can later be used in
conditional ad unit logic. Now you need to label your AdUnits to match. For example:

{% highlight js %}

var AdUnits = [{
    code: "ad-slot-1",
    sizes: [[768,90], [468,60], [320,50]], 
    bids: [
        {
            bidder: "bidderA",
            params: {
                placement: "1000"
            }
       },{
            bidder: "mobileBidder",
            labelAny: ["phone"],  // this bid only applies to small screensizes
            params: {
                placement: "2000"
            }
       }
   ]
}]

{% endhighlight %}

How this works:

1. Users with a screen width of 767px and under will cause the third media query to fire.
1. This rule puts "phone" into the label array and a list of sizes into `sizesSupported`
1. Then the AdUnit is processed:
    1. The first bid doesn't have any conditional logic, so is present in every auction.
    1. The second bid requires that "phone" be present in the label array, otherwise it won't be part of the auction.

## What if some bidders have different parameters for different devices?

For reporting and targeting purposes, Publishers and SSPs sometimes break out different inventory structures for different platforms.

For instance, say that a given bidder wants to define different placements for different devices according to this table:

{: .table .table-bordered .table-striped }
| Device | Placement ID |
|--------|---------|
| Display | 1111 |
| Phones and tablets | 2222 |

Assuming the same `sizeConfig` as in the first use case above, the AdUnit would contain bids for both
placements, but the conditional `labelAny` is added to them both. This will cause the bid to be fired only if one
or more of the strings in the array matches a defined label.

{% highlight js %}

var AdUnits = [{
    code: "ad-slot-1",
    sizes: [[768,90], [468,60], [320,50]], 
    bids: [
        {
            bidder: "bidderA",
            labelAny: ["display"],
            params: {
                placement: "1111"
            }
       },{
            bidder: "bidderA",
            labelAny: ["phone", "tablet"],
            params: {
                placement: "2222"
            }
       }
   ]
}]

{% endhighlight %}

How this works:

1. Users with a screen width of 1000px will cause the second media query to fire.
1. The second media query rule puts "tablet" into the label array and a list of sizes into `sizesSupported`.
1. Then the AdUnit is processed:
    1. The first bid requires that the label "display" be present in the array. It's not, so that bid is skipped.
    1. The second bid requires that either "phone" or "tablet" be present. Since tablet is in the label array, that bid is activated and the correct placement is sent to bidderA.

## What if some ad unit auctions should be skipped entirely for some devices?

Say there's a responsive page where one of the ad units only supports larger sizes, so it doesn't make sense
on phones. To suppress the ad unit for mobile users, we can apply conditional logic to the entire ad unit. For example:

{% highlight js %}

var AdUnits = [{
    code: "ad-slot-1",
    sizes: [[768,90]], 
    labelAny: ["display", "tablet"], // skip the ad unit entirely for phones
    bids: [
        {
            bidder: "bidderA",  // no conditions
            params: {
                placement: "1111"
            }
       },{
            bidder: "tabletBidder",
            labelAny: ["tablet"], // additional conditions can be applied to bids
            params: {
                placement: "2222"
            }
       }
   ]
}]

{% endhighlight %}

## What if some bid requests apply only to users originating certain from countries? 

Labels aren't constrained to describing device size -- they can be used for many types of conditions the page maywant to define. Besides being defined as part of `sizeConfig`, labels can also be passed into the [`requestBids()`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.requestBids) function as an argument.

A specific use case: suppose that a certain bidder doesn't have a data center outside of a
certain region. It's really not worth sending them bid
requests for users outside of their geographic area. Assuming the page can figure out where the user's from,
a label can be implemented and applied to make the bid conditional.

{% highlight js %}
// page logic determines the 'europeanUser' boolean
If (europeanUser) {
    reqArgs={labels:['eur']};
} 
pbjs.requestBids(reqArgs);
{% endhighlight %}

Then this label can be applied to conditions in the AdUnit just like labels that originate from `sizeConfig`. E.g.

{% highlight js %}
var AdUnits = [{
    code: "ad-slot-1",
    sizes: [[768,90], [468,60], [320,50]], 
    bids: [
       {
            bidder: "euroMobileBidder",
            labelAll: ["eur", "phone"],
            params: {
                placement: "9876"
            }
       },
       ...
   ]
}]
{% endhighlight %}

This example shows that the 'euroMobileBidder' is only interested in receiving bids that have **both**
labels:

* "eur" as passed into [`requestBids()`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.requestBids)
* "phone" as created by `sizeConfig`

## Further Reading

+ [Responsive ad designs]({{site.baseurl}}/dev-docs/publisher-api-reference.html#setConfig-Configure-Responsive-Ads)
+ [Using Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries)


</div>
