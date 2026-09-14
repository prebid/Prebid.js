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
        telemetry: true,
        gamTargeting: {
          includeAttestationId: true,
          packages: ['VPP-V1']
        }
      }
    }]
  }
});
```

| Parameter | Default | Purpose |
| --- | --- | --- |
| `timeout` | `300` | Provider deadline in milliseconds for WebCrypto hashing plus signal and JWKS reads. The effective budget is the smaller of this value and the RTD core `auctionDelay`. A provider with no RTD delay budget does not start asynchronous work. |
| `telemetry` | unset | Set to `true` to emit diagnostic-only delivery events after the auction callback. |
| `adoptionReporting` | `true` | Enables privacy-minimized, domain-level adoption reporting on consent-allowed signal lookups. Set to `false` to stop future adoption observations without changing auction behavior. |
| `gamTargeting` | `false` | Ad server key-values for GAM line items. Either `false` or an object with the optional `includeAttestationId` boolean and the optional `packages` string array. See Targeting Contract V1. |

The signal origin is not configurable. Lookups and telemetry use exactly `https://signals.encypher.com`.

## Targeting Contract V1: GAM key-values

With `gamTargeting` set to an object, the module implements the standard RTD `getTargetingData` hook, so Prebid's ad server targeting carries the result for each ad unit that reached a verified injection in that auction. The module makes no extra request and adds no auction delay.

| Key | Value | Emitted when |
| --- | --- | --- |
| `encypher_verified` | `"1"` | The ad unit received `ortb2Imp.ext.c2pa` in this auction. |
| `encypher_att` | attestation ID, the same value as `ortb2Imp.ext.c2pa.id` | `includeAttestationId` is `true` and the ID matches `[A-Za-z0-9_-]{1,32}`. |
| `encypher_pkg` | array of publisher package codes, copied verbatim from `packages` | `packages` is non-empty. |

Rules:

- Absence is the negative signal. A miss, stale, revoked, invalid, or timed-out outcome emits nothing, and neither does an auction that a consent gate suppressed.
- Targeting is per auction. A verified hit does not carry into the next auction for the same ad unit code.
- Each `packages` entry must match `[A-Za-z0-9_-]{1,32}`. The module never derives package codes from provenance evidence.
- A malformed `gamTargeting` value, an unknown key inside it, or a rejected package code logs one warning at `init` and leaves targeting off. Existing installs that omit the parameter see no behavior change.
- The serialized key-value payload is at most 256 bytes per ad unit. On overflow the module drops `encypher_pkg`, then `encypher_att`, then `encypher_verified`. Only `encypher_pkg` can reach the cap in practice: with `encypher_pkg` gone the payload is at most 75 bytes, because the attestation ID is limited to 32 characters.
- Keys are lowercase ASCII; values are ASCII. Package codes and attestation IDs may contain uppercase letters. No URL, digest, price, deal, or user value appears in targeting.

On a page that calls `requestBids` more than once, clear the keys on the ad server slot before each set. Prebid's `auctionManager.getAdUnits()` returns the ad units of every retained auction, and `targeting.getAdUnitTargeting` reads `adserverTargeting` from all of them, so a verified earlier auction keeps supplying `encypher_verified` for the same ad unit code after a later auction missed. The module cannot correct this from `getTargetingData`: it returns no entry for the missed ad unit, and an empty value would reach the ad server as a present key with an empty string rather than an absent key.

## GAM line-item setup

1. In Google Ad Manager, open Inventory, then Key-values, and create `encypher_verified` with the predefined value `1`. Create `encypher_att` as a freeform key only if you set `includeAttestationId`, and `encypher_pkg` with one predefined value per package code you configured.
2. Register the keys with Prebid's ad server targeting for the GPT call. With `pbjs.setTargetingForGPTAsync()` the keys are applied automatically. With manual GPT code, read `pbjs.getAdserverTargetingForAdUnitCode(code)` after the auction and pass the values to `googletag.pubads().setTargeting`.
3. Add `encypher_verified` is `1` to the line item's custom targeting. For a programmatic guaranteed or preferred deal, set the same custom targeting on the proposal line item; the key is ordinary GAM custom targeting and needs no buyer-side change.
4. For lift measurement, duplicate the line item with `encypher_verified` is none of `1` as the negative control, and keep every other setting identical.
5. Confirm delivery on a signed page and on an unsigned control page before raising the line item's priority. An unsigned page must show no `encypher_verified` value at all.

