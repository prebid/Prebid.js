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
| `timeout` | `300` | Provider deadline in milliseconds for WebCrypto, signal and JWKS reads, bounded measurement, hashing, and encryption. The effective budget is the smaller of this value and the RTD core `auctionDelay`. A provider with no RTD delay budget does not start asynchronous work. |
| `telemetry` | unset | Set to `true` to emit diagnostic-only delivery events after the auction callback. |
| `adoptionReporting` | `true` | Enables privacy-minimized, domain-level adoption reporting on consent-allowed signal lookups. Set to `false` to stop future adoption observations without changing auction behavior. |
| `gamTargeting` | `false` | Ad server key-values for GAM line items. Either `false` or an object with the optional `includeAttestationId` boolean and the optional `packages` string array. See Targeting Contract V1. |
| `adjacency` | `false` | Set to `true` to add the sealed on-screen observation `imp.ext.encypher` and the `encypher_near` key. A value other than a boolean logs one warning at `init` and leaves the profile off. See the adjacency profile below. |

The signal origin is not configurable. Lookups and telemetry use exactly `https://signals.encypher.com`.

## Targeting Contract V1: GAM key-values

With `gamTargeting` set to an object, the module implements the standard RTD `getTargetingData` hook, so Prebid's ad server targeting carries the result for each ad unit that reached a verified injection in that auction. The module makes no extra request and adds no auction delay.

| Key | Value | Emitted when |
| --- | --- | --- |
| `encypher_verified` | `"1"` | The ad unit received `ortb2Imp.ext.c2pa` in this auction. |
| `encypher_att` | attestation ID, the same value as `ortb2Imp.ext.c2pa.id` | `includeAttestationId` is `true` and the ID matches `[A-Za-z0-9_-]{1,32}`. |
| `encypher_near` | `v`, `a`, `va`, or `0` | `adjacency` is `true` and the ad unit carries `imp.ext.encypher` in this auction. See the adjacency profile. |

Rules:

- Absence is the negative signal. A miss, stale, revoked, invalid, or timed-out outcome emits nothing, and neither does an auction that a consent gate suppressed.
- Targeting is per auction. A verified hit does not carry into the next auction for the same ad unit code.
- Each `packages` entry must match `[A-Za-z0-9_-]{1,32}`. The module never derives package codes from provenance evidence.
- A malformed `gamTargeting` value, an unknown key inside it, or a rejected package code logs one warning at `init` and leaves targeting off. Existing installs that omit the parameter see no behavior change.
- The serialized key-value payload is at most 256 bytes per ad unit. On overflow the module drops `encypher_pkg`, then `encypher_att`, then `encypher_near`, then `encypher_verified`. Only `encypher_pkg` can reach the cap in practice: with `encypher_pkg` gone the payload is at most 96 bytes, because the attestation ID is limited to 32 characters and `encypher_near` to 2.
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

## Adjacency profile (`adjacency: true`)

The adjacency profile tells a buyer's admission gateway which signed assets of the page share the reader's screen with each ad slot, so a deal can require verified content next to the ad. The browser asserts only a position. Every fact about an asset (its label state, its AI declaration, whether it is article content, a teaser, or site chrome) comes from an asset index that Encypher signs, and the gateway takes those facts from the signed index, never from the browser. The open auction cannot read the observation: it is encrypted to the gateway.

### What the lookup adds

With `adjacency: true` the module adds `adjacency=1` to the existing signal lookup. A ready response may then carry two optional fields next to the record, and the module accepts a lookup body of up to 16 KiB instead of 4 KiB:

