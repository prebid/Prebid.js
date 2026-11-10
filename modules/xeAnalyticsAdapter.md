# Overview

Module Name: Xeworks Analytics Adapter
Module Type: Analytics Adapter
Maintainer: dima@xe.works

# Description

Reports the Prebid.js auctions of ad units that carry an XE placement to XE (xe.works, GVL ID 1383), for the auction
reports of XE publishers: competition, win share, floors, timeouts, rejected bids and render outcomes.

Every bidder of such an ad unit is reported, but bidder params are not: only the XE placement id (`pid`) of the
XE family bidders (`xe`, `xeworks`, `adipolo`, `anyclip`, `anzuDSP`, `driftpixel`, `iqx`, `leagueM`, `lm_kiviads`, `kivi`, `matterfull`, `revealon` and `robustApps`), their aliases and the codes listed in the `bidders` option. Auctions and ad
units without an XE placement are not sent.

The adapter sends no user ids, IP addresses or consent strings: only flags (GDPR applies, GPP section ids, US Privacy
and COPPA present, schain present) and the names of the user id sources. It does not read or write browser storage
or cookies.

# Analytics Options

| Name | Scope | Description | Example | Type |
|------|-------|-------------|---------|------|
| bidders | optional | Other bidder codes whose params carry an XE placement id | `['myXeAlias']` | string[] |
| sampling | optional | Share of page views to report, 0 to 1 (default 1) | `0.5` | number |

# Events

- `auctionInit`, `bidRequested`: ad units (media types, sizes, gpid), timeout, page and referrer domain, device type,
  user id source names, privacy flags, price floor data (location, fetch status, provider, model version, skipped)
- `bidResponse`, `bidRejected`: cpm, original cpm and currency, size, media type, deal, response time, floor value
  and rule, first advertiser domain, DSP name from `meta`, rejection reason
- `noBid`, `bidTimeout`, `bidderError` (HTTP status), `auctionEnd` (duration)
- `bidWon`, `adRenderSucceeded`, `adRenderFailed`, `bidViewable`, `staleRender`, `expiredRender`,
  `browserIntervention`, and `billableEvent` with the `adId` of a won bid

An auction is sent 3 seconds after `auctionEnd`, together with the wins and renders of that window. Later events go in
batches once a second. When the page is hidden or unloaded, everything pending is sent with `sendBeacon`. Requests
are `text/plain` POSTs to `https://pbjs.xe.works/analytics`, split into bodies under 64 KB.

# Example

```javascript
pbjs.enableAnalytics({
  provider: 'xe',
  options: {
    bidders: ['myXeAlias']
  }
});
```

# Build

```bash
gulp build --modules=xeBidAdapter,xeAnalyticsAdapter
```
