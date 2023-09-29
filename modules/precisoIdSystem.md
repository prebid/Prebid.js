# PRECISO ID

For help adding this module, please contact [tech@preciso.net](tech@preciso.net).

### Prebid Configuration

You can configure this module in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [
      {
        name: "precisoId",
        storage: {
          name: "precisoId",
          type: "html5",
          expires: 14,
        },
        params: {
          tagId: "cHJlYmlkLm9yZw",
        },
      },
    ],
  },
});
```

| Param under `userSync.userIds[]` | Scope    | Type   | Description                 | Example                                   |
| -------------------------------- | -------- | ------ | --------------------------- | ----------------------------------------- |
| name                             | Required | string | ID for the precisoId module     | `"precisoId"`                                 |
| storage                          | Optional | Object | Settings for precisoId storage  | See [storage settings](#storage-settings) |
| params                           | Optional | Object | Parameters for precisoId module | See [params](#params)                     |

### Storage Settings

The following settings are suggested for the `storage` property in the `userSync.userIds[]` object:

| Param under `storage` | Type         | Description                                                                      | Example   |
| --------------------- |  ------------ | -------------------------------------------------------------------------------- | --------- |
| name                  |  String       | Where the ID will be stored                                                      | `"precisoId"` |
| type                  |  String       | For best performance, this should be `"html5"`                                                           | `"html5"` |
| expires               |  Number <= 30 | number of days until the stored ID expires. **Must be less than or equal to 30** | `14`      |
