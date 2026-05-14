# ABTShield ID

The ABTShield ID is a user ID submodule that retrieves an ABTShield identifier
and optional audience or invalid-traffic segments from the ABTShield User ID
endpoint. The submodule exposes the resolved identifier through the standard
Prebid.js User ID infrastructure and adds it to bid requests as an EID with
`source: "abtshield.com"`.

The ABTShield ID module uses Prebid's User ID storage configuration to cache the
ABTShield User ID response locally. It does not renew the cached value on every
page view. To request a fresh ABTShield ID once per day, configure
`storage.refreshInSeconds: 86400`.

## ABTShield ID Registration

ABTShield requires a service ID (`sid`) for each integration. Register at
[abtshield.com](https://abtshield.com) to obtain the `sid` value used in the
module configuration.

ABTShield also validates the request `Referer` header against the domain
allowlist associated with the configured `sid`. Add every domain and subdomain
that will run this module to the allowlist in the ABTShield dashboard. Requests
from non-allowlisted domains are rejected server-side even when the `sid` is
valid.

For support, contact [support@abtshield.com](mailto:support@abtshield.com).

## ABTShield ID Configuration

First, make sure to add the ABTShield ID submodule and the User ID module to
your Prebid.js package with:

```
gulp build --modules=abtshieldIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'abtshieldId',
      params: {
        sid: 'pb.your-service-id' // change to the service ID received from ABTShield
      },
      storage: {
        type: 'html5',             // "html5" or "cookie" are supported
        name: 'abtshield_id',      // local storage or cookie key for the cached response
        expires: 1,                // storage TTL in days; the module requires at least 1
        refreshInSeconds: 86400    // refresh once per day
      }
    }],
    auctionDelay: 50               // optional; applies to all userId modules
  }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module: `"abtshieldId"` | `"abtshieldId"` |
| params | Required | Object | Details for the ABTShield ID request. | |
| params.sid | Required | String | Service ID obtained from ABTShield. The module trims leading and trailing whitespace. If this value is missing or blank, the module logs an error and skips the ABTShield User ID request. | `"pb.your-service-id"` |
| storage | Required | Object | Storage settings used by the User ID module to cache the ABTShield User ID response locally. | |
| storage.type | Required | String | Where the cached response will be stored. ABTShield supports `"html5"` and `"cookie"`. | `"html5"` |
| storage.name | Required | String | The local storage or cookie key used for the cached response. | `"abtshield_id"` |
| storage.expires | Required | Number | How long, in days, the cached response may remain in storage. The module requires a value of `1` or greater and rejects missing, non-numeric, or shorter values. | `1` |
| storage.refreshInSeconds | Optional | Number | How many seconds until Prebid should call ABTShield again while a cached ID still exists. If set, the value must be `86400` or greater. Set this to `86400` for once-per-day refresh. If omitted, Prebid waits until the stored value expires, consent changes, or the publisher explicitly refreshes user IDs before requesting a new ID. | `86400` |

**ATTENTION:** `storage.expires` and `storage.refreshInSeconds` are different
controls. `storage.expires` is the maximum storage lifetime in days.
`storage.refreshInSeconds` is the refresh interval used by Prebid while a stored
ID still exists. The ABTShield module rejects `refreshInSeconds` values below
`86400` to prevent refreshes more often than once per day. For a daily ABTShield
ID refresh, set both `expires: 1` and `refreshInSeconds: 86400`. The ABTShield
module does not implement `extendId`, so cached IDs are not re-saved on every
page view and the refresh interval is not reset by normal reads.

## Provided EID

The module provides the following EID:

```json
{
  "source": "abtshield.com",
  "uids": [{
    "id": "<iuid>",
    "atype": 1,
    "ext": { "segments": ["seg-1", "seg-2"] }
  }]
}
```

The `id` value is taken from the ABTShield User ID response `iuid` field. The
module also accepts `uuid` as a fallback response field.

The `ext.segments` field contains string values from the ABTShield User ID
response `t` field. When the ABTShield response contains `b: 1`, the module
also adds the `sivt` segment. The `ext.segments` field is omitted when there
are no string `t` segments and `b` is not `1`.

## Caching and Refresh Behavior

The ABTShield ID module requires a `storage` block. If `storage.type`,
`storage.name`, or a valid `storage.expires` value is missing, the module logs
an error and does not call the ABTShield User ID endpoint. The module also skips
the request when `storage.expires` is less than `1`, or when
`storage.refreshInSeconds` is set below `86400`.

On the first page view where no cached ABTShield ID exists, Prebid calls the
ABTShield User ID endpoint and stores the response returned by the module. On
later page views, Prebid decodes the cached response and exposes it through
`userId` and `user.eids` without another network call until one of the following
happens:

- the stored value expires according to `storage.expires`
- the configured `storage.refreshInSeconds` interval has elapsed
- consent data changes
- the publisher explicitly calls `refreshUserIds`

For once-per-day refresh, use:

```javascript
storage: {
  type: 'html5',
  name: 'abtshield_id',
  expires: 1,
  refreshInSeconds: 86400
}
```

This configuration lets Prebid reuse the cached ABTShield ID within the day and
call the ABTShield User ID endpoint again after 24 hours. Because this submodule
does not return a value from `extendId`, reading a cached ID does not re-save
the cached response or reset the refresh timing.

Publishers should not set `refreshInSeconds` below `86400`; the module treats
that as invalid configuration and skips the ABTShield User ID request.

## Network Requirements

Requests to the ABTShield User ID endpoint are sent with credentials using
`withCredentials: true`. The ABTShield server must respond with
`Access-Control-Allow-Credentials: true` and a specific, non-wildcard
`Access-Control-Allow-Origin` header. If these response headers are absent, the
browser will block the response and the module will not resolve an ID.

Publisher pages that set a `Referrer-Policy: no-referrer` header or equivalent
meta tag suppress the `Referer` header on outbound requests. Because ABTShield's
User ID endpoint uses the `Referer` header to validate the requesting domain
against the allowlist configured for the `sid`, a missing referrer will cause
the server to reject the request regardless of whether the `sid` itself is
correct.

## Vendor Details

- Source: `abtshield.com`
- IAB GVL ID: `825`
- Maintainer: [support@abtshield.com](mailto:support@abtshield.com)
