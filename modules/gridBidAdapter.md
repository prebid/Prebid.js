# Overview

Module Name: The Grid Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: grid-tech@themediagrid.com

# Description

Module that connects to Grid demand source to fetch bids.
Grid bid adapter supports Banner and Video (instream and outstream).

#Bidder Config
You can allow writing in localStorage `pbjs.setBidderConfig` for the bidder `grid`
```
pbjs.setBidderConfig({
    bidders: ["grid"],
    config: {
        localStorageWriteAllowed: true
    }
})
```

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250], [300,600]],
                   }
               },
               bids: [
                   {
                       bidder: "grid",
                       params: {
                           uid: '1',
                           bidFloor: 0.5
                       }
                   }
               ]
           },{
               code: 'test-div',
               bids: [
                   {
                       bidder: "grid",
                       params: {
                           uid: 2,
                           keywords: {
                               site: {
                                  publisher: [{
                                    name: 'someKeywordsName',
                                    brandsafety: ['disaster'],
                                    topic: ['stress', 'fear']
                                  }]
                                }
                           }
                       }
                   }
               ]
           },
           {
               code: 'test-div',
               sizes: [[728, 90]],
               mediaTypes: {
                   video: {
                       playerSize: [1280, 720],
                       context: 'instream'
                   }
               },
               bids: [
                   {
                       bidder: "grid",
                       params: {
                           uid: 11
                       }
                   }
               ]
          }
       ];
```
