---
layout: userid
title: LocID
description: LocID User ID sub-module
useridmodule: locIdSystem
bidRequestUserId: locId
eidsource: locid.com
example: '"SYybozbTuRaZkgGqCD7L7EE0FncoNUcx-om4xTfhJt36TFIAES2tF1qPH"'
gvlid: 3384
---

## Overview

LocID is a geospatial identifier provided by Digital Envoy. The LocID User ID submodule retrieves a LocID from a publisher-controlled first-party endpoint, respects applicable privacy framework restrictions, and exposes the identifier to bidders via the standard EIDs interface.

The endpoint is a first-party or on-premises service operated by the publisher, GrowthCode, or Digital Envoy. The module does not transmit IP addresses from the browser; instead, the server-side endpoint derives location information.

## Registration

No registration is required to use this module. Publishers must configure a first-party endpoint that proxies requests to the LocID encryption service.

## Installation

Build Prebid.js with the LocID module:

```bash
gulp build --modules=locIdSystem,userId
```

## Configuration

### Default Mode

By default, the module proceeds when no privacy framework signals are present (LI-based operation):

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

### Strict Mode

To require privacy framework signals before proceeding, set `privacyMode: 'requireSignals'`:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        endpoint: 'https://id.example.com/locid',
        privacyMode: 'requireSignals'
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

### Configuration with API Key and Alternative ID

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'locId',
      params: {
        endpoint: 'https://id.example.com/locid',
        apiKey: 'your-api-key',
        altId: 'publisher-user-id',
        timeoutMs: 1000,
        withCredentials: true
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

{: .table .table-bordered .table-striped }
| Param | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | Module identifier. Must be `"locId"`. | `"locId"` |
| params | Required | Object | Configuration parameters. | |
| params.endpoint | Required | String | First-party LocID endpoint URL. See Endpoint Requirements below. | `"https://id.example.com/locid"` |
| params.altId | Optional | String | Alternative identifier appended as `?alt_id=` query parameter. | `"user123"` |
| params.timeoutMs | Optional | Number | Request timeout in milliseconds. | `800` (default) |
| params.withCredentials | Optional | Boolean | Include credentials (cookies) on the request. | `false` (default) |
| params.apiKey | Optional | String | API key passed via the `x-api-key` request header. | `"your-api-key"` |
| params.privacyMode | Optional | String | Privacy mode: `"allowWithoutSignals"` (default) or `"requireSignals"`. | `"allowWithoutSignals"` |
| params.requirePrivacySignals | Optional | Boolean | If `true`, requires privacy signals to be present. Equivalent to `privacyMode: 'requireSignals'`. | `false` (default) |
| storage | Required | Object | Storage configuration for caching the ID. | |
| storage.type | Required | String | Storage type. Use `"html5"` for localStorage. | `"html5"` |
| storage.name | Required | String | Storage key name. | `"_locid"` |
| storage.expires | Optional | Number | TTL in days. | `7` |

## Endpoint Requirements

The `endpoint` parameter must point to a first-party proxy or on-premises service, not the LocID Encrypt API directly.

The LocID Encrypt API requires the client IP address as a parameter. Since browsers cannot determine their own public IP, a server-side proxy is required to:

1. Receive the request from the browser
2. Extract the client IP from the incoming connection
3. Forward the request to the LocID Encrypt API with the IP injected
4. Return the response (`tx_cloc`, `stable_cloc`) to the browser

If `altId` is configured, the module appends it as `?alt_id=<value>` to the endpoint URL.

## Privacy Handling

LocID operates under Legitimate Interest (GVLID 3384). The module's privacy behavior depends on the configured privacy mode.

### Default Behavior (allowWithoutSignals)

- **No privacy signals present**: Module proceeds and fetches the ID
- **Privacy signals present**: Enforcement rules apply

### Strict Mode (requireSignals)

- **No privacy signals present**: Module returns `undefined`
- **Privacy signals present**: Enforcement rules apply

### Privacy Signal Enforcement

When privacy signals are present, the module does not fetch or return an ID if any of the following apply:

- GDPR applies and vendor permission (GVLID 3384) is denied
- US Privacy (CCPA) string indicates a processing restriction (third character is `Y`)
- GPP signals indicate an applicable processing restriction

The module checks for vendor consent or legitimate interest for GVLID 3384 when GDPR applies and vendor data is available.

## Storage

The module caches the LocID using Prebid's standard storage framework. Configure storage settings via the `storage` object.

The endpoint response contains two ID types:
- `tx_cloc`: Transactional LocID (primary)
- `stable_cloc`: Stable LocID (fallback)

The module uses `tx_cloc` when available, falling back to `stable_cloc` if needed.

## EID Output

When available, the LocID is included in the bid request as:

```json
{
  "source": "locid.com",
  "uids": [{
    "id": "SYybozbTuRaZkgGqCD7L7EE0FncoNUcx-om4xTfhJt36TFIAES2tF1qPH",
    "atype": 3384
  }]
}
```

The `atype` value of `3384` is required for demand partner recognition of LocID. This vendor-specific atype value follows the OpenRTB 2.6 Extended Identifiers specification.

## Debugging

```javascript
// Check if LocID is available
pbjs.getUserIds().locId

// Force refresh
pbjs.refreshUserIds()

// Check stored value
localStorage.getItem('_locid')
```
