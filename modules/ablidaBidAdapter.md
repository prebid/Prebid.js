# Overview

**Module Name**: Ablida Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: d.kuster@ablida.de

# Description

Module that connects to Ablida's bidder for bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'ad-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]],
                   }
               },
               bids: [
                   {
                       bidder: 'ablida',
                       params: {
                           placementId: 'mediumrectangle-demo',
                           categories: ['automotive', 'news-and-politics'] // optional: categories of page
                       }
                   }
               ]
           }
       ];
```
