# Overview

```
Module Name:  EMX Digital Adapter
Module Type:  Bidder Adapter
Maintainer: git@emxdigital.com
```

# Description

The EMX Digital adapter provides publishers with access to the EMX Marketplace. The adapter is GDPR compliant. Please note that the adapter supports Banner media type only.

Note: The EMX Digital adapter requires approval and implementation guidelines from the EMX team, including existing publishers that work with EMX Digital. Please reach out to your account manager or prebid@emxdigital.com for more information.

The bidder code should be ```emx_digital```
The params used by the bidder are :
```tagid``` - string (mandatory)
```bidfloor``` - string (optional)

# Test Parameters
```
var adUnits = [{
    code: 'banner-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250], [320, 90]],
        }
    },
    bids: [
    {
        bidder: 'emx_digital',
        params: {
           tagid: 'test1',
        }
    }]
}, {
    code: 'banner-div-2',
    mediaTypes: {
        banner: {
            sizes: [[300, 300]],
        }
    },
    bids: [
    {
        bidder: 'emx_digital',
        params: {
           tagid: 'test2',
           bidfloor: '0.25'
        }
    }]
}, {
    code: 'banner-div-3',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250]],
        }
    },
    bids: [
    {
        bidder: 'emx_digital',
        params: {
           tagid: 'test3',
           bidfloor: '0.25'
        }
    }]
}];
```
