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
          pid: "cHJlYmlkLm9yZw",
        },
      },
    ],
  },
});
```

| Parameters under `userSync.userIds[]` | Scope    | Type   | Description                 | Example                                   |
| ---| --- | --- | --- | --- |
| name | Required | string | Name for the Lexicon submodule | `"lexicon"` |                                 |
| storage                          | Required | Object | Place where to store the user IDs | See [storage settings](#storage-settings) |
| params                           | Optional | Object | Parameters for Lexicon submodule | See [params](#params)                     |

### Storage Settings

The following settings are available for the `storage` property in the `userSync.userIds[]` object:

| Param name | Scope | Type | Description | Example   |
| --- | --- | --- | --- | --- |
| name | Required | String| Name of the cookie or HTML5 local storage where the user ID will be stored | `"lexicon"` |
| type | Required | String | `"html5"` (preferred)  or `"cookie"` | `"html5"` |
| expires | Strongly recommended | Number | How long (in days) the user ID information will be stored. 33Across recommends 90 | 90 |

### Params

The following settings are available in the `params` property in `userSync.userIds[]` object:

| Param name | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| pid | Required | String | Partner ID provided by 33across | `"12345"` |
| apiUrl | Optional | String | Optional URL that overwrites the default endpoint URL | `"https://staging-api-lexicon.33across.com/v1/envelope"` |
