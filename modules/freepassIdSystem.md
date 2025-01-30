## FreePass User ID Submodule

[FreePass](https://freepass-login.com/introduction.html) is a common authentication service operated by Freebit Co., Ltd. Users with a FreePass account do not need to create a new account to use partner services. 

# General Information

Please contact FreePass before using this ID.

```
Module Name: FreePass Id System
Module Type: User Id System
Maintainer: fp-hbidding@freebit.net
```

## Building Prebid with FreePass ID Support

First, make sure to add the FreePass ID submodule to your Prebid.js package with:

```shell
gulp build --modules=freepassIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'freepassId',
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

| Param under userSync.userIds[] | Scope    | Type   | Description                                          | Example        |
|--------------------------------|----------|--------|------------------------------------------------------|----------------|
| name                           | Required | String | The name of this module                              | `"freepassId"` |
| freepassData                   | Optional | Object | FreePass data                                        | `{}`           |
| freepassData.commonId          | Optional | String | Common ID obtained from FreePass                     | `"abcd1234"`   |
| freepassData.userIp            | Optional | String | User IP obtained in cooperation with partner service | `"127.0.0.1"`  |

