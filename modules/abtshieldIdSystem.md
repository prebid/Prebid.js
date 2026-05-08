# ABTShield User ID Submodule

ABTShield provides cookie-less user identification and audience segmentation
through its MCR endpoint. This submodule retrieves the ABTShield `uuid` and
optional segment list and surfaces them to bid adapters through the standard
Prebid.js User ID infrastructure.

**Component category:** Module → Ad Request Enrichment (User ID submodule).
The module enriches the outbound bid request with the ABTShield identifier
and audience segments via `user.eids`.

## Vendor

- Source: `abtshield.com`
- IAB GVL ID: `825`
- Endpoint: `https://d1.abtshield.com/mcr`
- Maintainer: `support@abtshield.com`

## Prerequisites

Before using this module you need:

1. **A service ID (`sid`)** — register at [abtshield.com](https://abtshield.com) to obtain a unique identifier for your integration. The `sid` is required; the module will log an error and skip the ID fetch if it is absent or blank.

2. **Domain whitelisting** — ABTShield's MCR endpoint validates the `Referer` header against the domain allowlist associated with your `sid`. Add every domain (and subdomain) from which the module will be loaded to your allowlist in the ABTShield dashboard. Requests arriving from non-whitelisted domains are rejected server-side regardless of the `sid` value.

## Building Prebid

Add the module to your build:

```bash
gulp build --modules=userId,abtshieldIdSystem
```

## Configuration

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'abtshieldId',
      params: {
        // Required: service ID obtained from abtshield.com.
        sid: 'pb.your-service-id'
      },
      storage: {
        type: 'html5',
        name: 'abtshield_id',
        expires: 1            // Refresh once a day
      }
    }]
  }
});
```

| Param      | Scope    | Type   | Description                                                                     | Default |
|------------|----------|--------|---------------------------------------------------------------------------------|---------|
| name       | required | string | Must be `abtshieldId`.                                                          | -       |
| params.sid | required | string | Service ID obtained from abtshield.com. Used to authenticate the integration and attribute traffic to the publisher. | - |
| storage    | required | object | Standard Prebid User ID storage block. `html5` or `cookie` are allowed.        | -       |

## Resulting EID

A successful resolution adds the following entry to `user.eids`:

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

The `ext.segments` field is omitted when ABTShield returns no `t` field.

## Network requirements

Requests to the MCR endpoint are sent with credentials (cookies) using `withCredentials: true`. The ABTShield server must respond with `Access-Control-Allow-Credentials: true` and a specific (non-wildcard) `Access-Control-Allow-Origin` header. If these response headers are absent, the browser will silently block the response and the module will not resolve an ID.

Publisher pages that set a `Referrer-Policy: no-referrer` header (or equivalent meta tag) will suppress the `Referer` header on outbound requests. Because ABTShield's MCR endpoint uses the `Referer` header to validate the requesting domain against the allowlist configured for your `sid`, a missing referrer will cause the server to reject the request regardless of whether the `sid` itself is correct.
