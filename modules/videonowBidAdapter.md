# Overview

**Module Name**: Videonow Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: nregularniy@videonow.ru

# Description

Videonow Bidder Adapter for Prebid.js. About: https://videonow.ru/


Use `videonow` as bidder:

# Params
- `pId` required, profile ID
- `currency` optional, currency, default is 'RUB'
- `url` optional, for debug, bidder url
- `codeType` optional, for debug, yhb codeType

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot', //use exactly the same code as your slot div id.
      mediaTypes: {
          banner: {
              sizes: [[640, 480]]
          }
      },
      bids: [{
        bidder: 'videonow',
        params: { 
            pId: '1234',
            currency: 'RUB',
        }
      }]
    }];
```
