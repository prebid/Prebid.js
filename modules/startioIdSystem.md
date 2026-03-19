## Start.io User ID Submodule

The Start.io User ID submodule generates and persists a unique user identifier by fetching it from a Start.io-managed endpoint. This endpoint is fixed within the submodule implementation and is not configurable via Prebid.js parameters. The ID is stored in both cookies and local storage for subsequent page loads and is made available to other Prebid.js modules via the standard `eids` interface.

For integration support, contact prebid@start.io.

### Prebid Params Enabling User Sync

To enable iframe-based user syncing for Start.io, include the `filterSettings` configuration in your `userSync` setup:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'startioId',
            storage: {
                type: 'cookie&html5',        // 'cookie', 'html5', or 'cookie&html5'
                name: 'startioId',
                expires: 90                 // optional, 90 days by default
            }
        }],
        filterSettings: {
            iframe: {
                bidders: ['startio'],
                filter: 'include'
            }
        }
    }
});
```

This configuration allows Start.io to sync user data via iframe, which is necessary for cross-domain user identification.

## Parameter Descriptions for the `userSync` Configuration Section

The below parameters apply only to the Start.io User ID integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"startioId"` |
| storage | Required | Object | Storage configuration for the user ID. | |
| storage.type | Required | String | Type of storage: `"cookie"`, `"html5"`, or `"cookie&html5"`. | `"cookie&html5"` |
| storage.name | Required | String | The name used to store the user ID. | `"startioId"` |
| storage.expires | Optional | Number | Number of days before the stored ID expires. Defaults to `90`. | `365` |
