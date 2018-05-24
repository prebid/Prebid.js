# Overview

```
Module Name:  NanoInteractive Bid Adapter
Module Type:  Bidder Adapter
Maintainer: rade@nanointeractive.com
```

# Description

Connects to NanoInteractive search retargeting Ad Server for bids.

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
            pid: '5afaa0280ae8996eb578de53'
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
            pid: '5afaa0280ae8996eb578de53',
            nq: 'user search'
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
            pid: '5afaa0280ae8996eb578de53',
            name: 'search'
         }
       }]
   }
];
```
