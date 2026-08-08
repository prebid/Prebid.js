# Overview


The Encypher RTD module gives buyers a verified provenance reference inside the existing OpenRTB auction. The publisher adds one data-provider entry to Prebid. The module performs a credentialless read for the canonical page, validates the returned ES256 attestation against Encypher's pinned issuer and public JWKS, and injects the record per impression at `imp.ext.c2pa`.

# Part 1: Free Bidstream Signal (This Module)

## Description

This module emits only the canonical v1 compact provenance record. It does not emit derived scores or compatibility payloads.

## Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'encypher',
      waitForIt: true,
      params: {
        signalBase: 'https://signals.encypher.com',
        timeout: 300,
        telemetry: true
      }
    }]
  }
});
```

| Parameter | Default | Purpose |
| --- | --- | --- |
| `signalBase` | `https://signals.encypher.com` | HTTPS origin serving v1 attestation records. Only the exact default or an approved Encypher-controlled subdomain below `signals.encypher.com` is accepted; arbitrary hosts, lookalikes, credentials, query strings, fragments, and custom ports fail open before lookup or telemetry. A mirror transports Encypher-issued records but cannot choose the deterministic reference, issuer, or trust keys. |
| `timeout` | `300` | Total lookup deadline in milliseconds across attestation and JWKS reads. |
| `telemetry` | unset | Set to `true` to emit diagnostic-only delivery events after the auction callback. |
| `adoptionReporting` | `true` | Enables privacy-minimized, domain-level adoption reporting on the existing attestation lookup. Set to `false` to stop future adoption observations without changing auction behavior. |

## `imp.ext.c2pa` data injected

The module adds one compact object to each impression and preserves all existing impression, GPID, and supply-chain fields.

```json
{
  "imp": [{
    "ext": {
      "c2pa": {
        "v": 1,
        "id": "epa_01J...",
        "ref": "https://api.encypher.com/api/v1/public/provenance/attestations/epa_01J...",
        "att": "eyJhbGciOiJFUzI1NiIs..."
      }
    }
  }]
}
```

| Field | Type | Description |
| --- | --- | --- |
| `v` | integer | Protocol version. Must be 1. |
| `id` | string | Stable provenance record ID. |
| `ref` | HTTPS URL | Deterministic public attestation resource derived from the signed record ID. |
| `att` | compact JWS | ES256 attestation binding the record ID to the URL digest, exact publisher domain, policy version, revision, and expiration. |

The serialized extension is limited to 1 KiB.

## Data Injected

The canonical v1 payload contains exactly these fields at `imp.ext.c2pa`:

| Field | Type | Description |
|---|---|---|
| `v` | number | Compact protocol version, exactly `1`. |
| `id` | string | Stable provenance record identifier. |
| `ref` | string | Deterministic HTTPS public attestation reference bound to `id` by signed `sub`. |
| `att` | string | Compact ES256 JWS. |

## Validation and fail-open behavior

Before injection, the module requires:

- A v1 `ready` edge response for the SHA-256 canonical URL digest.
- Exactly the compact `v`, `id`, `ref`, and `att` record fields.
- A valid ES256 signature from the selected `kid` in the pinned credentialless JWKS at `https://api.encypher.com/api/v1/public/provenance/jwks.json`.
- Exact canonical claim fields plus the pinned `https://api.encypher.com` issuer, canonical URL digest, publisher domain, record ID, validation result, declaration, policy version, revision, and lifetime bindings.
- Exact equality between `ref` and `https://api.encypher.com/api/v1/public/provenance/attestations/{signed sub}`.
- A serialized extension no larger than 1 KiB.

The module invokes the callback exactly once within the configured total deadline. HTTP 204, `stale`, `revoked`, timeout, network error, malformed data, unknown version, invalid key, invalid signature, substituted reference, or expired attestation leaves the auction unchanged. Validated records and JWKS are retained only in page memory and never cross canonical URLs. A ready record's edge status is reused for at most 30 seconds; its JWS and lifetime are revalidated before reuse, and the next auction refreshes edge status at the TTL boundary. JWKS entries expire after 60 seconds and refresh immediately on a key or signature mismatch.

## Diagnostic telemetry

When `telemetry` is `true`, the module sends a post-callback event to `{signalBase}/v1/telemetry/rtd`. The event contains only its protocol version, telemetry schema version, module version, outcome, impression count, optional dataset version, and duration. It contains no URL, URL digest, page content, record, attestation, identity, pricing, deal, cookie, credential, or user data. Telemetry failure cannot affect the auction.

## Publisher adoption reporting

Version 1.1.0 includes `module_version` in the existing attestation lookup. When `adoptionReporting` is not `false`, the edge records an observation only if the browser `Origin` hostname exactly matches the requested publisher FQDN. It retains only that FQDN, first and last seen times, module version, aggregate lookup/hit/miss counts, and the current provenance dataset version for up to 24 months after the last observation. It does not retain a page URL, URL digest, IP address, page content, user or cookie ID, bid, price, or creative. Reporting adds no browser request and no additional module fee. Setting `adoptionReporting: false` adds `adoption_reporting=0` to the lookup and stops future adoption observations.
These counts are operational observations of eligible same-origin lookups, not proof of installation, entitlement, or billable use.
