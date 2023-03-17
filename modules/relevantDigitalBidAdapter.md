# Overview

```
Module Name:  Relevant Digital Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support@relevant-digital.com
```

# Description

This adapter is used for integration with providers using the **[Relevant Yield](https://www.relevant-digital.com/relevantyield)** platform. The provider will supply the necessary **pbsHost** and **accountId** settings along with the **placementId** bid parameters per ad unit.

# Example setup using pbjs.setConfig()
This is the recommended method to set the global configuration parameters.
```javascript
pbjs.setConfig({
  relevantdigital: {
    pbsHost: 'pbs-example.relevant-digital.com',
    accountId: '620533ae7f5bbe1691bbb815',
  },
});

var adUnits = [
  {
    code: 'test-div',
    mediaTypes: { banner: { sizes: [[728, 90]] }},
    bids: [
      {
        bidder: 'relevantdigital',
        params: {
          placementId: '610525862d7517bfd4bbb81e_620523b7d1dbed6b0fbbb817',
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
        bidder: 'relevantdigital',
        params: {
          placementId: '610525862d7517bfd4bbb81e_620523b7d1dbed6b0fbbb817',
          pbsHost: 'pbs-example.relevant-digital.com',
          accountId: '620533ae7f5bbe1691bbb815',
        }
      }
   ],
  }
];
```

# Example setup with multiple providers
```javascript

pbjs.aliasBidder('relevantdigital', 'providerA');
pbjs.aliasBidder('relevantdigital', 'providerB');

pbjs.setConfig({
  providerA: {
    pbsHost: 'pbs-example-a.relevant-digital.com',
    accountId: '620533ae7f5bbe1691bbb815',
  },
  providerB: {
    pbsHost: 'pbs-example-b.relevant-digital.com',
    accountId: '990533ae7f5bbe1691bbb815',
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
          placementId: '610525862d7517bfd4bbb81e_620523b7d1dbed6b0fbbb817',
        }
      },
      {
        bidder: 'providerB',
        params: {
          placementId: '990525862d7517bfd4bbb81e_770523b7d1dbed6b0fbbb817',
        }
      },      
   ],
  }
];
```

# Bid Parameters

| Name          | Scope    | Description                                             | Example                    | Type         |
|---------------|----------|---------------------------------------------------------|----------------------------|--------------|
| `placementId`       | required | The placement id.  | `'610525862d7517bfd4bbb81e_620523b7d1dbed6b0fbbb817'`      | `String`     |
| `pbsHost` | required if not set in config | Host name of the server. | `'pbs-example.relevant-digital.com'`                | `String`     |
| `accountId`        | required if not set in config | The account id.  | `620533ae7f5bbe1691bbb815`               | `String`      |

# Config Parameters

| Name          | Scope    | Description                                             | Example                    | Type         |
|---------------|----------|---------------------------------------------------------|----------------------------|--------------|
| `pbsHost` | required if not set in bid parameters | Host name of the server. | `'pbs-example.relevant-digital.com'`                | `String`     |
| `accountId`        | required if not set in bid parameters | The account id.  | `620533ae7f5bbe1691bbb815`               | `String`      |
