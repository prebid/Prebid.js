# Overview

Module Name: Ad4Game Bidder Adapter
Module Type: Bidder Adapter
Maintainer: devops@ad4game.com

# Description

Ad4Game Bidder Adapter for Prebid.js. It should be tested on real domain. `localhost` should be rewritten (ex. example.com).

# Test Parameters
```
    var adUnits = [
       {
           code: 'test-div',
           mediaTypes: {
               banner: {
                   sizes: [[300, 250]],  // a display size
               }
           },
           bids: [
               {
                    bidder: 'a4g',
                    params: {
                        zoneId: 59304,
                        deliveryUrl: 'https://dev01.ad4game.com/v1/bid'
                    }
               }
           ]
       },{
           code: 'test-div',
           mediaTypes: {
              banner: {
                  sizes: [[300, 50]],  // a mobile size
              }
          },
           bids: [
               {
                    bidder: 'a4g',
                    params: {
                        zoneId: 59354,
                        deliveryUrl: 'https://dev01.ad4game.com/v1/bid'
                    }
               }
           ]
       }
    ];
```
