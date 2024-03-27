# Overview

Module Name: pirIDSystem
Module Type: UserID Module
Maintainer: pawel.grudzien@grupawp.pl

# Description

User identification system for WPM

### Prebid Params example

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'pirID',
            storage: {
                type: 'cookie',
                name: 'pirIdToken',
                expires: 7,
                refreshInSeconds: 360
            },
        }]
    }
});
```
