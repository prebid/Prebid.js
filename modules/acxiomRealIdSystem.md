## Acxiom Real ID Submodule

Acxiom Real ID module surfaces an Acxiom Real ID in the bid request via the Prebid User ID system. The module sends a POST request to the lookup API with the partner ID, source ID, and user agent, and stores the returned token for use in bid requests.

## Building Prebid with Acxiom Real ID Support

Add the Acxiom Real ID submodule to your Prebid.js package:

```
gulp build --modules=acxiomRealIdSystem,userId
```

## Configuration

The following configuration parameters are available:

| Param | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | Module identifier | `'acxiomRealId'` |
| params | Required | Object | Module configuration | |
| params.partnerId | Required | String | Partner ID issued by GrowthCode on behalf of Acxiom | `'ABC123'` |
| params.hem | Optional | String | SHA-256 hashed email for improved match rate | `'a1b2c3...'` |
| params.sourceId | Optional | String | EID source to request from the lookup API. Defaults to `'acxiom.id'` | `'acxiom.id'` |
| params.apiUrl | Optional | String | Override the full API endpoint URL | `'https://ids.api.gcprivacy.id/v1/eid/l'` |
| storage | Required | Object | Storage configuration | |
| storage.type | Required | String | Storage type | `'html5'` |
| storage.name | Required | String | Storage key | `'acxiomRealId'` |
| storage.expires | Required | Number | TTL in days | `7` |

### Example Configuration

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'acxiomRealId',
      params: {
        partnerId: 'YOUR_PARTNER_ID'
      },
      storage: {
        type: 'html5',
        name: 'acxiomRealId',
        expires: 7
      }
    }]
  }
});
```

### Configuration with Custom API URL and Hashed Email

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'acxiomRealId',
      params: {
        partnerId: 'YOUR_PARTNER_ID',
        hem: 'sha256_hashed_email_here',
        apiUrl: 'https://ids.api.gcprivacy.id/v1/eid/l'
      },
      storage: {
        type: 'html5',
        name: 'acxiomRealId',
        expires: 7
      }
    }]
  }
});
```

### EID Output

The module produces the following EID structure in `user.ext.eids`:

```json
{
  "source": "acxiom.id",
  "uids": [{
    "id": "<real_id_token>",
    "atype": 1
  }]
}
```
