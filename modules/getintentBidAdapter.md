# Overview

```
Module Name: GetIntent Bidder Adapter
Module Type: Bidder Adapter
Maintainer: server-dev@getintent.com
```

# Description

Module that connects to GetIntent's demand sources.
Banner and Video formats are supported.

# Required parameters
* ```pid``` for Publisher ID 
* ```tid``` for Tag ID. 

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-ad',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "getintent",
                       params: {
                           pid: "7",
                           tid: "test01"
                       }
                   }
               ]
           },{
               code: 'test-video-ad',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "getintent",
                       params: {
                           pid: "7",
                           tid: "test01"
                       },
                       mediaType: "video"
                   }
               ]
           }
       ];
```
