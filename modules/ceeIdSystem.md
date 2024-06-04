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
            }
        }]
    }
});
```
