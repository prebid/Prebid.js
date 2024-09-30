# Overview

```
Module Name: ShowHeroes Bidder Adapter
Module Type: Bidder Adapter
Alias: showheroesBs
Maintainer: tech@showheroes.com
```
# Description

A module that connects to ShowHeroes demand source to fetch bids.

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
                           unitId: '1234abcd-5678efgh',
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
                           unitId: '1234abcd-5678efgh',
                       }
                   }
               ]
           }
       ];
```
