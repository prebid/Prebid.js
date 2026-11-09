# Transfon Security RTD Provider

## Overview

    Module Name: Transfon Security Rtd Provider
    Module Type: Rtd Provider
    Maintainer: support@transfon.com

Bots and automated browsers load your pages, trigger auctions and waste your demand partners' budgets. The Transfon Security module checks every page view for invalid traffic before the auction starts, so you can:

* **Send a clean signal to bidders:** bid requests carry `tss_qs`, so demand partners bid with confidence on real visitors.
* **Protect your line items:** your ad server receives `tss_qs` as a key-value, so you can keep direct deals and house campaigns away from bots.
* **Stop invalid bid requests:** optionally remove all bid requests for invalid traffic, so bots never reach your demand partners.
* **See where invalid traffic comes from:** your Transfon Security dashboard shows the share of invalid traffic in your auctions and why it was flagged.

The module fails open: if the verdict is not back within `auctionDelay`, the auction runs as normal.

**Disclosure:** this module loads external code that is not open source and has not been reviewed by Prebid.org. The module loads `https://tag.waf360.com/tag/p/rtd.js` (about 16 KB, 7 KB compressed), which runs the browser checks behind the verdict. Allow `tag.waf360.com` and `edge.waf360.com` in your Content Security Policy. If the Transfon Security tag is already on the page, the module uses it instead and does not load the script.

A Transfon Security license is required. [Create a project](https://www.transfon.com/security/prebid-rtd) and copy its license from the Installation page.

## Integration

Build Prebid.js with the RTD core module and this provider:

```bash
gulp build --modules=rtdModule,transfonSecurityRtdProvider,...
```

Configure the provider:

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500,
    dataProviders: [{
      name: 'transfonSecurity',
      waitForIt: true,
      params: {
        licenseId: 'YOUR_LICENSE',
        blockIvt: false
      }
    }]
  }
});
```

The module and its script use one global, `window._waf360rtd`, and the existing `window._waf360` when the Transfon Security tag is on the page.

## Parameters

| Name | Type | Description | Default |
|:--|:--|:--|:--|
| name | String | Must be `transfonSecurity` | |
| waitForIt | Boolean | Wait for the verdict (up to `auctionDelay`) before the auction starts | `false` |
| params.licenseId | String | Transfon Security project license, 10 lowercase hexadecimal characters (required) | |
| params.blockIvt | Boolean | Remove all bid requests for invalid traffic and for visitors matching your project's block rules | `false` |
| params.timeout | Number | Verdict timeout in milliseconds | `1000` |

## Output

| Where | Key | Values |
|:--|:--|:--|
| Bidders (global first party data) | `ortb2.site.ext.data.tss_qs` | `1` valid traffic, `0` invalid traffic |
| Ad server targeting (per ad unit) | `tss_qs` | `"1"`, `"0"` |

In Google Ad Manager, create a key named `tss_qs` with the values `0` and `1`, then target line items with `tss_qs` is not `0`, so page views without a verdict keep serving.

## Privacy

The module follows Prebid's consent and activity controls (Global Vendor List ID 1370). It uses cookies only when device access is allowed, and the page level report to your Transfon Security project is sent only when analytics reporting is allowed. Invalid traffic is still detected without consent, for security and fraud prevention.

Storage, used only when device access is allowed. `__unis_uid` also needs analytics reporting and user id transmission (`transmitEids`) to be allowed.

| Name | Type | Domain | Duration | Purpose |
|:--|:--|:--|:--|:--|
| `__unis_uid` | Cookie | Publisher's site | 301 days | First party visitor id, so repeat visits by the same browser are measured as one visitor |
| `_pqs` | Cookie | `edge.waf360.com` | 180 days | Traffic quality session token, used to detect invalid traffic |

## Testing

```bash
gulp test-only --file test/spec/modules/transfonSecurityRtdProvider_spec.js
```
