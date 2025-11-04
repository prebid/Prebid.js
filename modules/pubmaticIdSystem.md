# PubMatic ID

### Prebid Configuration

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: "pubmaticId",
        params: {
          publisherId: 123456
        },
        storage: {
          name: "pubmaticId",
          type: "cookie&html5",
          expires: 30,
          refreshInSeconds: 86400
        },
      },
    ],
  },
});
```

| Parameters under `userSync.userIds[]` | Scope    | Type   | Description                 | Example                                   |
| ---| --- | --- | --- | --- |
| name | Required | String | Name for the PubMatic ID submodule | `"pubmaticId"` |                                 |
| storage                          | Required | Object | Configures how to cache User IDs locally in the browser | See [storage settings](#storage-settings) |
| params                           | Required | Object | Parameters for the PubMatic ID submodule | See [params](#params)                     |

### Storage Settings

The following settings are available for the `storage` property in the `userSync.userIds[]` object:

| Param name | Scope | Type | Description | Example   |
| --- | --- | --- | --- | --- |
| name | Required | String| Name of the cookie or HTML5 local storage where the user ID will be stored | `"pubmaticId"` |
| type | Required | String | `"cookie&html5"` (preferred)  or `"cookie"` or `"html5"` | `"cookie&html5"` |
| expires | Required (Must be `30`) | Number | How long (in days) the user ID information will be stored | `30` |
| refreshInSeconds | Required (Must be `86400`) | Number | The interval (in seconds) for refreshing the user ID | `86400` |

### Params

The following settings are available in the `params` property in `userSync.userIds[]` object:

| Param name | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| publisherId | Required | Number | Publisher ID provided by PubMatic | `123456` |
