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
        endpoint: 'https://id.example.com/locid'
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

| Parameter               | Type    | Required | Default                 | Description                                                  |
| ----------------------- | ------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `endpoint`              | String  | Yes      | –                       | First-party LocID endpoint (see Endpoint Requirements below) |
| `altId`                 | String  | No       | –                       | Alternative identifier appended as `?alt_id=` query param    |
| `timeoutMs`             | Number  | No       | `800`                   | Request timeout in milliseconds                              |
| `withCredentials`       | Boolean | No       | `false`                 | Whether to include credentials on the request                |
| `apiKey`                | String  | No       | –                       | API key passed via the `x-api-key` request header            |
| `requirePrivacySignals` | Boolean | No       | `false`                 | If `true`, requires privacy signals to be present            |
| `privacyMode`           | String  | No       | `'allowWithoutSignals'` | `'allowWithoutSignals'` or `'requireSignals'`                |

**Note on privacy configuration:** `privacyMode` is the preferred high-level setting for new integrations. `requirePrivacySignals` exists for backwards compatibility with integrators who prefer a simple boolean. If `requirePrivacySignals: true` is set, it takes precedence.

### Endpoint Requirements

The `endpoint` parameter must point to a **first-party proxy** or **on-premises service**—not the raw LocID Encrypt API directly.

The LocID Encrypt API (`GET /encrypt?ip=<IP>&alt_id=<ALT_ID>`) requires the client IP address as a parameter. Since browsers cannot reliably determine their own public IP, a server-side proxy is required to:

1. Receive the request from the browser
2. Extract the client IP from the incoming connection
3. Forward the request to the LocID Encrypt API with the IP injected
4. Return the response (`tx_cloc`, `stable_cloc`) to the browser

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

## Operation Flow

1. The module checks Prebid storage for an existing LocID.
2. If no valid ID is present, it issues a GET request to the configured endpoint.
3. The endpoint determines the user's location server-side and returns an encrypted LocID.
4. The module extracts `tx_cloc` from the response, falling back to `stable_cloc` if needed.
5. The ID is cached according to the configured storage settings.
6. The ID is included in bid requests via the EIDs array.

## Consent Handling

LocID operates under Legitimate Interest (LI). By default, the module proceeds when no privacy framework signals are present. When privacy signals exist, they are enforced. Privacy frameworks can only stop LocID via global processing restrictions; they do not enable it.

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
- GDPR applies and vendor permission is not granted for gvlid 3384 (when vendorData is available)
- The US Privacy string indicates a global processing restriction (third character is 'Y')
- GPP signals indicate an applicable processing restriction

When GDPR applies but `vendorData` is not available in the consent object, the module logs a warning and proceeds. This allows operation in environments where TCF vendor data is not yet parsed, but publishers should verify vendor permissions are being enforced upstream.

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
    atype: 1
  }]
}
```

## Identifier Type vs Vendor ID

This module uses two numeric identifiers:

- **`gvlid: 3384`** — The IAB TCF Global Vendor List ID for Digital Envoy. This identifies the vendor for consent purposes under the Transparency and Consent Framework.
- **`atype: 1`** — The OpenRTB Extended Identifiers (EID) `atype` field indicating a device-based identifier per OpenRTB 2.6.

## Debugging

```javascript
pbjs.getUserIds().locId
pbjs.refreshUserIds()
localStorage.getItem('_locid')
```

## Validation Checklist

- [ ] EID is present in bid requests when no processing restriction is signaled
- [ ] No network request occurs when a global processing restriction is signaled
- [ ] Stored IDs are reused across page loads
