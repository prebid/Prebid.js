# LEXICON ID

For help adding this submodule, please contact [headerbidding@33across.com](headerbidding@33across.com).

### Prebid Configuration

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: "lexicon",
        storage: {
          name: "lexicon",
          type: "html5",
          expires: 90,
        },
        params: {
          pid: "12345",
        },
      },
    ],
  },
});
```

| Parameters under `userSync.userIds[]` | Scope    | Type   | Description                 | Example                                   |
| ---| --- | --- | --- | --- |
| name | Required | String | Name for the Lexicon submodule | `"lexicon"` |                                 |
| storage                          | Required | Object | Configures how to cache User IDs locally in the browser | See [storage settings](#storage-settings) |
| params                           | Required | Object | Parameters for Lexicon submodule | See [params](#params)                     |

### Storage Settings

The following settings are available for the `storage` property in the `userSync.userIds[]` object:

| Param name | Scope | Type | Description | Example   |
| --- | --- | --- | --- | --- |
| name | Required | String| Name of the cookie or HTML5 local storage where the user ID will be stored | `"lexicon"` |
| type | Required | String | `"html5"` (preferred)  or `"cookie"` | `"html5"` |
| expires | Optional | Integer | How long (in days) the user ID information will be stored. 33Across recommends `90`. | `90` |
| refreshInSeconds | Optional | Integer | The interval (in seconds) for refreshing the user ID. 33Across recommends no more than 8 hours between refreshes. | `8*3600` |

### Params

The following settings are available in the `params` property in `userSync.userIds[]` object:

| Param name | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| pid | Required | String | Partner ID provided by 33Across | `"12345"` |