## `imp.ext.c2pa` data injected

The module adds one compact object to each impression and preserves all existing impression, GPID, and supply-chain fields.

```json
{
  "imp": [{
    "ext": {
      "c2pa": {
        "v": 1,
        "id": "epa_01J...",
        "ref": "https://api.encypher.com/api/v1/proof/bNv0YOZMqiDPmlW0hf0im_AkYKJ53GZxuJIsodyhMRg",
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
| `ref` | HTTPS URL | Content-addressed public evidence URL derived from the signed manifest SHA-256 digest. Its canonical 43-character unpadded base64url suffix encodes 32 bytes. |
| `att` | compact JWS | ES256 attestation binding the record ID to the URL digest, exact publisher domain, manifest digest, policy version, revision, and expiration. |

The measured limit is 1024 UTF-8 bytes of `JSON.stringify` over the four-field record itself, as returned by the signal origin, not over the surrounding `ext` object. A record one byte over the limit is classified invalid and injects nothing, so a minting service must check the compact record's own serialized size.

## Validation, freshness, and fail-open behavior

Every HTTP 200 signal response must be an exact JSON object with `v`, `status`, `dataset_version`, and `record`. Status is one of `ready`, `miss`, `revoked`, or `stale`. A `ready` response carries exactly the compact `v`, `id`, `ref`, and `att` fields. Every other status carries `record: null`. The signal and JWKS requests use `cache: 'no-store'`, omitted credentials, no referrer, and rejected redirects. The module rejects a missing response body, more than 4 KiB of decoded signal JSON, more than 64 KiB of decoded JWKS JSON, and malformed UTF-8.

Deploy the edge's exact JSON and `Cache-Control: no-store` response contract before deploying this browser cutover.

Before injection, the module also requires:

- A valid ES256 signature from the selected `kid` in the pinned JWKS at `https://api.encypher.com/api/v1/public/provenance/jwks.json`.
- Exact canonical claim fields plus the pinned `https://api.encypher.com` issuer, canonical URL digest, publisher domain, record ID, manifest digest, validation result, declaration, policy version, signed revision, and lifetime bindings.
- Exact equality between `ref` and `https://api.encypher.com/api/v1/proof/` followed by the signed `manifest_digest`, encoded as canonical unpadded base64url for 32 bytes, with no credentials, query, fragment, alternate encoding, or non-canonical path. The browser does not fetch the evidence.
- A serialized extension no larger than 1 KiB.

Page-lifetime state rejects response reordering. Non-ready decisions advance a dataset floor when received. `stale` also advances a global stale barrier. `miss` and `revoked` block the affected URL hash and supersede an equal or older ready decision. A ready decision changes state only after signature verification returns its signed record revision. At commit time the module rechecks the dataset floor, stale barrier, per-hash blocker, highest verified revision, and byte-identical equality for equal dataset and revision. Invalid high-version ready responses change no state. Lower blockers cannot evict newer ready decisions.

A ready edge status may be reused for at most 30 seconds, but its JWS is verified before each injection. JWKS entries expire after 30 seconds. Blocking decisions and monotonic watermarks remain for the page lifetime.

The module invokes the callback exactly once within the configured total deadline. HTTP errors, malformed decisions, invalid keys or signatures, substituted references, expired attestations, oversized bodies, network failures, and timeouts add no provenance data to the auction.

When configured, the module establishes auction-local shallow copies of the ad-unit, `ortb2Imp`, and impression `ext` objects before RTD providers start. Publisher-supplied objects and any existing publisher `c2pa` value remain unchanged. After a verified hit, the module adds a fresh four-field carrier in place on that stable auction graph. References captured by other RTD providers remain live, so their later asynchronous writes and Encypher's carrier both reach the auction.

