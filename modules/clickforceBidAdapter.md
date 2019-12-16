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

# Test Parameters (Display ad)
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
# Test Parameters (Native ad)
```
  var adUnits = [{
    code: 'banner-ad-div',
    sizes: [[300, 250]],
    mediaTypes: {
        native: {
            title: {
                required: true,
            },
            body: {
                required: true
            },
            image: {
                required: true,
            },
            icon: {
                required: false,
            },
            clickUrl: {
                required: true
            },
            cta: {
                required: true
            },
            sponsoredBy: {
                required: true
            }
        }
    },    
    bids: [{
      bidder: "clickforce",
      params: {
          zone: "6878",
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