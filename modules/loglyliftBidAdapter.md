# Overview
```
Module Name: LOGLY lift for Publisher
Module Type: Bidder Adapter
Maintainer: dev@logly.co.jp
```

# Description
Module that connects to Logly's demand sources.
Currently module supports only native mediaType.

# Test Parameters
```
var adUnits = [
  // Native adUnit
  {
    code: 'test-native-code',
    sizes: [[1, 1]],
    mediaTypes: {
      native: {
        title: {
          required: true
        },
        image: {
          required: true
        },
        sponsoredBy: {
          required: true
        }
      }
    },
    bids: [{
      bidder: 'loglylift',
      params: {
        adspotId: 4302078
      }
    }]
  }
];
```

# UserSync example

```
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: '*', // '*' represents all bidders
        filter: 'include'
      }
    }
  }
});
```
