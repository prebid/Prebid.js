---
layout: bidder
title: Prebid Server
description: Prebid Server S2S Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: prebidServer
biddercode_longer_than_12: true
hide: true
---

### Sign up

Sign up for account on [prebid.adnxs.com](https://prebid.adnxs.com)

### bid params

Bid params are sourced from the adapter configurations set for client side. These do not need to change for Prebid Server. 

### Configuration
To enable prebid server, set the following configuration. 

```
pbjs.setS2SConfig({
    accountId : '12345',
    enabled : true,
    bidders : ['appnexus','audienceNetwork', 'rubicon'], 
    timeout : 1000, 
    cookieSet : true
});
```
Configuration options

{: .table .table-bordered .table-striped }
| Name | Required? | Description
|:-----------|:-----------|:---------------------------|
| `accountId` | required | string:required: account ID obtained in sign up process |
| `enabled` | required | boolean:required: enables s2s - default false |
| `bidders` | required | array[string]:required: of bidder codes to enable S2S. |
| `syncEndpoint` | optional | string:optional sets user-sync endpoint. |
| `timeout` | optional | number:optional timeout in ms for bidders called via the S2S endpoint.|
| `cookieSet` | optional | boolean:optional: If `false` (not recommended), opt out of link rewriting to improve cookie syncing. |
