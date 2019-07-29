# Overview

Module Name: ShowHeroes Bidder Adapter

Module Type: Bidder Adapter

Maintainer: tech@showheroes.com

# Description

Module that connects to ShowHeroes demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'video',
               mediaTypes: {
                   video: {
                       playerSize: [640, 480],
                       context: 'instream',
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',
                           vpaidMode: true // by default is 'false'
                       }
                   }
               ]
           },
           {
               code: 'video',
               mediaTypes: {
                   video: {
                       playerSize: [640, 480],
                       context: 'outstream',
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',
                           vpaidMode: true // by default is 'false'
                       }
                   }
               ]
           },
           {
               code: 'banner',
               mediaTypes: {
                   banner: {
                       sizes: [[640, 480]],
                   }
               },
               bids: [
                   {
                       bidder: "showheroes-bs",
                       params: {
                           playerId: '0151f985-fb1a-4f37-bb26-cfc62e43ec05',
                       }
                   }
               ]
           }
       ];
```
