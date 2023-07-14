# Overview

Module Name: A1Media Rtd Provider
Module Type: Rtd Provider
Maintainer: dev@a1mediagroup.co.kr

# Description

This module loads external code using the passed parameter (params.tagId).

The A1Media RTD module loads A1Media script for obtains user segments, and provides user segment data to bid-requests.<br />
to get user segments, you will need a1media script customized for site.

To use this module, you’ll need to work with [A1MediaGroup](https://www.a1mediagroup.com/) to get an account and receive instructions on how to set up your pages and ad server.

Contact dev@a1mediagroup.co.kr for information.

### Integration

1) Build the A1Media RTD Module into the Prebid.js package with:

```
gulp build --modules=a1MediaRtdProvider,...
```

2) Use `setConfig` to instruct Prebid.js to initilaize the A1Media RTD module, as specified below.

### Configuration

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "a1Media",
                waitForIt: true,
                params: {
                    // 'tagId' is unique value for each account.
                    tagId: 'lb4test'
                }
            }
        ]
    }
});
```
