# Overview

```
Module Name:  Define Media Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   n.leidig@definemedia.de
```

# Description

This is the official Define Media Bid Adapter for Prebid.js. An open-source project maintained by Define Media.
This adapter only supports Banner Ads at the moment. In the backend we use our own RTB-Server to deliver the ads.

# Bid Parameters

| Name | Scope | Type    | Description                                                                                                                                                  | Example
| ---- | ----- |---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------| -------
| `supplierDomainName` | required | String  | The domain name of the last supplier in the chain. Under this domain a sellers.json must be available under https://${supplierDomainName}/sellers.json       | definemedia.de
| `devMode` | optional | boolean | This parameter enables our development endpoint instead of the production endpoint. All requests done with this parameterer set to "true" are *NOT* billable | true
