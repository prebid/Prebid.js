# Overview

Module Name: The Grid Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: grid-tech@themediagrid.com

# Description

Module that connects to Grid demand source to fetch bids.
Grid bid adapter supports Banner and Video (instream and outstream).

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[728, 90]],
               mediaTypes: { video: {} },
               bids: [
                   {
                       bidder: "gridNM",
                       params: {
                           source: 'jwp',
                           video: {
                               mimes: ['video/mp4', 'video/x-ms-wmv'],
                               protocols: [1,2,3,4,5,6]
                           }
                       }
                   }
               ]
          }
       ];
```
