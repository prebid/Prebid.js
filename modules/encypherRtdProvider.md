# Overview

Module Name: Encypher RTD Provider
Module Type: Rtd Provider
Maintainer: engineering@encypher.com

The Encypher RTD provider adds a verified provenance reference to each OpenRTB impression. It performs a credentialless lookup for the canonical page, validates the returned ES256 attestation against Encypher's pinned issuer and public JWKS, and injects only the compact record at `ortb2Imp.ext.c2pa`.

# Integration

Build Prebid.js with the RTD core and this provider:

```bash
npx gulp build --modules=rtdModule,encypherRtdProvider
```

Add one `realTimeData.dataProviders` setting:

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'encypher',
      waitForIt: true
    }]
  }
});
```

With no `params`, the provider reads from `https://signals.encypher.com` and uses a 300 ms total deadline. `realTimeData.auctionDelay` must be at least as large as `params.timeout` so Prebid waits for the asynchronous lookup before releasing the auction. An approved mirror may set `params.signalBase` only to `https://signals.encypher.com` or an Encypher-controlled subdomain below `signals.encypher.com`; arbitrary hosts, credentials, query strings, fragments, and custom ports fail open without a request or telemetry. The mirror transports Encypher-issued records; it cannot replace the pinned `https://api.encypher.com` issuer, JWKS, or deterministic attestation reference. `params.timeout` changes the total lookup deadline in milliseconds. `params.telemetry: true` enables diagnostic telemetry; telemetry is disabled by default.

# Compact carrier

For every ad unit, the provider adds exactly these four fields at `ortb2Imp.ext.c2pa` while preserving all existing impression, GPID, supply-chain, and caller fields:

```json
{
  "v": 1,
  "id": "epa_01J...",
  "ref": "https://api.encypher.com/api/v1/public/provenance/attestations/epa_01J...",
  "att": "eyJhbGciOiJFUzI1NiIs..."
}
```

| Field | Type | Description |
| --- | --- | --- |
| `v` | integer | Protocol version, exactly `1`. |
| `id` | string | Stable provenance record identifier. |
| `ref` | HTTPS URL | Deterministic public attestation reference derived from, and signed as, the record ID. |
| `att` | compact JWS | ES256 attestation binding the record ID to the canonical URL digest, exact publisher domain, policy version, revision, validation result, declaration, and expiration. |

The serialized carrier is limited to 1 KiB. No page content, derived score, signing tier, compatibility payload, or global `site.ext.data.c2pa` value is emitted.

# Validation, caching, and fail-open behavior

Before injection, the provider requires:

- a strict v1 `ready` envelope for the SHA-256 canonical URL digest;
- exactly the `v`, `id`, `ref`, and `att` record fields;
- a canonical ES256 JWS with a single matching signing key from the pinned credentialless JWKS at `https://api.encypher.com/api/v1/public/provenance/jwks.json`;
- the pinned issuer, exact canonical URL digest and publisher domain, record ID, lifetime, policy version, revision, validation result, and declaration claims; and
- exact equality between `ref` and `https://api.encypher.com/api/v1/public/provenance/attestations/{signed sub}`.

Validated records and JWKS are cached only in page memory. A cached record is checked for expiration and its signature and claims are revalidated before every reuse. Record status is reused for at most 30 seconds; the next auction performs a fresh edge lookup so a new `stale` or `revoked` tombstone suppresses injection. Expired records are also refreshed from the edge instead of replayed. JWKS entries expire after 60 seconds; a key or signature mismatch evicts the cached JWKS and forces one refresh within the original deadline. Cache keys include the signal origin and canonical URL digest, so records cannot cross canonical URLs or configured signal origins.

The callback is invoked exactly once within the configured total deadline. HTTP 204, `stale`, `revoked`, missing records, timeout, network failure, malformed or non-canonical data, unknown versions or keys, invalid signatures or claims, substituted references, oversized carriers, and expired attestations all leave the auction unchanged. The provider never signs content, extracts page content, reads manifest meta tags, or uses localStorage.

# Diagnostic telemetry

Diagnostic telemetry is disabled by default. When `params.telemetry` is `true`, the provider sends a post-callback event to `{signalBase}/v1/telemetry/rtd`. The event contains only protocol version, telemetry schema version, module version, outcome, impression count, optional dataset version, and duration. It contains no URL, URL digest, page content, record, attestation, identity, pricing, deal, cookie, credential, or user data. Telemetry failure cannot affect or delay the auction callback.
