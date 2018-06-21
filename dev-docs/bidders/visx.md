---
layout: bidder
title: VIS.X
description: Prebid VIS.X Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: visx
biddercode_longer_than_12: false
prebid_1_0_supported : true
---

### Note
The VIS.X adaptor requires setup and approval from your YOC account manager team, even for existing YOC publishers. Please reach out to your account manager to enable Prebid.js for your account.

### Bid params

{: .table .table-bordered .table-striped }
| Parameter | Scope | Description | Example |
| :--- | :------ | :---- | :---------- | :------ |
| `uid` | required | The publisher's ad unit ID in VIS.X | `'903536'` |
| `priceType` | optional | The price type for received bids. Valid values are `'net'` or `'gross'`. Defaults to `'net'`. Net represents the header bid price with the header bidder margin already extracted. Gross price does contain the VIS.X bidder margin within. | `'net'` |

### Configuration

The VIS.X adaptor has the ability to work in different currencies. Currently this adaptor supports `'EUR'`, `'USD'`, `'GBP'`, `'PLN'`. Defaults to `'EUR'`.

```javascript
$$PREBID_GLOBAL$$.setConfig({
    currency: {
        adServerCurrency: 'GBP'
    }
});
```
Note: this currency config should correspond with your VIS.X account setting. Please reach out to your account manager for more information.

