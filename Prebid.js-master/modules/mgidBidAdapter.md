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
  // Replace this object to test a new Adapter!
  bids: [{
    bidder: 'mgid',
    params : {
      accountId : "219", //test accountId, please replace after test
      placementId : "331749" // 300x600 test placementId, please replace after test
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
  // Replace this object to test a new Adapter!
  bids: [{
    bidder: 'mgid',
    params : {
      accountId : "219", //test accountId, please replace after test
      placementId : "331748" // 300x250 test placementId, please replace after test
    }
  }]
}];
```

# Bid Parameters
## Banner

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `accountId` | required | String | The account ID from Mgid  | "123"
| `placementId` | required | String | The placement ID from Mgid  | "123456"


# Ad Unit and page Setup:

```html
 <!-- Prebid Config section -->
 <script>
     var PREBID_TIMEOUT = 2000;
     var adUnits = [{
         code: 'placement_div_id',
         sizes: [[300, 250]],
         bids: [{
            bidder: 'mgid'
            accountId : "PUT_YOUR_mgid_accountId",
            placementId : "PUT_YOUR_mgid_placementId",
         }]
     }]; 
    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];
</script>
<!-- End Prebid Config section -->
```
