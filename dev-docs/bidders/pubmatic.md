---
layout: bidder
title: PubMatic
description: Prebid PubMatic Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: pubmatic
biddercode_longer_than_12: false
prebid_1_0_supported : true
gdpr_supported: true
---

### Prebid Server Note:
Before configuring the PubMatic adapter as S2S, you must reach out to the PubMatic team for approval and setup steps.

### Prebid 1.0 Upgrade Note:
If you upgrading from a Prebid version prior to 1.0, please reach out to your PubMatic Customer Success Manager prior to your upgrade.  Publisher accounts need new settings to function correctly with the PubMatic Prebid 1.0 adapter and your Customer Success Manager will ensure your account is setup correctly.

### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `publisherId` | required | Publisher ID | "32572" |
| `adSlot` | required | Ad Unit ID | "38519891@300x250" |
| `pmzoneid` | optional | Zone ID | "zone1,zone2" |
| `lat` | optional | Latitude | "40.712775" |
| `lon` | optional | Longitude | "-74.005973" |
| `yob` | optional | Year of Birth | "1982" |
| `gender` | optional | Gender | "M" |
| `kadpageurl` | optional | Overrides Page URL | "http://www.yahoo.com/" |
| `kadfloor` | optional | Bid Floor | "1.75" |

### Configuration

PubMatic recommends the UserSync configuration below.  Without it, the PubMatic adapter will not able to perform user syncs, which lowers match rate and reduces monetization.

```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    enabledBidders: ['pubmatic'],
    syncDelay: 6000
 }});
```
Note: Combine the above the configuration with any other UserSync configuration.  Multiple setConfig() calls overwrite each other and only last call for a given attribute will take effect.
