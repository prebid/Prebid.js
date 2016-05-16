---
layout: post
title: New Adaptors TripleLift, NginAd

description: New Adaptors TripleLift, NginAd are now available for Prebid.js

permalink: /blog/triplelift-nginad-adaptors-for-prebid

---

### New adapter for NginAd - how to add

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
            bidder: 'nginad',
            params: {
        	    pzoneid: '7', // <String> PublisherAdZoneID
                nginadDomain: "server.nginad.com" // the domain where you installed NginAd
            }
        }]
}];

{% endhighlight %}


### New adapter for TripleLift - how to add:

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
            bidder: 'triplelift',
                params: { 
                    inventoryCode: 'headerbidding_placement' }
                }
        }]
}];

{% endhighlight %}
