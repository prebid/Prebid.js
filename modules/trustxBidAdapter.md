# Overview

Module Name: TrustX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: paul@trustx.org

# Description

Module that connects to TrustX demand source to fetch bids.
TrustX Bid Adapter supports Banner and Video (instream and outstream).

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]],
                   }    
               },
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: '58851',
                       }
                   }
               ]
           },{
               code: 'test-div',
               mediaTypes: {
                   banner: {
                       sizes: [[728, 90],[300, 250]],
                   }    
               },
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: 58851,
                           keywords: {
                               site: {
                                   publisher: {
                                       name: 'someKeywordsName',
                                       brandsafety: ['disaster'],
                                       topic: ['stress', 'fear'] 
                                   }
                               }
                           }
                       }
                   }
               ]
           },{
               code: 'test-div',
               mediaTypes: { 
                   video: {
                       context: 'instream',
                       playerSize: [640, 360],
                       mimes: ['video/mp4'],
                       protocols: [1, 2, 3, 4, 5, 6, 7, 8],
                       playbackmethod: [2],
                       skip: 1
                   }
               },
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: 7697
                       }
                   }
               ]
           }
       ];
```
