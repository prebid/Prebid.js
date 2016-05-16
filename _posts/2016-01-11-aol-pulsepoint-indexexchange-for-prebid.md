---
layout: post
title: New Adaptors AOL, Pulsepoint, IndexExchange

description: New Adaptors AOL, Pulsepoint, IndexExchange are now available for Prebid.js

permalink: /blog/aol-pulsepoint-indexexchange-for-prebid

---


### How to add bidder AOL:

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
            bidder: 'aol',
            params: {
                placement: 'TO ADD', //String placement
                network: 'TO ADD'    //String network,
                //optional params
                sizeId : 123,       //Number
                alias : 'TO ADD,    //String
                size : [300,250]    //Array[Number]
            }
        }]
}];

{% endhighlight %}


### How to add bidder Pulsepoint:

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
            bidder: 'pulsepoint',
            	params: {
            		cf: '300X250',  //String adSize identifier 
            		cp: 123345,     //Number Publisher Id
            		ct: 123456      //Number  Ad Tag Id
	            }
        }]
}];

{% endhighlight %}

### How to add bidder IndexExchange:

{% highlight js %}

var adUnits = [{
        code: '/9968336/header-bid-tag-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
                bidder: 'indexExchange',
                params: {
                    id: 'TO ADD',  //String - id of placement required
                	siteID: TO ADD,  //Number - site id required
                	timeout: 1000, //Number Optional
                	tier2SiteID: 'TO ADD', //String Optional
                	tier3SiteID: 'TO ADD' //String Optional
                }
        }]
}];

{% endhighlight %}