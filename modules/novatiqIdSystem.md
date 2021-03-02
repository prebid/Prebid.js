# Novatiq Snowflake ID

Novatiq proprietary dynamic snowflake ID is a unique, non sequential and single use identifier for marketing activation. Our in network solution matches verification requests to telco network IDs, safely and securely inside telecom infrastructure. Novatiq snowflake ID can be used for identity validation and as a secured 1st party data delivery mechanism.

## Novatiq Snowflake ID Configuration

Enable by adding the Novatiq submodule to your Prebid.js package with:

```
gulp build --modules=novatiqIdSystem,userId
```

Module activation and configuration:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'novatiq',
      params: {
        sourceid '1a3',            // change to the Partner Number you received from Novatiq
        }
      }
    }],
    auctionDelay: 50             // 50ms maximum auction delay, applies to all userId modules
  }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | Module identification: `"novatiq"` | `"novatiq"` |
| params | Required | Object | Configuration specifications for the Novatiq module. | |
| params.sourceid | Required | String | This is the Novatiq Partner Number obtained via Novatiq registration. | `1a3` |

If you have any questions, please reach out to us at prebid@novatiq.com.
