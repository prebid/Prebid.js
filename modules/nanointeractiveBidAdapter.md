# Overview

```
Module Name:  NanoInteractive Bid Adapter
Module Type:  Bidder Adapter
Maintainer: rade@nanointeractive.com
```

# Description

Connects to Nano Interactive search retargeting Ad Server for bids.

Besides standard params, please provide, if exist, user search params. 

Three examples calling the Ad Server. 

**First** is basic 

**Second** is with hardcoded nq (user search) params 

**Third** is with the search query param name of the current url

# Test Parameters
```
var adUnits = [
   // Basic call
   {
       code: 'basic-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'nanointeractive',
         params: {
            // required
            pid: '58bfec94eb0a1916fa380163',
            // optional parameters
            category: 'some category',
            subId: '123'
         }
       }]
   },
   // Hardcoded user search 
   {
       code: 'nq-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'nanointeractive',
         params: {
            // required
            pid: '58bfec94eb0a1916fa380163',
            // optional parameters
            nq: 'user search',
            category: 'some category',
            subId: '123'
         }
       }]
   },
   // URL user search 
   {
       code: 'url-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'nanointeractive',
         params: {
            // required
            pid: '58bfec94eb0a1916fa380163',
            // optional parameters
            name: 'search',
            category: 'some category',
            subId: '123'
         }
       }]
   }
];
```

### Requirements:
To be able to get identification key (`pid`), you must register at <br> 
`https://audiencemanager.de/public/data-partners-register` <br>
and follow further instructions.