# LocID User ID Submodule

## Overview

The LocID User ID submodule retrieves a LocID from a configured first-party endpoint, honors applicable privacy framework processing restrictions when present, persists the identifier using Prebid's storage framework, and exposes the ID to bidders via the standard EIDs interface.

LocID is a geospatial identifier provided by Digital Envoy. The endpoint is a publisher-controlled, first-party or on-premises service operated by the publisher, GrowthCode, or Digital Envoy. The endpoint derives location information server-side. The browser module does not transmit IP addresses.

## Configuration

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        endpoint: 'https://id.example.com/locid',
        ipEndpoint: 'https://id.example.com/ip'  // optional: lightweight IP-only check
      },
      storage: {
        type: 'html5',
        name: '_locid',
        expires: 7
      }
    }]
  }
});
```

## Parameters

| Parameter               | Type    | Required | Default                 | Description                                                                   |
| ----------------------- | ------- | -------- | ----------------------- | ----------------------------------------------------------------------------- |
| `endpoint`              | String  | Yes      | –                       | First-party LocID endpoint (see Endpoint Requirements below)                  |
| `ipEndpoint`            | String  | No       | –                       | Separate endpoint returning the connection IP (see IP Change Detection below) |
| `ipCacheTtlMs`          | Number  | No       | `14400000` (4h)         | TTL for the IP cache entry in milliseconds                                    |
| `ipCacheName`           | String  | No       | `{storage.name}_ip`     | localStorage key for the IP cache (auto-derived if not set)                   |
| `altId`                 | String  | No       | –                       | Alternative identifier appended as `?alt_id=` query param                     |
| `timeoutMs`             | Number  | No       | `800`                   | Request timeout in milliseconds                                               |
| `withCredentials`       | Boolean | No       | `false`                 | Whether to include credentials on the request                                 |
| `apiKey`                | String  | No       | –                       | API key sent as `x-api-key` header on `endpoint` and `ipEndpoint` requests    |
| `requirePrivacySignals` | Boolean | No       | `false`                 | If `true`, requires privacy signals to be present                             |
| `privacyMode`           | String  | No       | `'allowWithoutSignals'` | `'allowWithoutSignals'` or `'requireSignals'`                                 |

**Note on privacy configuration:** `privacyMode` is the preferred high-level setting for new integrations. `requirePrivacySignals` exists for backwards compatibility with integrators who prefer a simple boolean. If `requirePrivacySignals: true` is set, it takes precedence.

### Endpoint Requirements

The `endpoint` parameter must point to a **first-party proxy** or **on-premises service**—not the raw LocID Encrypt API directly.

The LocID Encrypt API (`GET /encrypt?ip=<IP>&alt_id=<ALT_ID>`) requires the client IP address as a parameter. Since browsers cannot reliably determine their own public IP, a server-side proxy is required to:

1. Receive the request from the browser
2. Extract the client IP from the incoming connection
3. Forward the request to the LocID Encrypt API with the IP injected
4. Return the response with `tx_cloc` and `connection_ip` to the browser (any `stable_cloc` is ignored client-side)

This architecture ensures the browser never transmits IP addresses and the LocID service receives accurate location data.

If you configure `altId`, the module appends it as `?alt_id=<value>` to the endpoint URL. Your proxy can then forward this to the LocID API.

### CORS Configuration

If your endpoint is on a different origin or you set `withCredentials: true`, ensure your server returns appropriate CORS headers:

```http
Access-Control-Allow-Origin: <your-origin>
Access-Control-Allow-Credentials: true
```

When using `withCredentials`, the server cannot use `Access-Control-Allow-Origin: *`; it must specify the exact origin.

### Storage Configuration

| Parameter | Required | Description      |
| --------- | -------- | ---------------- |
| `type`    | Yes      | `'html5'`        |
| `name`    | Yes      | Storage key name |
| `expires` | No       | TTL in days      |

### Stored Value Format

The module stores a structured object (rather than a raw string) so it can track IP-aware metadata:

```json
{
  "id": "<tx_cloc>",
  "connectionIp": "203.0.113.42",
  "createdAt": 1738147200000,
  "updatedAt": 1738147200000,
  "expiresAt": 1738752000000
}
```

When the endpoint returns a valid `connection_ip` but no usable `tx_cloc` (`null`, missing, empty, or whitespace-only), `id` is stored as `null`. This caches the "no location for this IP" result for the full cache period without re-fetching. The `decode()` function returns `undefined` for `null` IDs, so no EID is emitted in bid requests.

**Important:** String-only stored values are treated as invalid and are not emitted.

### IP Cache Format

The module maintains a separate IP cache entry in localStorage (default key: `{storage.name}_ip`) with a shorter TTL (default 4 hours):

```json
{
  "ip": "203.0.113.42",
  "fetchedAt": 1738147200000,
  "expiresAt": 1738161600000
}
```

This entry is managed by the module directly via Prebid's `storageManager` and is independent of the framework-managed tx_cloc cache.

## Operation Flow

The module uses a two-tier cache: an IP cache (default 4-hour TTL) and a tx_cloc cache (TTL defined by `storage.expires`). The IP is refreshed more frequently to detect network changes while keeping tx_cloc stable for its full cache period.

1. The module checks the IP cache for a current connection IP.
2. If the IP cache is valid, the module compares it against the stored tx_cloc entry's `connectionIp`.
3. If the IPs match and the tx_cloc entry is not expired, the cached tx_cloc is reused (even if `null`).
4. If the IP cache is expired or missing and `ipEndpoint` is configured, the module calls `ipEndpoint` to get the current IP, then compares with the stored tx_cloc. If the IPs match, the tx_cloc is reused without calling the main endpoint.
5. If the IPs differ, or the tx_cloc is expired/missing, or `ipEndpoint` is not configured, the module calls the main endpoint to get a fresh tx_cloc and connection IP.
6. The endpoint response may include a `null`, empty, whitespace-only, or missing `tx_cloc` (indicating no location for this IP). This is cached as `id: null` for the full cache period, and overrides any previously stored non-null ID for that same IP.
7. Both the IP cache and tx_cloc cache are updated after each endpoint call.
8. The ID is included in bid requests via the EIDs array. Entries with `null` tx_cloc are omitted from bid requests.

## Endpoint Response Requirements

The proxy must return:

```json
{
  "tx_cloc": "<transactional locid>",
  "connection_ip": "203.0.113.42"
}
```

Notes:

- `connection_ip` is always required. If missing, the entire response is treated as a failure.
- `tx_cloc` may be `null`, missing, empty, or whitespace-only when no location is available for the IP. This is a valid response and will be cached as `id: null` for the configured cache period.
- `tx_cloc` is the only value the browser module will store/transmit.
- `stable_cloc` may exist in proxy responses for server-side caching, but the client ignores it.

## IP Change Detection

The module uses a two-tier cache to detect IP changes without churning the tx_cloc identifier:

- **IP cache** (default 4-hour TTL): Tracks the current connection IP. Stored in a separate localStorage key (`{storage.name}_ip`).
- **tx_cloc cache** (`storage.expires`): Stores the LocID. Managed by Prebid's userId framework.

When the IP cache expires, the module refreshes the IP. If the IP is unchanged and the tx_cloc cache is still valid, the existing tx_cloc is reused without calling the main endpoint.

### ipEndpoint (optional)

When `ipEndpoint` is configured, the module calls it for lightweight IP-only checks. This avoids a full tx_cloc API call when only the IP needs refreshing. The endpoint should return the connection IP in one of these formats:

- JSON: `{"ip": "203.0.113.42"}` or `{"connection_ip": "203.0.113.42"}`
- Plain text: `203.0.113.42`

If `apiKey` is configured, the `x-api-key` header is included on `ipEndpoint` requests using the same `customHeaders` mechanism as the main endpoint.

When `ipEndpoint` is not configured, the module falls back to calling the main endpoint to refresh the IP, but only updates the stored tx_cloc when the IP has changed or the tx_cloc cache has expired. In this mode, IP changes are only detected when the IP cache is refreshed (for example when it expires and `extendId()` returns a refresh callback); there is no separate lightweight proactive IP probe.

### Prebid Refresh Triggers

When `storage.refreshInSeconds` is set, the module will reuse the cached ID until `createdAt + refreshInSeconds`; once due (or if `createdAt` is missing), `extendId()` returns `undefined` to indicate the cached ID should not be reused. The `extendId()` method also checks the IP cache: if the IP cache is expired or missing, or if the cached IP differs from the stored tx_cloc's IP, it returns a callback that refreshes via the main endpoint. This enforces the IP cache TTL (`ipCacheTtlMs`) even when the tx_cloc cache has not expired.

## Consent Handling

LocID operates under Legitimate Interest (LI). By default, the module proceeds when no privacy framework signals are present. When privacy signals exist, they are enforced. Privacy frameworks can only stop LocID via global processing restrictions; they do not enable it.
For TCF integration, the module declares Prebid's vendorless GVL marker so purpose-level enforcement applies without vendor-ID checks.

### Legal Basis and IP-Based Identifiers

LocID is derived from IP-based geolocation. Because IP addresses are transient and shared, there is no meaningful IP-level choice to express. Privacy frameworks are only consulted to honor rare, publisher- or regulator-level instructions to stop all processing. When such a global processing restriction is signaled, LocID respects it by returning `undefined`.

### Default Behavior (allowWithoutSignals)

- **No privacy signals present**: Module proceeds and fetches the ID
- **Privacy signals present**: Enforcement rules apply (see below)

### Strict Mode (requireSignals)

Set `requirePrivacySignals: true` or `privacyMode: 'requireSignals'` to require privacy signals:

```javascript
params: {
  endpoint: 'https://id.example.com/locid',
  requirePrivacySignals: true
}
```

In strict mode, the module returns `undefined` if no privacy signals are present.

### Privacy Signal Enforcement

When privacy signals **are** present, the module does not fetch or return an ID if any of the following apply:

- GDPR applies and vendorData is present, but consentString is missing or empty
- The US Privacy string indicates a global processing restriction (third character is 'Y')
- GPP signals indicate an applicable processing restriction

When GDPR applies and `consentString` is present, the module proceeds unless a framework processing restriction is signaled.

### Privacy Signals Detection

The module considers privacy signals "present" if any of the following exist:

- `consentString` (TCF consent string from CMP)
- `vendorData` (TCF vendor data from CMP)
- `usp` or `uspConsent` (US Privacy string)
- `gpp` or `gppConsent` (GPP consent data)
- Data from `uspDataHandler` or `gppDataHandler`

**Important:** `gdprApplies` alone does NOT constitute a privacy signal. A publisher may indicate GDPR jurisdiction without having a CMP installed. TCF framework data is only required when actual CMP artifacts (`consentString` or `vendorData`) are present. This supports Legitimate Interest-based operation in deployments without a full TCF implementation.

## EID Output

When available, the LocID is exposed as:

```javascript
{
  source: "locid.com",
  uids: [{
    id: "<locid-value>",
    atype: 1 // AdCOM AgentTypeWeb
  }]
}
```

## Identifier Type

- **`atype: 1`** — The AdCOM agent type for web (`AgentTypeWeb`). This is used in EID emission.

`atype` is an OpenRTB agent type (environment), not an IAB GVL vendor ID.

## Debugging

```javascript
pbjs.getUserIds().locId
pbjs.refreshUserIds()
localStorage.getItem('_locid')
localStorage.getItem('_locid_ip')  // IP cache entry
```

## Validation Checklist

- [ ] EID is present in bid requests when no processing restriction is signaled
- [ ] No network request occurs when a global processing restriction is signaled
- [ ] Stored IDs are reused across page loads
