# Overview

```text
Module Name: Panxo RTD Provider
Module Type: RTD Provider
Maintainer: prebid@panxo.ai
```

# Description

The Panxo RTD module reads the external runtime's AI visit classification
and exposes only its coarse `{ai: true}` signal through `site.ext.data.panxo`.
This describes the visit, not whether the page is public or about AI. The
candidate discards legacy device/user payloads and all other site fields,
including `src`, `conf`, `seg`, `co`, `topics` and arbitrary `context`.

`panxoRtdProvider` first shipped in Prebid.js 10.25. The proposed update
retains the default script URL and signal/error messages. Its `connect` bridge receives
a frozen empty object as its first argument and the guarded signal callback as
its second. The provider supplies no Prebid methods, event subscriptions or
auction payloads through this argument. This intentionally removes the historical
event interface; the coarse classification runtime does not use it. The empty
argument does not sandbox the separately loaded script.
The core Prebid `rtdModule` dependency is unchanged.

The provider registers GVL ID `1527` with Prebid. It checks Prebid's
`accessDevice` and `enrichUfpd` activities before loading or connecting the
runtime and before accepting callback signals or enriching an auction. The module
loader also enforces `loadExternalScript`. A valid configuration remains
initialized when a load is blocked, so a later auction can retry if the
applicable controls permit it. A script that finished loading while blocked
can connect later without another download.

Configuration validation and the provider's `init` result remain synchronous.
Initial preloading starts in a later browser task, after synchronous listeners
for the same `pbjs.setConfig` call have registered consent and publisher activity
controls. Configure those controls together with or before RTD. An auction can
start loading immediately and still checks the current activities. The deferred
preload is cancelled by deletion or replacement of the connection. Loading
exceptions release waiting auctions without enrichment and permit a later retry.

An observed denial clears the provider's cached signal, invalidates its bridge
and releases waiting auctions without enrichment. These checks use Prebid's
current activity rules; they do not interpret a separate consent snapshot or
add a geographic policy. Without configured consent or publisher activity
controls, Prebid's default behavior can allow the activity. The provider
cannot stop independent storage or network operations of an already executed
runtime.

The RTD core reads `realTimeData.dataProviders` once and caches the provider's
`init` result. Configure it before starting auctions; subsequent `pbjs.setConfig`
calls do not reinitialize the provider. Local data deletion retires the current
connection and its callback. The provider also retires the previous connection
if its `init` is called again. Late callbacks cannot enrich a later connection's
auctions.
The default bridge still uses the historical script URL and message interface, but
now discards its device/user payloads and narrows site data to the coarse AI
visit flag. This is an intentional change to
enrichment behavior. The loaded script can make independent identity and sync
requests; filtering its messages does not prevent that behavior. Local deletion
does not establish deletion or retention behavior in that runtime.

This documentation covers a proposed update; it is not yet a released version.

To use this module, contact [publishers@panxo.ai](mailto:publishers@panxo.ai) or sign up at [app.panxo.ai](https://app.panxo.ai) to receive your site identifier.

# Build

```bash
gulp build --modules=rtdModule,panxoRtdProvider,...
```

> `rtdModule` is required to use the Panxo RTD module.

**Disclosure:** This module loads external code that is not open source and
has not been reviewed by Prebid.org. The runtime is downloaded from
`https://api.idsequoia.ai/rtd.js` to obtain the Panxo signals. Publisher
registration is required to use the commercial service. The isolated test mode
below instead selects its disclosed static reviewer URL and reserved fixtures.

The initial script request sends the property `siteId` and a per-connection
`session` value. It does not include the publisher's referrer domain as a query
parameter. Before inserting the script, the loader sets `crossorigin="anonymous"`
and `referrerpolicy="no-referrer"`. These suppress cross-origin credentials and
the HTTP Referer header for this request; anonymous CORS still permits same-origin
credentials. The script download remains a network request; its CORS `Origin`
header can expose the publisher origin along with other transport metadata.
These attributes do not control subsequent runtime requests.

# Configuration

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 300,
        dataProviders: [{
            name: 'panxo',
            waitForIt: true,
            params: {
                siteId: 'a1b2c3d4e5f67890'
            }
        }]
    }
});
```

## Parameters

| Name      | Type    | Description                                                                           | Required |
| :-------- | :------ | :------------------------------------------------------------------------------------ | :------- |
| `siteId`  | String  | 16 lowercase hexadecimal characters identifying the publisher property                | Yes      |
| `verbose` | Boolean | Enable verbose logging for troubleshooting                                            | No       |
| `test`    | Boolean | Use the fixed synthetic reviewer with a reserved site identifier; defaults to `false` | No       |

# Isolated reviewer mode

The optional boolean `params.test: true` selects the fixed synthetic reviewer
script `https://panxo-prebid-reviewer-external.okpbidgx.workers.dev/rtd.js`.
It requires one of the six reserved site identifiers `0000000000000001`
through `0000000000000006`, corresponding to banner, instream video, native,
CTV video, in-app banner and in-app native. Those identifiers are rejected
without `test: true`; ordinary site identifiers are rejected in test mode.
Non-boolean values are rejected. The provider never falls back from the
reviewer to the commercial script endpoint.

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 1500,
        dataProviders: [{
            name: 'panxo', waitForIt: true,
            params: { siteId: '0000000000000001', test: true }
        }]
    }
});
```

Use a clean test page and configure the provider before its first auction.
The core still initializes it once. If the provider is explicitly initialized
again, its endpoint, site and signal state belong to a new connection generation;
late callbacks from the previous mode cannot enrich it. A rejected initialization
retires the old connection and releases its pending auctions without enrichment.
Activity controls, anonymous CORS and the no-referrer policy apply to both modes.

This RTD option does not change bidder routing. Prebid.js bidder review also
requires numeric `ortb2.test: 1` and the matching reserved property key described
in the bidder documentation. The reviewer is synthetic and has no live demand
or billing. It does not verify serving at the default commercial endpoint.

# Data added to the auction

Only an own data property `ai` with the boolean value `true` produces
`{ai: true}`. False, absent or invalid values produce an empty internal
projection `{}`; values are not coerced. That empty projection adds no new
Panxo site fragment and does not clear existing publisher first-party data.
Inherited properties and accessors are not accepted, and arbitrary site
properties are not read or copied. The provider leaves other providers'
auction fragments untouched.

This deliberately removes source, confidence, segment, country, topics and
free-form context. It reuses the runtime's documented coarse mode; it does not
create new signal fields. Descriptor checks avoid executing getters but do
not authenticate signal provenance or sandbox the external runtime.
