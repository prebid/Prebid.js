# Overview

Module Name: ESKIMI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@eskimi.com

# Description

Module that connects to Eskimi demand sources to fetch bids using OpenRTB standard.
Banner and video formats are supported.

# Test Parameters
```javascript
    var adUnits = [{
        code: '/19968336/prebid_banner_example_1',
        mediaTypes: {
            banner: {
                sizes: [[ 300, 250 ]],
                ... // battr
            }
        },
        bids: [{
            bidder: 'eskimi',
            params: {
                placementId: 612,
                ... // bcat, badv, bapp
            }
        }]
    }, {
        code: '/19968336/prebid_video_example_1',
        mediaTypes: {
            video: {
                context: 'outstream',
                mimes: ['video/mp4'],
                api: [1, 2, 4, 6],
                ... // Aditional ORTB video params (including battr)
            }
        },
        bids: [{
            bidder: 'eskimi',
            params: {
                placementId: 612,
                ... // bcat, badv, bapp
            }
        }]
    }];
```

Where:

* `placementId` - Placement ID of the ad unit (required)
* `bcat`, `badv`, `bapp`, `battr` - ORTB blocking parameters as specified by OpenRTB 2.5

# ## Configuration

Eskimi recommends the UserSync configuration below. Without it, the Eskimi adapter will not able to perform user syncs, which lowers match rate and reduces monetization.

```javascript
pbjs.setConfig({
   userSync: {
       filterSettings: {
           iframe: {
               bidders: ['eskimi'], 
               filter: 'include'
           }
       }, 
       syncDelay: 6000
 }});
```

### Bidder Settings

The Eskimi bid adapter uses browser local storage. Since Prebid.js 7.x, the access to it must be explicitly set.

```js
// https://docs.prebid.org/dev-docs/publisher-api-reference/bidderSettings.html
pbjs.bidderSettings = {
    eskimi: {
        storageAllowed: true
    }
}
```
