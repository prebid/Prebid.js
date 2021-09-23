# Overview

**Module Name**: Justpremium Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: headerbidding-dev@justpremium.com

# Description

To get more information or your unique zone id please contact Justpremium.

# Test Parameters
```
   var adUnits = [
       {
           mediaTypes: {
                banner: {
                    sizes: [[1, 1]]
                }
           },
           code: 'div-gpt-ad-1471513102552-0',
           bids: [
               {
                   bidder: 'justpremium',
                   params: {
                       zone: 34364,
                       allow : ['wp']
                   }
               },
           ]
       },
       {
           mediaTypes: {
                banner: {
                    sizes: [[300, 600]]
                }
           },
           code: 'div-gpt-ad-1471513102552-1',
           bids: [
               {
                   bidder: 'justpremium',
                   params: {
                       zone: 34364,
                       exclude : ['wp']
                   }
               }
           ]
       }
   ];
```
