# TNCID UserID Module

### Prebid Configuration

First, make sure to add the TNCID submodule to your Prebid.js package with: 

```
gulp build --modules=tncIdSystem,userId
```

### TNCIDIdSystem module Configuration

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'tncId',
            params: {
              providerId: "c8549079-f149-4529-a34b-3fa91ef257d1" // Optional
            }
        }],
        syncDelay: 5000
    }
});
```
#### Configuration Params

| Param Name | Required | Type | Description |
| --- | --- | --- | --- |
| name | Required | String | ID value for the TNCID module: `"tncId"` |
| params.providerId | Optional | String | Provide TNC providerId if possible |
