# Overview

```
Module Name: CLICKFORCE Bid Adapter
Module Type: Bidder Adapter
Maintainer: danis@clickforce.com.tw
```

# Description

You can use this adapter to get a bid from clickforce. 

About us : http://www.clickforce.com.tw/en/

It requires adapters to start bidding and no extra setting is needed. If you'd like to apply for placements, please contact:

joey@clickforce.com.tw (MR. Joey)

# Test Parameters
```
  var adUnits = [{
    code: 'banner-ad-div',
    sizes: [[300, 250]],
    bids: [{
      bidder: "clickforce",
      params: {
          zone: "6682",
      }
    }]
  }];
```
### Configuration

CLICKFORCE recommend the UserSync configuration below. It's can be optimize the CPM for the request.
```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    syncDelay: 1000
}});
```