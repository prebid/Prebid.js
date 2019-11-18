# Overview

**Module Name**: Slimcut Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: support@slimcut.com

# Description

Use `slimcut` as bidder.

`placementId` is required and must be integer.

The Slimcut adapter requires setup and approval from the Slimcut team.
Please reach out to your account manager for more information.

# Test Parameters

```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[640, 480]],  
               bids: [
                   {
                       bidder: "slimcut",
                       params: {
                            placementId: 1234
                       }
                   }
               ]
           }
       ];
```

## UserSync example

```
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    syncEnabled: true,
    syncDelay: 1
  }
});
```
