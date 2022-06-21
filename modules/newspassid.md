layout: bidder
title: newspassiD
description: LMC NewspassID Prebid JS Bidder Adapter
biddercode: newspassid
gdpr_supported: false
gvl_id: none
usp_supported: true
coppa_supported: false
schain_supported: true
dchain_supported: false
userId: criteo, id5Id, tdid, identityLink, liveIntentId, parrableId, pubCommonId, lotamePanoramaId, sharedId, fabrickId
media_types: banner
safeframes_ok: true
deals_supported: true
floors_supported: true
fpd_supported: true
pbjs: true
pbs: true
prebid_member: false
multiformat_supported: will-bid-on-any
---
### Note:

The Example Bidding adapter requires setup before beginning. Please contact us at techsupport@newspassid.com

### Bid Params

{: .table .table-bordered .table-striped }

| Name      | Scope    | Description               | Example    | Type     |
|-----------|----------|---------------------------|------------|----------|
| `siteId`    | required | The site ID.  		   | `"NPID0000001"` | `string` |
| `publisherId`    | required | The publisher ID.  | `"4204204201"` | `string` |
| `placementId`    | required | The placement ID.  | `"0420420421"` | `string` |
| `customData`     | optional | publisher key-values used for targeting | `[{"settings":{},"targeting":{"key1": "value1", "key2": "value2"}}], ` | `array` |