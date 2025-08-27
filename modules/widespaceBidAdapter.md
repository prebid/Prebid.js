# Overview


**Module Name:** Widespace Bidder Adapter.\
**Module Type:** Bidder Adapter.\
**Maintainer:** support@widespace.com


# Description

Widespace Bidder Adapter for Prebid.js.
Banner and video formats are supported.

# Test Parameters
```
  var adUnits = [
   {
     code: 'test-div',
     sizes: [[300, 250], [300, 300]],
     bids: [
       {
          bidder: 'widespace',
          params: {
            sid: '7b6589bf-95c8-4656-90b9-af9737bb9ad3', // Required
            currency: 'EUR', // Optional
            bidfloor: '0.5', // Optional
            demo: { // Optional
              gender: 'M',
              country: 'Sweden',
              region: 'Stockholm',
              postal: '15115',
              city: 'Stockholm',
              yob: '1984'
            }
          }
       }
     ]
   }
  ];
```

