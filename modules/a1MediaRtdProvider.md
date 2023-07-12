# Overview

Module Name: A1Media Rtd Provider
Module Type: Rtd Provider
Maintainer: dev@a1mediagroup.co.kr

# Description

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

This module loads external code using the passed parameter (params.tagId).

The reason for needing an external script is not just to acquire data from the current page, but also to analyze accumulated data periodically. Instead of using a version, the script is loaded based on the date for a specific reason. The A1Media script has many customizable elements for the deployed site. Therefore, there is an issue where the script needs to be changed immediately upon request from the site. By loading the script based on the date, it ensures that the script is refreshed within a maximum of one day.

The A1media RTD module provides user segments in the site.
To use this module, you’ll need to work with [A1MediaGroup] to get an account and receive instructions on how to set up your pages and ad server.

Contact dev@a1mediagroup.co.kr for information.

