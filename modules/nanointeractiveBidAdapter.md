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
            sec: '04a0cb7fb9ac02840f7f33d68a883780',
            dpid: '58bfec94eb0a1916fa380162',
            pid: '58bfec94eb0a1916fa380163'
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
            sec: '04a0cb7fb9ac02840f7f33d68a883780',
            dpid: '58bfec94eb0a1916fa380162',
            pid: '58bfec94eb0a1916fa380163',
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
            sec: '04a0cb7fb9ac02840f7f33d68a883780',
            dpid: '58bfec94eb0a1916fa380162',
            pid: '58bfec94eb0a1916fa380163',
            name: 'search'
         }
       }]
   }
];
```
