# Overview

```text
Module Name: Panxo Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@panxo.ai
```

# Description

Panxo is a specialized SSP for AI-referred traffic monetization. This adapter enables publishers to monetize traffic coming from AI assistants like ChatGPT, Perplexity, Claude, and Gemini through Prebid.js header bidding.

## Availability

`panxoBidAdapter` has been published in Prebid.js since version 10.23. The
Panxo provider, `panxoRtdProvider`, has been published since version 10.25.
This proposal updates only the bid adapter. The RTD provider is reviewed in
a separate PR; the adapter accepts absent or legacy RTD signals and filters
the Panxo namespace independently. The core `rtdModule` is unchanged.

This documentation covers a proposed update; it is not yet a released version.

**Important**: Publishers must include and enable `rtdModule` and
`panxoRtdProvider`; no separate Panxo Signal tag is installed on the page. The
provider loads the RTD implementation through Prebid. This candidate no longer
reads `panxo_uid`, forwards EIDs or emits user sync. It preserves existing
OpenRTB consent fields and continues contextual bidding without a user ID.

The bid adapter is tolerant of absent RTD data, but the Panxo RTD provider is a
required publisher integration for AI classification. The provider forwards
only the coarse AI visit flag `{ai: true}` through `site.ext.data.panxo`;
false, missing or invalid `ai` values produce `{}`. It discards the bridge's
legacy device/user payloads and richer site context. The bidder independently
excludes those identity channels.
Use `waitForIt: true` plus an appropriate `auctionDelay` when those RTD signals
must be present in the first auction. When the publisher supplies explicit
`app` inventory, the adapter preserves App as the sole channel and moves this
Panxo RTD context to `app.ext.data.panxo`.

# Prerequisites

1. Register your property at [app.panxo.ai](https://app.panxo.ai)
2. Obtain your `propertyKey` from the Panxo dashboard
3. Build Prebid with the Panxo RTD modules and enable the provider:

```bash
gulp build --modules=panxoBidAdapter,rtdModule,panxoRtdProvider
```

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 1500,
        dataProviders: [{
            name: 'panxo',
            waitForIt: true,
            params: { siteId: 'your-site-id' }
        }]
    }
});
```

## Property-key migration restriction

This candidate does not support migration of path-scoped zone keys. The
ordinary `/openrtb/2.6/bid` receiver rejects a key whose trusted zone
configuration has a non-root `pathPrefix`, even if a caller supplies
`site.page`. Both JS and PBS intentionally omit `site.page` and `site.ref`;
full URLs or pathnames that may contain identifiers must not be restored as a
workaround.

Before migrating an existing `propertyKey`, confirm its trusted inventory
scope and exclude non-root zone keys from this update. An ordinary host-based
property or root-zone success does not prove section membership. Root-zone
keys retain their host, device and other authorization checks. An unknown key
scope is not evidence of compatibility; do not silently substitute a host or
root-zone key to make a request bid.

Contact Panxo before migrating a path-scoped key; this update does not support
that configuration.

# Bid Params

| Name          | Scope                             | Description                                                                                                     | Example          | Type     |
| ------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------- | -------- |
| `propertyKey` | required                          | Your unique property identifier from Panxo dashboard                                                            | `'abc123def456'` | `string` |
| `floor`       | deprecated, legacy Prebid.js only | Legacy CPM fallback in USD; use standard Price Floors rules/defaults or an OpenRTB floor for new configurations | `0.50`           | `number` |

For new configurations, use publisher-controlled Price Floors rules/defaults
or a static OpenRTB floor. The legacy JS `params.floor` is deprecated but remains
available in USD when no standard floor control is active. Existing fallback
values must not be relabeled as the ad-server currency during migration.

An active Price Floors model controls the floor even when a rule yields zero,
null, no match, an A/B skip or `noFloorSignalBidders`. Those cases do not restore
the legacy bidder fallback. If the module reports no floor data, the existing
fallback remains available. Without active Price Floors control, JS preserves
an explicit `ortb2Imp.bidfloor` and `bidfloorcur` before considering the legacy
parameter; an omitted OpenRTB floor currency means USD.

Panxo transport uses USD. The adapter requests floors in USD and uses Prebid's
configured Currency module to convert any foreign impression or deal floor.
A positive floor without a valid rate causes that impression to be skipped;
the amount is never relabeled, ignored or replaced with a legacy fallback.
Zero can be normalized without a rate. Publisher inputs and other impressions
are preserved. Prebid converts the returned USD bid to the configured ad-server
currency after adapter response validation.

For Prebid Server, configure standard floors through its core or supply OpenRTB
`imp.bidfloor` and `bidfloorcur`. The Server adapter converts copied impression
and deal floors to USD using PBS currency rates, while the exchange retains the
original auction currency. It does not read `params.floor`. Migrate the legacy
value to an equivalent standard
rule/default before changing routes; `floorMin` is a mandatory minimum and is
not an equivalent fallback. Keep explicit zero and skip behavior in migration
checks. If a static positive floor is also present, both the pinned
Prebid.js-to-PBS serializer and PBS core floor processing can retain it when a
dynamic rule returns zero. Resolve that configuration conflict before asserting
equivalence across routes.

# Configuration Example

```javascript
var adUnits = [{
    code: 'banner-ad',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [728, 90]]
        }
    },
    bids: [{
        bidder: 'panxo',
        params: {
            propertyKey: 'your-property-key-here'
        }
    }]
}];
```

# Full Page Example

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Includes panxoBidAdapter, rtdModule and panxoRtdProvider -->
    <script defer src="prebid.js"></script>
    
    <script>
        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];
        
        pbjs.que.push(function() {
            pbjs.setConfig({
                realTimeData: {
                    auctionDelay: 1500,
                    dataProviders: [{
                        name: 'panxo',
                        waitForIt: true,
                        params: { siteId: 'your-site-id' }
                    }]
                }
            });
            pbjs.addAdUnits([{
                code: 'div-ad-1',
                mediaTypes: {
                    banner: { sizes: [[300, 250]] }
                },
                bids: [{
                    bidder: 'panxo',
                    params: {
                        propertyKey: 'your-property-key'
                    }
                }]
            }]);
            
            pbjs.requestBids({
                bidsBackHandler: function() {
                    // Handle bids
                }
            });
        });
    </script>
</head>
<body>
    <div id="div-ad-1"></div>
</body>
</html>
```

