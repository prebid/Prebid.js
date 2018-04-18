---
layout: bidder
title: Prebid Server
description: Prebid Server S2S Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: prebidServer
biddercode_longer_than_12: true
hide: true
prebid_1_0_supported : true
media_types: video
gdpr_supported: true
---

### Sign up

Sign up for account on [prebid.adnxs.com](https://prebid.adnxs.com)

### bid params

Bid params are sourced from the adapter configurations set for client side. These do not need to change for Prebid Server. 

### Configuration
To enable prebid server, set the following configuration. 

```
pbjs.setConfig({
    s2sConfig: {
        accountId : '12345',
        bidders : ['appnexus','pubmatic', 'rubicon'], 
        defaultVendor: 'appnexus'
    }
});
```
Configuration options

{: .table .table-bordered .table-striped }
| Field        | Type          | Required? | Description                                                              |
|--------------+---------------+-----------+--------------------------------------------------------------------------|
| `accountId`  | String        | X         | Prebid Server account ID.                                                |
| `bidders`    | Array[String] | X         | List of bidder codes; must have been enabled during Prebid.js build.     |
| `defaultVendor` | String     |           | Automatically includes all following options in the config with vendor's default values.  Individual properties can be overridden by including them in the config along with this setting. | 
| `enabled`    | Boolean       | X         | Enables S2S; default: `false`.                                           |
| `endpoint`   | String        | X         | Set the endpoint. For example: `https://prebid.adnxs.com/pbs/v1/auction` |
| `timeout`    | Number        |           | Bidder timeout, in milliseconds; default: `1000`.                         |
| `syncEndpoint` | String     |           | Configures the user-sync endpoint. Highly recommended.                    |
| `adapter`    | String        |           | Adapter code; default: `"prebidServer"`.                                  |
| `cookieSet`  | Boolean       |           | Set to `false` to opt out of cookieset/link rewriting.   |
| `secure`     | Integer       |           | Override Prebid Server's determination of whether the request needs secure assets. Set to `1` to force secure assets on the response, or `0` for non-secure assets. |
