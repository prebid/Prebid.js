# Overview

    Module Name: Encypher RTD Provider
    Module Type: RTD Provider
    Maintainer: engineering@encypher.com

The Encypher RTD module gives buyers a verified provenance reference inside the existing OpenRTB auction. The publisher adds one data-provider entry to Prebid. The module performs a credentialless lookup for the canonical page at the fixed origin `https://signals.encypher.com`, validates a returned ES256 attestation against Encypher's pinned issuer and public JWKS, and injects the record per impression at `imp.ext.c2pa`.

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
        timeout: 300,
        telemetry: true
      }
    }]
  }
});
```

| Parameter | Default | Purpose |
| --- | --- | --- |
| `timeout` | `300` | Provider deadline in milliseconds for WebCrypto hashing plus signal and JWKS reads. The effective budget is the smaller of this value and the RTD core `auctionDelay`. A provider with no RTD delay budget does not start asynchronous work. |
| `telemetry` | unset | Set to `true` to emit diagnostic-only delivery events after the auction callback. |
| `adoptionReporting` | `true` | Enables privacy-minimized, domain-level adoption reporting on the existing signal lookup. Set to `false` to stop future adoption observations without changing auction behavior. |

The signal origin is not configurable. Lookups and telemetry use exactly `https://signals.encypher.com`.

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

## Validation, freshness, and fail-open behavior

Every HTTP 200 signal response must be an exact JSON object with `v`, `status`, `dataset_version`, and `record`. Status is one of `ready`, `miss`, `revoked`, or `stale`. A `ready` response carries exactly the compact `v`, `id`, `ref`, and `att` fields. Every other status carries `record: null`. The signal and JWKS requests use `cache: 'no-store'`, omitted credentials, no referrer, and rejected redirects. The module rejects a missing response body, more than 4 KiB of decoded signal JSON, more than 64 KiB of decoded JWKS JSON, and malformed UTF-8.

Deploy the edge's exact JSON and `Cache-Control: no-store` response contract before deploying this browser cutover.

Before injection, the module also requires:

- A valid ES256 signature from the selected `kid` in the pinned JWKS at `https://api.encypher.com/api/v1/public/provenance/jwks.json`.
- Exact canonical claim fields plus the pinned `https://api.encypher.com` issuer, canonical URL digest, publisher domain, record ID, validation result, declaration, policy version, signed revision, and lifetime bindings.
- Exact equality between `ref` and `https://api.encypher.com/api/v1/public/provenance/attestations/{signed sub}`.
- A serialized extension no larger than 1 KiB.

Page-lifetime state rejects response reordering. Non-ready decisions advance a dataset floor when received. `stale` also advances a global stale barrier. `miss` and `revoked` block the affected URL hash and supersede an equal or older ready decision. A ready decision changes state only after signature verification returns its signed record revision. At commit time the module rechecks the dataset floor, stale barrier, per-hash blocker, highest verified revision, and byte-identical equality for equal dataset and revision. Invalid high-version ready responses change no state. Lower blockers cannot evict newer ready decisions.

A ready edge status may be reused for at most 30 seconds, but its JWS is verified before each injection. JWKS entries expire after 60 seconds. Blocking decisions and monotonic watermarks remain for the page lifetime.

The module invokes the callback exactly once within the configured total deadline. HTTP errors, malformed decisions, invalid keys or signatures, substituted references, expired attestations, oversized bodies, network failures, and timeouts leave the auction unchanged.

On a verified hit, the module replaces the auction's ad-unit array with auction-local shallow copies. Each copied ad unit has fresh `ortb2Imp` and `ext` objects and a fresh four-field carrier. Publisher-supplied ad-unit objects, extension objects, and any existing `c2pa` value remain unchanged.

## Trust split and residual authority risk

The record JWS authenticates the carrier and its signed claims. The pinned `https://api.encypher.com` JWKS origin supplies the verification key. The exact `https://signals.encypher.com` origin is the online authority for the current `ready`, `miss`, `revoked`, or `stale` decision and dataset version.

The browser state machine protects against honest response reordering, HTTP-cache rollback, and concurrent-auction mutation. It does not provide a signed proof of current status. Compromise of `signals.encypher.com`, its Cloudflare account or route, or its TLS control plane can replay a still-unexpired issuer-signed record. Compromise of the pinned JWKS origin can substitute verification keys. These authority compromises are outside this browser protocol's protection.

## Diagnostic telemetry

When `telemetry` is `true`, the module sends a post-callback event to `https://signals.encypher.com/v1/telemetry/rtd` through Prebid's fetch wrapper with keepalive, omitted credentials, no referrer, no-store caching, and redirects rejected. The event contains only its protocol version, telemetry schema version, module version, outcome, impression count, optional dataset version, and duration. `impression_count` is the number of copied impressions only for `injected`; every non-injected outcome reports zero. The event contains no URL, URL digest, page content, record, attestation, identity, pricing, deal, cookie, credential, or user data. Telemetry failure cannot affect the auction.

## Publisher adoption reporting

Version 1.1.0 includes `module_version` in the existing signal lookup. When `adoptionReporting` is not `false`, the edge records an observation only if the browser `Origin` hostname exactly matches the requested publisher FQDN. It retains only that FQDN, first and last seen times, module version, aggregate lookup, hit, and miss counts, and the current provenance dataset version for up to 24 months after the last observation. It does not retain a page URL, URL digest, IP address, page content, user or cookie ID, bid, price, or creative. Reporting adds no browser request and no additional module fee. Setting `adoptionReporting: false` adds `adoption_reporting=0` to the lookup and stops future adoption observations.

These counts are operational observations of eligible same-origin lookups, not proof of installation, entitlement, or billable use.
