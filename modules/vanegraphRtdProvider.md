# Overview

```
Module Name: Vanegraph Rtd Provider
Module Type: Rtd Provider
Maintainer: hello@vanegraph.com
```

# Description

Vanegraph adds contextual signals for the current page to bid requests, with no personal data:

- IAB Content Taxonomy 3.1 categories in `site.content.cat` (`cattax: 9`)
- Segments in `site.content.data` with `segtax` 9 (CT 3.1) and 6 (CT 2.2)
- Vendor segments for brand-safety tier (`vg-safety-*`), risk categories (`vg-risk-*`), reader intent (`vg-intent-*`), commercial intent (`vg-commercial-*`), and the publisher's own audience segments (`vg-seg-*`)

Pages are classified once and served from cache. An unseen page is queued and gets labels on a later view, so the module never delays an auction waiting for a model.

Optionally mirrors the labels as Google Ad Manager key-values (`vg_cat`, `vg_safety`, `vg_intent`, `vg_seg`) for direct-sold line items.

Create a publishable key (`pk_…`, locked to your domains) with `POST https://api.vanegraph.com/v1/publishable-keys`. See https://vanegraph.com/docs#rtd.

# Integration

```
gulp build --modules=rtdModule,vanegraphRtdProvider,...
```

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 150,
    dataProviders: [{
      name: 'vanegraph',
      waitForIt: true,
      params: {
        publishableKey: 'pk_...',
        setGptTargeting: true
      }
    }]
  }
});
```

# Parameters

| Name | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `publishableKey` | String | Publishable key (`pk_…`) | required |
| `url` | String | Page URL to look up | current page |
| `keepParams` | Array of strings | Query parameters that identify the content (for example `["id"]`); every other query parameter and the fragment are removed before the URL is sent | `[]` |
| `setGptTargeting` | Boolean | Also set GAM key-values | `true` |
| `endpoint` | String | API endpoint override | `https://api.vanegraph.com/v1/rtd` |

# Privacy

- Only the page address is sent: origin and path, plus any parameters listed in `keepParams`. Query strings, which can carry user-specific values, and fragments are removed.
- No cookies, no storage, no user identifiers.
- When GDPR applies and the CMP has given no consent string, the module makes no request.
- When the publisher already sends `site.content.cat` in another taxonomy, it is left untouched; Vanegraph's categories are then sent only as `site.content.data` segments (segtax 9).