# Media and Inventory Compatibility

The adapter handles banner, video and native impressions using OpenRTB 2.6.
Web inventory uses `site`; in-app inventory uses `app`. CTV uses `app`, video
and the connected-TV `device.devicetype`. CTV and in-app are inventory contexts,
not additional media types. Unsupported audio receives no bid.

Video serving requires the publisher's Prebid renderer/cache configuration.
The synthetic fixtures exercise these request shapes; they do not certify
physical mobile/CTV devices or commercial integrations.

# Privacy & Consent

**IAB TCF Global Vendor List ID: 1527**

This adapter is registered with the IAB Europe Transparency and Consent Framework. Publishers using a CMP (Consent Management Platform) should ensure Panxo (Vendor ID 1527) is included in their vendor list.

This adapter supports:

- **GDPR/TCF 2.0**: Consent string is passed in bid requests. GVL ID: 1527
- **CCPA/US Privacy**: USP string is passed in bid requests  
- **GPP**: Global Privacy Platform strings are supported
- **COPPA**: Child-directed content flags are respected

The adapter transports well-formed GDPR, USP and GPP signals without inventing
missing consent. Malformed optional fragments are omitted while other valid
auction context remains available; Prebid's valid `gpp_sid = -1` sentinel is
preserved when no section applies, while a mixed sentinel/section value is
omitted. The Panxo Worker remains the final privacy enforcement point.

## CMP Configuration

If you use a Consent Management Platform (Cookiebot, OneTrust, Quantcast Choice, etc.), ensure that:

1. Panxo (Vendor ID: 1527) is included in your vendor list
2. Users can grant/deny consent specifically for Panxo
3. The CMP loads before Prebid.js to ensure consent is available

Example TCF configuration with Prebid:

```javascript
pbjs.setConfig({
    consentManagement: {
        gdpr: {
            cmpApi: 'iab',
            timeout: 8000,
            defaultGdprScope: true
        },
        usp: {
            cmpApi: 'iab',
            timeout: 1000
        }
    }
});
```

# User Sync

This candidate does not return user-sync pixels or iframe syncs. The Server
registration also omits user-sync configuration. These adapter changes do not
control independent requests made by the separately loaded RTD runtime.

# First Party Data

The candidate preserves normalized site/app context except `site.page` and
`site.ref`, remaining root device fields, regulation and supply-chain data,
and per-bid media, placement, PMP and floor fields. It omits top-level request
`ext`, all `device.ext` and all `imp.ext` from the outgoing request. Page/ref
are not restored from browser referer data. This intentionally removes GPID,
impression transaction IDs, viewport extensions and other metadata contained
there; it narrows the earlier passthrough behavior. Currency controls are
consumed locally before request extensions are omitted. The PBS adapter also
extracts its property key before omitting impression extensions.

