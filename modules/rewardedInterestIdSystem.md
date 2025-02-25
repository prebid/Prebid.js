## Rewarded Interest User ID Submodule

This module adds rewarded interest advertising token to the user ID module

*Note: The storage config should be omitted

### Prebid Params

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'rewardedInterestId',
        }]
    }
});
```

## Parameter Descriptions for the `usersync` Configuration Section

| Param under usersync.userIds[] | Scope    | Type   | Description              | Example                |
|--------------------------------|----------|--------|--------------------------|------------------------|
| name                           | Required | String | The name of this module. | `"rewardedInterestId"` |
