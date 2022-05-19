# TNCID UserID Module

### Prebid Configuration

First, make sure to add the TNCID submodule to your Prebid.js package with:

```
gulp build --modules=TNCIDIdSystem,userId
```

### TNCIDIdSystem module Configuration

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: 'TNCID',
        params: {
					providerId: "c8549079-f149-4529-a34b-3fa91ef257d1" //Optional
				}
      },
    ],
  },
});
```
#### Configuration Params

| Param Name | Required | Type | Description |
| --- | --- | --- | --- |
| name | Required | String | ID value for the TNCID module: `"TNCID"` |
| params.providerId | Optional | String | Provide TNC providerId if possible |

