# Overview

**Module Name**: Justpremium Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: info@justpremium.com 

# Description

To get more information or get source to fetch bids
please contact to Justpremium.

# Test Parameters
```
   var adUnits = [
       {
           sizes: [[1, 1]],
           code: 'div-gpt-ad-1471513102552-0',
           bids: [
               {
                   bidder: 'justpremium', 
                   params: {
                       zone: 28313,
                       exclude : ['as']
                   }
               },
           ]
       },
       {
           sizes: [[300, 600]],
           code: 'div-gpt-ad-1471513102552-1',
           bids: [
               {
                   bidder: 'justpremium',
                   params: {
                       zone: 28313,
                       allow : ['sa']
                   }
               }
           ]
       }
   ];
```
