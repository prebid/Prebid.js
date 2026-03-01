# Overview

**Module Name:** Paywalls RTD Provider

**Module Type:** RTD Provider

**Maintainer:** [engineering@paywalls.net](mailto:engineering@paywalls.net)

## Description

The Paywalls RTD module integrates [VAI (Validated Actor Inventory)](https://paywalls.net/docs/publishers/vai) into Prebid.js. VAI classifies page impressions by **actor type** (`vat`) and **confidence tier** (`act`), producing a cryptographically signed assertion that SSPs can independently verify.

The module automates VAI loading, timing, and signal injection:

- **ORTB2 enrichment** — VAI signals are split across `site.ext.vai` (domain provenance) and `user.ext.vai` (actor classification), available to all ORTB2-native bid adapters.
- **GAM targeting** — `vai_vat` and `vai_act` key-value pairs are set per ad unit for Google Ad Manager line item targeting.
- **Graceful degradation** — if VAI is unavailable or times out, the auction proceeds normally without enrichment.

## Build Instructions

Compile the Paywalls RTD module into your Prebid build:

```sh
gulp build --modules=rtdModule,paywallsRtdProvider
```

> The global RTD module (`rtdModule`) is a prerequisite.

## Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500,
    dataProviders: [
      {
        name: 'paywalls',
        waitForIt: true,
        params: {
          scriptUrl: '/pw/vai.js'
        }
      }
    ]
  }
});
```

### Parameters

| Name                | Type      | Scope    | Description                                            | Default          |
|---------------------|-----------|----------|--------------------------------------------------------|------------------|
| `name`              | `String`  | Required | Must be `'paywalls'`                                   | —                |
| `waitForIt`         | `Boolean` | Optional | Should be `true` when `auctionDelay` is set            | `false`          |
| `params`            | `Object`  | Optional | Provider configuration                                 | `{}`             |
| `params.scriptUrl`  | `String`  | Optional | URL of the VAI loader script                           | `'/pw/vai.js'`   |
| `params.waitForIt`  | `Number`  | Optional | Max ms to wait for VAI before releasing the auction (distinct from the Boolean `waitForIt` above)    | `100`            |

### Hosting Modes

VAI supports two hosting modes for the loader script:

- **Publisher-hosted** (preferred): The script is served from the publisher's own domain via a CDN or server integration. Use the default relative path `'/pw/vai.js'`. This keeps requests same-origin, avoids CORS, and ensures the assertion's `dom` claim matches the inventory domain.
- **Paywalls-hosted**: The script is served from `https://paywalls.net/pw/vai.js`. Set `scriptUrl` to the full URL. This mode requires paywalls.net configuration before usage. **Note** The domain provenance claim (`dom`) will reflect `paywalls.net` rather than the inventory domain, which may affect SSP verification and buyer trust.

In both cases, `vai.js` makes a request to fetch `vai.json`, which contains the signed assertion. The publisher-hosted mode is same-origin; the Paywalls-hosted mode is cross-origin (CORS).

## ORTB2 Output

VAI signals are placed in the global ORTB2 within the `site` and `user` sections:

### `site.ext.vai` — Domain Provenance

Fields that describe the assertion context (who issued it, for which domain):

```json
{
  "site": {
    "ext": {
      "vai": {
        "iss": "https://paywalls.net",
        "aud": "vai",
        "dom": "example.com",
        "kid": "2026-02-a1b2c3",
        "assertion_jws": "eyJhbGciOiJFZERTQSIs..."
      }
    }
  }
}
```

| Field           | Description                                      |
|-----------------|--------------------------------------------------|
| `iss`           | Issuer — always `https://paywalls.net`           |
| `aud`           | Audience — always `vai`                          |
| `dom`           | Domain the assertion covers                      |
| `kid`           | Key ID for JWS verification via JWKS endpoint    |
| `assertion_jws` | Full JWS (compact serialization) for SSP and DSP verification |

### `user.ext.vai` — Actor Classification

Fields that describe the classified actor:

```json
{
  "user": {
    "ext": {
      "vai": {
        "vat": "HUMAN",
        "act": "ACT-1"
      }
    }
  }
}
```

| Field | Description                                                  |
|-------|--------------------------------------------------------------|
| `vat` | Validated Actor Type — one of `HUMAN`, `AI_AGENT`, `SHARING`, `OTHER` |
| `act` | Actor Confidence Tier — one of `ACT-1`, `ACT-2`, `ACT-3`   |

## GAM Targeting

The module sets key-value pairs on every ad unit for Google Ad Manager targeting:

| Key       | Example Value | Description         |
|-----------|---------------|---------------------|
| `vai_vat` | `HUMAN`       | Actor type          |
| `vai_act` | `ACT-1`       | Confidence tier     |

These are available via `pbjs.getAdserverTargeting()` and are compatible with standard GPT integration.

## Activity Controls

Publishers can restrict which activities the Paywalls module is allowed to perform. The module uses `loadExternalScript` to inject `vai.js`, which is gated by the `loadExternalScript` activity. If your activity configuration denies this by default, explicitly allow it for the `paywalls` component:

```javascript
pbjs.setConfig({
  allowActivities: {
    loadExternalScript: {
      default: false,
      rules: [
        {
          condition: function (params) {
            return params.componentName === 'paywalls';
          },
          allow: true
        }
      ]
    }
  }
});
```

## Privacy

- **No user identifiers**: VAI does not collect, store, or transmit user IDs, cookies, or fingerprints.
- **No PII**: The classification is based on aggregate session-level behavioral signals, not personal data.
- **Browser-side only**: All signal extraction runs in the browser; no data leaves the page except the classification result.
- **Signed assertions**: SSPs can independently verify the `assertion_jws` via the JWKS endpoint pulled from the JWS header (typically `https://example.com/pw/jwks.json`), ensuring the classification has not been tampered with.

## How It Works

1. **`init()`** — Checks `window.__PW_VAI__` and `localStorage` (key: `__pw_vai__`) for an existing VAI payload. If present and unexpired (`exp` > now), caches it for immediate use.
2. **`getBidRequestData()`** — If cached VAI exists, merges ORTB2 and calls back immediately (fast path). Otherwise, injects `vai.js` via `loadExternalScript`, sets up `window.__PW_VAI_HOOK__` as a callback for the script to deliver the payload, and polls `window.__PW_VAI__` until `waitForIt` ms elapse (slow path). On timeout, calls back without enrichment.
3. **`getTargetingData()`** — Returns `{ vai_vat, vai_act }` for each ad unit from the current VAI payload.

## Testing

Run unit tests:

```sh
gulp test --nolint --file test/spec/modules/paywallsRtdProvider_spec.js
```

Run the integration test page:

```sh
gulp serve-fast --modules=rtdModule,paywallsRtdProvider,appnexusBidAdapter
# Open http://localhost:9999/integrationExamples/gpt/paywallsRtdProvider_example.html
# Append ?real to test with real VAI (requires cloud-api on :8080)
# Append ?degrade to test graceful degradation
```

## Links

- [VAI Documentation](https://paywalls.net/docs/publishers/vai)
- [Prebid RTD Module Documentation](https://docs.prebid.org/dev-docs/add-rtd-submodule.html)
- [How Bid Adapters Should Read First Party Data](https://docs.prebid.org/features/firstPartyData.html#how-bid-adapters-should-read-first-party-data)
