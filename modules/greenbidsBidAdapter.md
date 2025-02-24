# Overview

**Module Name**: Greenbids Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**:  tech@greenbids.ai

# Description

Use `greenbids` as bidder.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot_1-div', //use exactly the same code as your slot div id.
      sizes: [[300, 250]],
      bids: [{
          bidder: 'greenbids',
          params: { 
              placementId: 12345,
          }
      }]
    },{
      code: 'your-slot_2-div', //use exactly the same code as your slot div id.
      sizes: [[600, 800]],
      bids: [{
          bidder: 'greenbids',
          params: { 
              placementId: 12345,
          }
      }]
    }];
```
