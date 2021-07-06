# Overview

```
Module Name:  ConnectAd PreBid Adapter
Module Type:  Bidder Adapter
Maintainer: support@connectad.io
```

# Description

ConnectAd bid adapter supports only Banner at present. Video and Mobile will follow Q2/2020

# Sample Ad Unit: For Publishers
```
var adUnits = [
{
    code: 'test-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300,600]]
        }
    },
    bids: [{
        bidder: 'connectad',
        params: {
            siteId: 123456,     
            networkId: 123456,
            bidfloor: 0.20 // Optional: Requested Bidfloor  
        }
    }]
}

# ## Configuration
ConnectAd recommends the UserSync configuration below otherwise we will not be able to performe user syncs.

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: {
                bidders: ['connectad'],
                filter: 'include'
            }
        }
    }
});