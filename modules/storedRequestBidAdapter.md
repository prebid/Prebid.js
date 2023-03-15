# Overview

```
Module Name:  Stored Request Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support@relevant-digital.com
```

# Description

This adapter simplifies integration with providers hosting Prebid Server that are managing bidders/SSPs by using Prebid Server's [stored request mechanism](https://docs.prebid.org/prebid-server/features/pbs-storedreqs.html).

# Example setup using pbjs.setConfig()
This is the recommended method to set the global configuration parameters.
```javascript
pbjs.setConfig({
  pbsGenericBidder: {
    pbsHost: 'prebid-server.example.com',
    accountId: 'myAccount-123',
  },
});

var adUnits = [
  {
    code: 'test-div',
    mediaTypes: { banner: { sizes: [[728, 90]] }},
    bids: [
      {
        bidder: 'pbsGenericBidder',
        params: {
          adUnitCode: '123456',
        }
      }
   ],
  }
];
```
# Example setup using only bid params
This method to set the global configuration parameters (like **pbsHost**) in **params** could simplify integration of a provider for some publishers. Setting different global config-parameters on different bids is not supported, as the first settings found will be used and any subsequent global settings will be ignored.
```javascript
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: { banner: { sizes: [[728, 90]] }},
    bids: [
      {
        bidder: 'pbsGenericBidder',
        params: {
          adUnitCode: '123456',
          pbsHost: 'prebid-server.example.com',
          accountId: 'myAccount-123',
        }
      }
   ],
  }
];
```

# Example setup with multiple providers
```javascript

pbjs.aliasBidder('pbsGenericBidder', 'providerA');
pbjs.aliasBidder('pbsGenericBidder', 'providerB');

pbjs.setConfig({
  providerA: {
    pbsHost: 'aaaa.example.com',
    accountId: 'myAccount-123',
  },
  providerB: {
    pbsHost: 'bbbb.example.com',
    accountId: 'anotherAccount-987',
  },  
});

var adUnits = [
  {
    code: 'test-div',
    mediaTypes: { banner: { sizes: [[728, 90]] }},
    bids: [
      {
        bidder: 'providerA',
        params: {
          adUnitCode: '123456',
        }
      },
      {
        bidder: 'providerB',
        params: {
          adUnitCode: 'ABCDEFGH',
        }
      },      
   ],
  }
];
```

# Bid Parameters

| Name          | Scope    | Description                                             | Example                    | Type         |
|---------------|----------|---------------------------------------------------------|----------------------------|--------------|
| `adUnitCode`       | required | The placement id. This will be the id of a stored request in Prebid Server | `'123456'`      | `String`     |
| `pbsHost` | required if not set in config | The Prebid Server host name | `'prebid-server.example.com'`                | `String`     |
| `accountId`        | might be required if not set in config | The account id. This will be the id of a stored BidRequest in Prebid Server. This might be required by some providers.  | `myAccount-123`               | `String`      |

# Config Parameters

| Name          | Scope    | Description                                             | Example                    | Type         |
|---------------|----------|---------------------------------------------------------|----------------------------|--------------|
| `pbsHost` | required if not set in bid parameters | The Prebid Server host name | `'prebid-server.example.com'`                | `String`     |
| `accountId`        | might be required if not set in bid parameters | The account id. This will be the id of a stored BidRequest in Prebid Server. This might be required by some providers.  | `myAccount-123`               | `String`      |

