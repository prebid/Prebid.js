# Overview

Module Name: ceeIdSystem
Module Type: UserID Module
Maintainer: pawel.grudzien@grupawp.pl

# Description

User identification system for WPM

### Prebid Params example

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'ceeId',
            storage: {
                type: 'cookie',
                name: 'ceeIdToken',
                expires: 7,
                refreshInSeconds: 360
            },
            params: {
                tokenName: 'name' // Your custom name of token to read
                value: 'tokenValue' // Optional param if you want to pass token value directly through setConfig (this param shouldn't be set if token value will be taken from cookie or LS)
            }
        }]
    }
});
```
