## Acxiom Real ID Submodule

Acxiom Real ID module surfaces an Acxiom Real ID in the bid request via the Prebid User ID system. The module sends a POST request to the lookup API with the partner ID, source ID, and user agent, and stores the returned token for use in bid requests.

> **Important — a hashed email (`hem`) is required to resolve an ID.** The lookup API resolves the Acxiom Real ID **solely** by matching the supplied hashed email (HEM). If `params.hem` is not provided, the API has nothing to match against and returns an empty result, so no ID is stored and none is added to the bid request. Configuring only `partnerId` will therefore never resolve an ID on its own — you must also pass `params.hem` for any user you want to resolve (typically a logged-in / known user whose email you can hash). See [Passing the hashed email (`hem`)](#passing-the-hashed-email-hem) for how to produce it.

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
| params.hem | Required to resolve | String | SHA-256 hashed email of the user. This is the **only** signal the API matches on — without it the API returns an empty result and no ID is set. Technically optional (the module will still fire a request without it), but resolution is impossible unless it is supplied. The module forwards this value to the API **exactly as provided** — no hashing or transformation is applied. See [Passing the hashed email](#passing-the-hashed-email-hem). | `'a1b2c3...'` |
| params.sourceId | Optional | String | EID source to request from the lookup API. Defaults to `'acxiom.id'` | `'acxiom.id'` |
| params.apiUrl | Optional | String | Override the full API endpoint URL | `'https://ids.api.gcprivacy.id/v1/eid/l'` |
| storage | Required | Object | Storage configuration | |
| storage.type | Required | String | Storage type | `'html5'` |
| storage.name | Required | String | Storage key | `'acxiomRealId'` |
| storage.expires | Required | Number | TTL in days | `7` |

### Example Configuration

Both `partnerId` and `hem` are required. `partnerId` alone will not resolve — with no `params.hem` the API has nothing to match on and always returns an empty result, so **no ID is resolved or stored**.

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'acxiomRealId',
      params: {
        partnerId: 'YOUR_PARTNER_ID',
        hem: 'a1b2c3...' // required — SHA-256 or MD5 hashed email
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

### Passing the hashed email (`hem`)

The `hem` value is a **hashed email (HEM)** — a hash of the user's email address. The module sends this value to the API **unchanged**, and the lookup is an **exact match** against the ID graph — so the value you send must be produced the same way the graph was keyed (same hash algorithm and the same email form). Use the exact hashing convention agreed with your GrowthCode contact.

If the hashed email is available at page-configuration time, set it directly in `params.hem` (see [Example Configuration](#example-configuration)).

Because the email is often only known after the user logs in (i.e. after the initial Prebid config), you can supply the `hem` later by re-setting the User ID configuration and refreshing:

```javascript
pbjs.setConfig({
  userSync: {
    // setConfig REPLACES userSync.userIds, so re-list all of your userId configs here.
    userIds: [
      {
        name: 'acxiomRealId',
        params: { partnerId: 'YOUR_PARTNER_ID', hem: hashedEmail },
        storage: { type: 'html5', name: 'acxiomRealId', expires: 7 }
      }
      // ...your other userId submodule configs
    ]
  }
});
pbjs.refreshUserIds(); // re-run resolution now that a hem is available
```

> Use `setConfig` (which replaces `userSync.userIds`) and re-list all of your userId configs. Do **not** use `mergeConfig` to add the `hem` — it appends to the array and would create a duplicate `acxiomRealId` entry instead of updating the existing one.

**Notes:**
- The lookup is an exact match on the hashed email, so it must be produced the same way the ID graph was built (same hash algorithm — e.g. SHA-256 or MD5 — and the same email form).
- Only supply a `hem` for users whose email you legitimately hold and for whom you have the appropriate consent.
- `refreshUserIds()` re-queries only when no ID is already stored for this module. If a previous lookup already stored an ID (in `storage.name`), that stored value is returned as-is; clear it first if you need to force a fresh lookup with a newly available `hem`.
- If no `hem` is available for a given user (e.g. anonymous / logged-out), it is expected that no ID resolves — Prebid will log an informational `request id responded with an empty value` message, which is normal and not an error.

### Configuration with Custom API URL

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
