---
layout: post
title: New Adaptors Sonobi, Brightcom, Adequant

description: New Adaptors Sonobi, Brightcom, Adequant are now available for Prebid.js

permalink: /blog/sonobi-brightcom-adequant-adaptors-for-prebid

---

### New adapter for Sonobi - how to add:

{% highlight js %}

var adUnits = [{
  code: '/9968336/header-bid-tag-0',
  sizes: [[300, 250], [300, 600]],
  bids: [{
    bidder: 'sonobi',                 //  New format
    params: {
      dom_id: 'PER SLOT',      //  <String> dom Id
      ad_unit:'PER SLOT'        //  <String> ad unit code
    }
  },
  {
    bidder: 'sonobi',                     //  Old account format
    params: {
      dom_id: 'PER SLOT',          //  <String> dom Id
      placement_id:'PER SLOT'  //  <String> placement Id
    }
  }]
}];

{% endhighlight %}

### New adapter for Brightcom - how to add

{% highlight js %}

var adUnits = [
  {
    code: '/9968336/header-bid-tag-0',
    sizes: [[300, 250], [300, 600]],
    bids: [
      {
        bidder: 'brightcom',
        params: {
          tagId: 12345 // Tag ID supplied by Brightcom - brightcom.com
        }
      }
    ]
  }
];

{% endhighlight %}

### New adapter for Adequant - how to add:

{% highlight js %}

var adUnits = [{
  code: '/9968336/header-bid-tag-0',
  sizes: [[300, 250], [300, 600]],
  bids: [{
    bidder: 'adequant',
    params: {
      publisher_id: '1234567',  // REQUIRED int or str publisher ID. To get one, register at https://control.adequant.com
      bidfloor: 0.01            // OPTIONAL float bid floor in $ CPM
    }
  }
  ]}
}];

{% endhighlight %}