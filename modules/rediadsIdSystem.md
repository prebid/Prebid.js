## Rediads User ID Submodule

The Rediads User ID submodule generates a first-party identifier in the browser, stores it through Prebid's `userId` framework, and exposes it through `bidRequest.userId` and `userIdAsEids`.

The module is vendorless for TCF enforcement, so Prebid applies purpose-level storage checks without requiring a separate vendor consent entry.

### Build the Module

```bash
gulp build --modules=userId,rediadsIdSystem
```

### Example Configuration

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'rediadsId',
      params: {
        source: 'rediads.com'
      },
      storage: {
        type: 'html5',
        name: 'rediads_id',
        expires: 30,
        refreshInSeconds: 3600
      }
    }]
  }
});
```

### Parameters

| Param under `userSync.userIds[]` | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| `name` | Required | String | Name of the module. | `'rediadsId'` |
| `params` | Optional | Object | Rediads-specific configuration. | |
| `params.source` | Optional | String | EID `source` value to emit. Defaults to `'rediads.com'`. | `'rediads.com'` |
| `storage.type` | Recommended | String | Prebid-managed storage type. | `'html5'` |
| `storage.name` | Recommended | String | Storage key used by Prebid. | `'rediads_id'` |
| `storage.expires` | Optional | Number | Days before the cached ID expires. Defaults to `30`. | `30` |
| `storage.refreshInSeconds` | Optional | Number | Seconds before the cached ID is refreshed. Defaults to `3600`. | `3600` |

### Behavior Notes

- `getId()` generates a `ruid_<uuid>` value on first use.
- `extendId()` preserves the existing Rediads ID and refreshes metadata.
- `decode()` exposes the ID as `bidRequest.userId.rediadsId`.
- EIDs are suppressed when US Privacy or GPP opt-out signals indicate sharing should be blocked.
- The module returns `undefined` when COPPA applies or when GDPR applies without TCF Purpose 1 consent.