| Field | Content |
| --- | --- |
| `index` | Compact JWS, header `{"alg":"ES256","kid","typ":"epai+jws"}`, verified against the pinned attestation JWKS. `kid` may select any current trusted attestation-purpose key; it need not equal the key that signed the bound attestation after key rotation. The claims payload must be fatal-valid UTF-8 and its bytes must equal RFC 8785 JSON Canonicalization Scheme (JCS) output exactly; a valid ES256 signature over noncanonical JSON is rejected. Claims are exactly `iss`, `sub`, `iat`, `exp`, `publisher_domain`, `url_hash`, `trust_policy_version`, `record_revision`, `method`, `observed_at`, and `entries`; NumericDates and revisions are safe integers. `sub` equals the record ID, `record_revision` equals the attestation's signed revision, and `exp` equals the attestation expiry. `method` matches `^[a-z0-9][a-z0-9.-]{0,31}$`. `observed_at` cannot follow issuance or be more than 30 days old. `entries` contains at most 64 exact objects `{d, k, s, ai, c, o}`, sorted by unique `d` in ascending byte order. |
| `gateway_jwk` | The gateway's P-256 public key: exactly `kty: "EC"`, `crv: "P-256"`, `kid` matching `[A-Za-z0-9_-]{1,64}`, `x`, `y`, and optionally `use: "enc"` and `alg: "ECDH-ES"`. Any other member, including a private `d`, rejects the key. |

Both fields are ignored silently when absent or invalid; the record still attaches as in 1.1.0. Without `adjacency: true` the lookup is byte-identical to 1.1.0 and a response carrying either field is rejected as malformed, as before. Deploy the edge support for `adjacency=1` before enabling the profile: an edge that does not know the flag answers every lookup as malformed, which removes the 1.1.0 signal too.

### Measurement

After the record verifies, the module verifies the index and takes a fresh layout snapshot for the auction. It clears Prebid's shared rectangle cache first. For each ad unit it finds the slot element: the element whose `id` equals the ad unit code, else the first element whose `data-ad-slot` equals it during the shared capped DOM traversal, else the div of the GPT slot matching the code. Slot travel classification checks the auction deadline and stops after 64 ancestors. An ad unit without a rendered, bounded-depth slot element carries no observation.

The slot's screen is the page band it shares the reader's screen with:

- Static slot (`tr: "s"`): one viewport height centred on the slot, widened to the slot itself when it is taller.
- Sticky slot (`tr: "k"`), when the slot or an ancestor has computed `position: sticky`: the sticky element's containing block plus half a viewport height above and below.
- Fixed slot (`tr: "f"`), when the slot or an ancestor has computed `position: fixed`: the whole document.

Inside that vertical band the module measures visible `img`, `video`, and `audio` elements outside the auction's slots. It excludes hidden, transparent, fixed, sticky, transformed, wholly horizontally off-screen, wholly clipped, or deeply nested media as ambiguous. Clipping and the horizontal viewport trim measured width.

A media element maps to an index entry by the first 11 characters of unpadded base64url SHA-256 over the browser-equivalent serialized absolute URL: `new URL(resolved, document.baseURI).href` after removing the fragment. Resolution prefers `currentSrc`, then `src`, then a video poster. Query order and browser percent encoding remain as serialized. Raw source spelling is not the digest input.

Browser adjacency does not emit the index's `d: "text"` entry. A variation-selector mark proves that some text carries a mark, but the current index has no signed locator that binds an arbitrary DOM block to the indexed article. Text adjacency remains unavailable until that locator exists.

The area denominator is the sum of each visible media candidate's clipped width times its vertical overlap with the slot's band. Unindexed media remains in the denominator. A media item whose matching signed index entry has `c: "chrome"` is excluded from both the denominator and `on`. Each emitted entry's area class is its share of that denominator: `0` below 5%, `1` from 5% to below 25%, `2` from 25% to 60%, `3` above 60%. The observation keeps at most six entries, largest class first, then by `d`. The module stops observation if the RTD deadline closes, the scan visits more than 4,096 DOM elements, or the page contains more than 512 media candidates. Hashing starts no further asset after that deadline. In each case the verified v1 carrier remains available without adjacency.

### `imp.ext.encypher`

The plaintext observation, at most 400 UTF-8 bytes, is:

```json
{"v":1,"id":"epa_01J...","m":"vp1","ix":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","vp":"d","tr":"s","on":[{"d":"Xk3r0bQp1aZ","a":3}]}
```

`ix` is the 43-character unpadded base64url SHA-256 digest of the exact compact index JWS bytes that the browser verified. The gateway requires it to equal the digest of the index in the authenticated snapshot. A mismatch removes adjacency and area-policy eligibility but preserves page-level policy inputs. `vp` is the viewport class from `window.innerWidth`: `m` below 768 px, `t` below 1200 px, `d` otherwise. `on` may be empty: the slot's screen shows no indexed asset.

