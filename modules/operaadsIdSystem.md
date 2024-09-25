# Opera ID System

For help adding this module, please contact [adtech-prebid-group@opera.com](adtech-prebid-group@opera.com).

### Prebid Configuration

You should configure this module under your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [
            {
                name: "operaId",
                storage: {
                    name: "operaId",
                    type: "html5",
                    expires: 14
                },
                params: {
                    pid: "your-pulisher-ID-here"
                }
            }
        ]
    }
})
```
<br>

| Param under `userSync.userIds[]` | Scope    | Type   | Description                   | Example                                   |
| -------------------------------- | -------- | ------ | ----------------------------- | ----------------------------------------- |
| name                             | Required | string | ID for the operaId module     | `"operaId"`                               |
| storage                          | Optional | Object | Settings for operaId storage  | See [storage settings](#storage-settings) |
| params                           | Required | Object | Parameters for opreaId module | See [params](#params)                     |
<br>

### Params

| Param under `params` | Scope    | Type   | Description                    | Example         |
| -------------------- | -------- | ------ | ------------------------------ | --------------- |
| pid                  | Required | string | Publisher ID assigned by Opera | `"pub12345678"` |
<br>

### Storage Settings

The following settings are suggested for the `storage` property in the `userSync.userIds[]` object:

| Param under `storage` | Type          | Description                                                                      | Example     |
| --------------------- | ------------- | -------------------------------------------------------------------------------- | ----------- |
| name                  |  String       | Where the ID will be stored                                                      | `"operaId"` |
| type                  |  String       | For best performance, this should be `"html5"`                                   | `"html5"`   |
| expires               |  Number <= 30 | number of days until the stored ID expires. **Must be less than or equal to 30** | `14`        |