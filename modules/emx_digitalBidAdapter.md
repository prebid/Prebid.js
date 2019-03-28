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
            sizes: [ 
                [300, 250], [300, 600]
        }
    },
    bids: [
    {
        bidder: 'emx_digital',
        params: {
           tagid: '25251',
        }
    }]
}];
```
