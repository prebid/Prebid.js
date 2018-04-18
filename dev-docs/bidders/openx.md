---
layout: bidder
title: OpenX
description: Prebid OpenX Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: openx
biddercode_longer_than_12: false
prebid_1_0_supported : true
media_types: video
---



### bid params

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `unit` | required | OpenX ad unit ID provided by your OpenX representative. | "1611023122" |
| `delDomain` | required | OpenX delivery domain provided by your OpenX representative.  | "PUBLISHER-d.openx.net" |
| `customParams` | optional | User-defined targeting key-value pairs. customParams applies to a specific unit. | `{key1: "v1", key2: ["v2","v3"]}` |
| `customFloor` | optional | Minimum price in USD. customFloor applies to a specific unit. For example, use the following value to set a $1.50 floor: 1.50 | 1.50 |


### Configuration
Add the following code to enable user syncing. By default, Prebid.js version 0.34.0+ turns off user syncing through iframes. OpenX strongly recommends enabling user syncing through iframes. This functionality improves DSP user match rates and increases the OpenX bid rate and bid price. Be sure to call `pbjs.setConfig()` only once.

```javascript
pbjs.setConfig({
   userSync: {
      iframeEnabled: true
   }
});
```