The module seals it with ECIES to `gateway_jwk`, using WebCrypto only: an ephemeral ECDH P-256 key per impression, HKDF-SHA256 over the 32-byte shared secret with an empty salt and info `encypher-adj-v1`, and AES-256-GCM with a random 12-byte IV, a 128-bit tag, and no additional data. The impression carries:

```json
{"imp":[{"ext":{"c2pa":{"v":1,"id":"epa_01J...","ref":"...","att":"..."},"encypher":{"v":1,"kid":"gw-2026-10","epk":"BH4...","ct":"q9..."}}}]}
```

`epk` is the unpadded base64url 65-byte uncompressed ephemeral public key; `ct` is the unpadded base64url of IV, ciphertext, and tag. An envelope larger than 700 serialized bytes is omitted. The worst case (a 32-character record ID, 43-character `ix`, six entries, and a 64-character `kid`) measures 607 bytes.

### `encypher_near`

For ad units that carry `imp.ext.encypher`, `getTargetingData` adds auction-scoped `encypher_near` after `encypher_verified`. Before RTD hooks run, Prebid assigns each `startAuction` invocation a fresh opaque internal context, independent of the public caller-supplied `auctionId`. Core carries that non-enumerable context into the matching auction event payload. The module keeps the attestation ID and optional adjacency value together in one `WeakMap` record keyed by that context and ad-unit code, then consumes the record when that exact auction reaches targeting, even when consent or targeting settings make the returned map empty. If validation prevents auction creation, no event payload retains the context; the request options and weakly held targeting state become eligible for collection together, without a timer or capacity eviction. A hit cannot supply targeting to an overlapping miss or to another auction that reuses the same public auction ID and ad-unit code:

| Value | Meaning, from the signed index entries in the observation |
| --- | --- |
| `v` | Verified article content is on screen: an entry with `s: "verified"` and `c: "content"`. |
| `a` | An intact label declaring AI is on screen: an entry with `ai: true`, `s` of `verified` or `unrecognized_signer`, and `c` other than `chrome`. |
| `va` | Both. |
| `0` | Neither. |

`0` means only that no labelled asset matching `v` or `a` shares the screen. Unlabelled content is neither human nor AI, so `0` must never be described as human content, AI-free, or safe. A downstream maximum AI-area policy also requires at least one applicable intact labelled item; an empty, unknown-only, or broken-only observation does not satisfy that policy.

### Privacy properties

- No new adjacency request. The index and gateway key arrive in the existing lookup, and nothing is stored. If the publisher separately enables diagnostic telemetry, the existing post-callback telemetry request still occurs.
- The observation holds no coordinates, scroll offsets, timestamps, URLs, or user data: a record ID, a coarse viewport class, a travel class, and at most six index digests with a four-step area class.
- Only the gateway key holder can read it. Each impression uses a fresh ephemeral key, so two envelopes cannot be linked by key material.
- `encypher_near` reveals one of four values per ad unit to the publisher's ad server, which already controls the page.
- Consent gates apply unchanged: a blocked auction does no measurement.

### Fail-open rules

- An absent or invalid index or gateway key, an index for another record, revision, page, domain, or attestation expiry, an observation older than 30 days, a failed signature, an unresolvable slot, a candidate-cap or deadline breach, a WebCrypto failure, or an oversize plaintext or envelope removes only the observation and `encypher_near`. The verified page-level record still attaches.
- The verified v1 carrier is written as soon as its current decision is validated, while auction ownership is open. Optional index verification, measurement, hashing, and encryption remain inside the provider's budget. If the RTD core deadline closes ownership first, no late mutation occurs and the validated v1 carrier remains without adjacency.
- Immediately before either carrier or adjacency injection, the module rechecks the current URL decision, dataset floor, stale barrier, record identity and revision, status expiry, attestation expiry, index expiry, and observation age. A later revocation, stale barrier, superseding revision, or expiry removes a pending injection while ownership remains open.
- `imp.ext.encypher` is written only on the module's auction-local ad-unit copies. When the module owns an auction but produces no fresh observation, it removes a stale input `ext.encypher` and preserves unrelated impression extension fields.
- A missing or invalid observation does not remove page-level `verified_provenance` or `transparent_ai` eligibility at the gateway. Only adjacency and AI-area policies require a valid observation.

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
