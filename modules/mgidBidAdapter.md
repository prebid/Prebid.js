# Overview

```
Module Name: Mgid Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@mgid.com
```

# Description

One of the easiest way to gain access to MGID demand sources  - MGID header bidding adapter.

MGID header bidding adapter connects with MGID demand sources to fetch bids for display placements

# Test Parameters


300x600 banner test
```
var adUnits = [{
  code: 'div-prebid',
  mediaTypes: {
    banner: {
      sizes: [[300, 600]]
    }
  },
  bids: [{
    bidder: 'mgid',
    params : {
      accountId : "#{accountId}", // replace with your accountId
    }
  }]
}];
```

300x250 banner test
```
var adUnits = [{
  code: 'div-prebid',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'mgid',
    params : {
      accountId : "#{accountId}", // replace with your accountId
    }
  }]
}];
```

# Bid Parameters

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `accountId` | required | String | The account ID from Mgid  | `123`

## Supported Media Types

- Banner
- Native

# Ad Unit and page Setup:

```html
<!-- Prebid Config section -->
<script>
    var PREBID_TIMEOUT = 2000;
    var adUnits = [{
        code: 'placement_div_id',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'mgid',
            params: {
                accountId: "#{accountId}"
            }
        }]
    }];
    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];
</script>
<!-- End Prebid Config section -->
```
