# Overview

Module Name: Adlivetech Bidder Adapter
Module Type: Bidder Adapter
Maintainer: grid-tech@themediagrid.com

# Description

Module that connects to Grid demand source to fetch bids.
The adapter is GDPR compliant and supports banner and video (instream and outstream).

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "adlivetech",
                       params: {
                           uid: '1',
                           bidFloor: 0.5
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "adlivetech",
                       params: {
                           uid: 2,
                           keywords: {
                               brandsafety: ['disaster'],
                               topic: ['stress', 'fear']
                           }
                       }
                   }
               ]
           },
           {
               code: 'test-div',
               sizes: [[728, 90]],
               mediaTypes: { video: {
                   context: 'instream',
                   playerSize: [728, 90],
                   mimes: ['video/mp4']
               },
               bids: [
                   {
                       bidder: "adlivetech",
                       params: {
                           uid: 11
                       }
                   }
               ]
          }
       ];
```
