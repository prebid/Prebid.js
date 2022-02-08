# Overview

```
Module Name : Axonix Bidder Adapter
Module Type : Bidder Adapter
Maintainer  : support.axonix@emodoinc.com
```

# Description

Module that connects to Axonix's exchange for bids.

# Parameters

| Name          | Scope    | Description                                     | Example                                |
| :------------ | :------- | :---------------------------------------------- | :------------------------------------- |
| `supplyId`    | required | Supply UUID                                     | `"2c426f78-bb18-4a16-abf4-62c6cd0ee8de"` |
| `region`      | optional | Cloud region                                    | `"us-east-1"`                            |
| `endpoint`    | optional | Supply custom endpoint                          | `"https://open-rtb.axonix.com/custom"`   |
| `instl`       | optional | Set to 1 if using interstitial (default: 0)     | `1`   |

# Test Parameters

## Banner

```javascript
var bannerAdUnit = {
  code: 'test-banner',
  mediaTypes: {
    banner: {
      sizes: [[120, 600], [300, 250], [320, 50], [468, 60], [728, 90]]
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'abc',
      region: 'def',
      endpoint: 'url'
    }
  }]
};
```

## Video

```javascript
var videoAdUnit = {
  code: 'test-video',
  mediaTypes: {
    video: {
      protocols: [1, 2, 3, 4, 5, 6, 7, 8]
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'abc',
      region: 'def',
      endpoint: 'url'
    }
  }]
};
```

## Native

```javascript
var nativeAdUnit = {
  code: 'test-native',
  mediaTypes: {
    native: {

    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'abc',
      region: 'def',
      endpoint: 'url'
    }
  }]
};
```

## Multiformat

```javascript
var adUnits = [
{
  code: 'test-banner',
  mediaTypes: {
    banner: {
      sizes: [[120, 600], [300, 250], [320, 50], [468, 60], [728, 90]]
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'abc',
      region: 'def',
      endpoint: 'url'
    }
  }]
},
{
  code: 'test-video',
  mediaTypes: {
    video: {
      protocols: [1, 2, 3, 4, 5, 6, 7, 8]
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'abc',
      region: 'def',
      endpoint: 'url'
    }
  }]
},
{
  code: 'test-native',
  mediaTypes: {
    native: {

    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'abc',
      region: 'def',
      endpoint: 'url'
    }
  }]
}
];
```