Media objects, consent, billing and computed floors/currencies retain their
existing behavior. Publisher inputs and other bidders are not rewritten.
The JS and Server adapters independently retain only a strict boolean `ai`
inside `site.ext.data.panxo` or `app.ext.data.panxo`. They omit legacy IDs,
history, memberships, links and richer data in that namespace, including
RTD context transferred to an app request.
The candidate retains
only existing consent fields from `ortb2.user`. User IDs, buyer IDs, EIDs,
audience memberships and arbitrary user extensions are omitted. Device IFA,
hashed device identifiers, IP addresses and the legacy `device.ext.panxo`
envelope are omitted as well. The RTD provider keeps only an own boolean
`ai: true` as `{ai: true}`, omitting `src`, `conf`, `seg`, `co`, `topics` and
arbitrary `context`. This classifies the visit, not whether a page is public
or about AI. Descriptor checks avoid executing getters without authenticating
provenance. Other contextual fields and the separately loaded runtime may
still carry identifiers; this filtering does not make the integration anonymous.

For example:

```javascript
pbjs.setConfig({
    ortb2: {
        site: {
            name: 'Example Site',
            cat: ['IAB1'],
            content: {
                keywords: 'technology, ai'
            }
        }
    }
});
```

# Supply Chain (schain)

Supply chain information is automatically passed when configured:

```javascript
pbjs.setConfig({
    schain: {
        validation: 'relaxed',
        config: {
            ver: '1.0',
            complete: 1,
            nodes: [{
                asi: 'publisher-domain.com',
                sid: '12345',
                hp: 1
            }]
        }
    }
});
```

# Floor Prices

This adapter supports the Prebid Price Floors Module. The following synthetic
example illustrates publisher-selected rules; it does not prescribe a price:

```javascript
pbjs.setConfig({
    floors: {
        enforcement: { floorDeals: true },
        data: {
            currency: 'USD',
            default: 0.50,
            schema: { fields: ['mediaType'] },
            values: { 'banner': 0.50 }
        }
    }
});
```

# Win and Billing Notifications

In Prebid.js, a non-empty OpenRTB `nurl` is sent from `onBidWon`, and a
non-empty `burl` is sent from `onBidBillable`. Both use Prebid's pixel helper
and require a finite price. The `${AUCTION_PRICE}` macro uses `originalCpm`
when finite, otherwise `cpm`.

By default a winning bid is also billable. If the publisher sets
`adUnit.deferBilling: true`, the win callback still runs, but billing waits for
the publisher's `pbjs.triggerBilling(winningBid)` call when appropriate.
Prebid core processes impression image trackers (`event: 1`, `method: 1`)
before calling `onBidBillable`. If the expanded `burl` exactly matches one of
those tracker URLs, the adapter leaves that notification to core rather than
sending a second pixel. This does not assert general deduplication of all
notification types or backend charging behavior.

These callbacks describe the client adapter. Prebid Server uses its own core
and integration tracking path; it does not execute the JavaScript hooks.

# Response Validation

Responses must contain a bid ID and match the grouped OpenRTB request ID,
impression ID, requested currency and one of the media types offered by that
impression. Banner dimensions must match a requested size; Video responses must
contain valid VAST markup and Native responses must contain a valid OpenRTB
Native response. When `mtype` is omitted it is inferred only for a single-format
impression, never for an ambiguous multi-format impression. Invalid prices,
empty creative markup and cross-property impression IDs are rejected; malformed
optional notification/deal fields are omitted. For Prebid.js TTL, a finite
`bid.exp` of at least one second is rounded down and capped at 300 seconds;
absent, non-finite or smaller values use the 300-second fallback.
An omitted OpenRTB response currency is USD by specification. JS validates the
response against the USD transport request before the Currency module converts
the bid to the publisher's currency. An explicitly malformed ad-server currency
fails closed. Notice macros retain the original USD bid price.

The adapter also maps OpenRTB response transparency fields (`adomain`, `cat`,
`cattax`, `attr`, `ext.dsa`, `ext.dchain` and `ext.eventtrackers`) to Prebid's
canonical bid response. Additional safe reporting fields may be returned under
`bid.ext.prebid.meta`; standard OpenRTB fields remain authoritative when both
locations contain the same information.

# Contact

For support or questions:

- Email: <tech@panxo.ai>
- Documentation: <https://docs.panxo.ai>
