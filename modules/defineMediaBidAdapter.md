# Overview

```
Module Name:  Define Media Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   m.klumpp@definemedia.de
```

# Description

This is the official Define Media Bid Adapter for Prebid.js. It currently supports **Banner**. Delivery is handled by Define Media’s own RTB server.
Publishers are onboarded and activated via Define Media **Account Management** (no self-service keys required).

# Bid Parameters

| Name                | Scope    | Type    | Description                                                                                                                                                 | Example         |
|---------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|
| `supplierDomainName`| required | string  | **Identifier used for the supply chain (schain)**. Populates `source.schain.nodes[0].asi` to attribute traffic to Define Media’s supply path. **Publishers do not need to host a sellers.json under this domain.** | `definemedia.de` |
| `devMode`           | optional | boolean | Sends requests to the development endpoint. Requests with `devMode: true` are **not billable**.                                                             | `true`          |


# How it works

- The adapter converts Prebid bid requests to ORTB and sets:
  - `source.schain.complete = 1`
  - `source.schain.nodes[0].asi = supplierDomainName`
- This ensures buyers can resolve the **supply chain** correctly without requiring any sellers.json hosted by the publisher.

# Example Prebid Configuration

```js
pbjs.addAdUnits([{
  code: 'div-gpt-ad-123',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  bids: [{
    bidder: 'defineMedia',
    params: {
      supplierDomainName: 'definemedia.de',
      // set only for non-billable tests
      devMode: false
    }
  }]
}]);
```

# Notes

- **Onboarding**: Publishers must be enabled by Define Media Account Management before traffic is accepted.
- **Transparency**: Seller transparency is enforced on Define Media’s side via account setup and standard industry mechanisms (e.g., schain). No publisher-hosted sellers.json is expected or required.
