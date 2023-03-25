# Overview

Module Name: FreePass Id System
Module Type: User Id System
Maintainer: dev@freepass.jp

# Description

FreePass user identification system. For assistance setting up your module please contact us at [dev@freepass.jp](dev@freepass.jp).

## Example configuration for publishers:

```js
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'freepassId',
            storage: {
                name: '_freepassId',
                type: 'cookie',
                expires: 30
            },
            params: {
                freepassData: {
                    commonId: 'fpcommonid123',
                    userIp: '127.0.0.1'
                }
            }
        }]
    }
});
```
