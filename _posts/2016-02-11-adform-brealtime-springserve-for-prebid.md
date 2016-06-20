---
layout: post
title: New Adaptors Adform, bRealTime, Springserve

description: New Adaptors Adform, bRealTime, Springserve are now available for Prebid.js

permalink: /blog/adform-brealtime-springserve-for-prebid

---

### How to add bidder Adform:

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
         bidder: 'adform',
           params: {
             adxDomain: 'adx.adform.net', //optional
             mid: 74042
           }
        }]
}];

{% endhighlight %}


### How to add bidder BRealTime:

{% highlight js %}
var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
            bidder: 'brealtime',
            params: {
                placementId: '2251610'
            }
        }]
}];

{% endhighlight %}

### How to add bidder Springserve:

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
                bidder: 'springserve',
                params: {
                    impId: 1234,            //Required - number
                    supplyPartnerId: 1,     //Required - number
                }
        }]
}];

{% endhighlight %}