---
Module Name: NewspassId Bidder Adapter
Module Type: Bidder Adapter
Maintainer: techsupport@newspassid.com
layout: bidder
title: Newspass ID
description: LMC Newspass ID Prebid JS Bidder Adapter
biddercode: newspassid
gdpr_supported: false
gvl_id: none
usp_supported: true
coppa_supported: false
schain_supported: true
dchain_supported: false
userIds: criteo, id5Id, tdid, identityLink, liveIntentId, parrableId, pubCommonId, lotamePanoramaId, sharedId, fabrickId
media_types: banner
safeframes_ok: true
deals_supported: true
floors_supported: false
fpd_supported: false
pbjs: true
pbs: false
prebid_member: false
multiformat_supported: will-bid-on-any
---

### Description

LMC Newspass ID Prebid JS Bidder Adapter that connects to the NewspassId demand source(s).

The Newspass bid adapter supports Banner mediaTypes ONLY.
This is intended for USA audiences only, and does not support GDPR


### Bid Params

{: .table .table-bordered .table-striped }

| Name      | Scope    | Description               | Example    | Type     |
|-----------|----------|---------------------------|------------|----------|
| `siteId`    | required | The site ID.  		   | `"NPID0000001"` | `string` |
| `publisherId`    | required | The publisher ID.  | `"4204204201"` | `string` |
| `placementId`    | required | The placement ID.  | `"0420420421"` | `string` |
| `customData`     | optional | publisher key-values used for targeting | `[{"settings":{},"targeting":{"key1": "value1", "key2": "value2"}}], ` | `array` |
 
### Test Parameters


A test ad unit that will consistently return test creatives:

```

//Banner adUnit

adUnits = [{
                    code: 'id-of-your-banner-div',
			        mediaTypes: {
			          banner: {
			            sizes: [[300, 250], [300,600]]
			          }
			        },
                    bids: [{
                        bidder: 'newspassid',
                        params: {
                            publisherId: 'NEWSPASS0001', /* an ID to identify the publisher account  - required */
                            siteId: '4204204201', /* An ID used to identify a site within a publisher account - required */
                            placementId: '8000000015', /* an ID used to identify the piece of inventory - required - for appnexus test use 13144370. */
							customData: [{"settings": {}, "targeting": {"key": "value", "key2": ["value1", "value2"]}}],/* optional array with 'targeting' placeholder for passing publisher specific key-values for targeting. */                            
                        }
                    }]
                }];
```

### Note:

Please contact us at techsupport@newspassid.com for any assistance testing your implementation before going live into production.