Because of those copies, `pbjs.adUnits` never carries the record. Wrapper code that wants to read the carrier itself, instead of using `gamTargeting`, must read `adUnits[].ortb2Imp.ext.c2pa` from the `auctionEnd` payload, which keeps the same `ortb2Imp` reference the module wrote.

## Trust split and residual authority risk

The record JWS authenticates the carrier and its signed claims. The pinned `https://api.encypher.com` JWKS origin supplies the verification key. The exact `https://signals.encypher.com` origin is the online authority for the current `ready`, `miss`, `revoked`, or `stale` decision and dataset version.

The browser state machine protects against honest response reordering, HTTP-cache rollback, and concurrent-auction mutation. It does not provide a signed proof of current status. Compromise of `signals.encypher.com`, its Cloudflare account or route, or its TLS control plane can replay a still-unexpired issuer-signed record. Compromise of the pinned JWKS origin can substitute verification keys. These authority compromises are outside this browser protocol's protection.

The evidence URL is cryptographically bound to the signed manifest digest. Substituting another syntactically valid evidence URL without changing the signed attestation causes rejection. Evidence retrieval still depends on the proof endpoint's availability and access controls; the browser does not treat a valid signature as proof of current availability.

## Consent and data transmission

The provider skips all work when COPPA applies, the US Privacy string records a sale opt-out, or GDPR applicability is true or unresolved. Encypher has no registered GVL ID, so a consent string or another vendor's consent cannot authorize transmission to Encypher. When GDPR consent management is enabled but supplies no data, the provider also skips the lookup. Builds without consent modules can perform the lookup.

GPP consent is checked independently of the legacy US Privacy string. Applicable US national and state sections 7-12 block transmission on sale, sharing, targeted-advertising opt-outs, or GPC. Object and segmented section representations are supported. Unknown applicable sections, missing or malformed consent fields, and unresolved configured GPP consent fail closed. Only applicable sections are inspected; an exact `[-1]` applicable-section list means no GPP section applies. Other privacy gates still apply.

Blocked calls complete the RTD callback without URL hashing, signal or JWKS requests, cached-signal injection, diagnostics, or adoption reporting. A blocked auction also clears the ad server targeting memory for its ad units, so it emits no GAM key-value, and consent is checked again when targeting is requested. Ordinary auctions continue. Consent is checked again for every auction, including auctions that could otherwise reuse a cached signal.

Allowed lookup requests disclose the canonical URL digest, canonical publisher hostname, and module version to the fixed signal authority. They do not upload the raw URL, page content, manifest, cookies, bids, prices, deals, or creatives. Requests omit browser credentials and referrers. The URL digest is not an anonymization guarantee; canonical URLs can contain visitor-specific query values.

## Diagnostic telemetry

When consent permits transmission and `telemetry` is `true`, the module sends a post-callback event to `https://signals.encypher.com/v1/telemetry/rtd` through Prebid's fetch wrapper with keepalive, omitted credentials, no referrer, no-store caching, and redirects rejected. The event contains only its protocol version, telemetry schema version, module version, outcome, impression count, optional dataset version, and duration. `impression_count` is the number of impressions injected on the owned auction graph; every non-injected outcome reports zero. The event contains no URL, URL digest, page content, record, attestation, identity, pricing, deal, cookie, credential, or user data. Telemetry failure cannot affect the auction.

## Publisher adoption reporting

Version 1.1.0 includes `module_version` in the existing signal lookup. When `adoptionReporting` is not `false`, the edge records an observation only if the browser `Origin` hostname exactly matches the requested publisher FQDN. It retains only that FQDN, first and last seen times, module version, aggregate lookup, hit, and miss counts, and the current provenance dataset version for up to 24 months after the last observation. It does not retain a page URL, URL digest, IP address, page content, user or cookie ID, bid, price, or creative. Reporting adds no browser request and no additional module fee. Setting `adoptionReporting: false` adds `adoption_reporting=0` to the lookup and stops future adoption observations.

These counts are operational observations of eligible same-origin lookups, not proof of installation, entitlement, or billable use.
