## FreePass User ID Submodule

[FreePass](https://freepass-login.com/introduction.html) is a common authentication service operated by Freebit Co., Ltd. If you have a FreePass account, you do not need to create a new account with the linked service. Please sign up with FreePass before using this ID. 

## Building Prebid with FreePass ID Support

First, make sure to add the FreePass ID submodule to your Prebid.js package with:

```
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

| Param under userSync.userIds[] | Scope    | Type   | Description              | Example        |
|--------------------------------|----------|--------|--------------------------|----------------|
| name                           | Required | String | The name of this module. | `"freepassId"` |
| freepassData                   | Optional | Object | FreePass data            | `{}`           |
| freepassData.commonId          | Optional | String | FreePass common ID       | `"abcd1234"`   |
| freepassData.userIp            | Optional | String | IP of user               | `"127.0.0.1"`  |

