# Overview

Module Name: Xendiz Bidder Adapter
Module Type: Bidder Adapter
Maintainer: hello@xendiz.com

# Description

Module that connects to Xendiz demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "xendiz",
                       params: {
                           pid: '00000000-0000-0000-0000-000000000000'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[300, 50]],
               bids: [
                   {
                       bidder: "xendiz",
                       params: {
                           pid: '00000000-0000-0000-0000-000000000000',
                           ext: {
                              uid: '550e8400-e29b-41d4-a716-446655440000'
                           }
                       }
                   }
               ]
           }
       ];
```