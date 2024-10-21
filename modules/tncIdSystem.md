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
              url: 'https://js.tncid.app/remote.min.js' //Optional
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
| params.url | Optional | String | Provide TNC fallback script URL, this script is loaded if there is no TNC script on page |
