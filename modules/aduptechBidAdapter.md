# Overview

```
Module Name: Ad Up Technology Bid Adapter
Module Type: Bidder Adapter
Maintainer: steffen.anders@adup-tech.com, berlin@adup-tech.com
```

# Description

Connects to Ad Up Technology demand sources to fetch bids.   
Please use ```aduptech``` as  bidder code. Only banner formats are supported. 

The Ad Up Technology Bidding adapter requires setup and approval before beginning.   
For more information visit [www.adup-tech.com](http://www.adup-tech.com/en).

# Test Parameters
```
var adUnits = [
   {
        code: 'banner',
        sizes: [[300, 250], [300, 600]],
        bids: [{
            bidder: 'aduptech',
            params: {
                publisher: 'prebid',
                placement: '12345'
            }
        }]
   }
];
```
