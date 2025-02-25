# Overview

```
Module Name: AnyClip Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: support@anyclip.com
```

# Description

Connects to AnyClip Marketplace for bids.

For more information about [AnyClip](https://anyclip.com), please contact [support@anyclip.com](support@anyclip.com).

AnyClip bid adapter supports Banner currently*.

Use `anyclip` as bidder.

# Bid Parameters

| Key           | Required | Example                  | Description                           |
|---------------|----------|--------------------------|---------------------------------------|
| `publisherId` | Yes      | `'12345'`                | The publisher ID provided by AnyClip  |
| `supplyTagId` | Yes      | `'-mptNo0BycUG4oCDgGrU'` | The supply tag ID provided by AnyClip |
| `floor`       | No       | `0.5`                    | Floor price                           |


# Sample Ad Unit: For Publishers
## Sample Banner only Ad Unit
```js
var adUnits = [{
  code: 'adunit1', // ad slot HTML element ID  
  mediaTypes: {
    banner: {  
      sizes: [
          [300, 250], 
          [728, 90]
      ]
    }   
  },
  bids: [{
    bidder: 'anyclip',
    params: {
        publisherId: '12345', // required, string
        supplyTagId: '-mptNo0BycUG4oCDgGrU', // required, string
        floor: 0.5 // optional, floor
    }
  }]
}]
```


