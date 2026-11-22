Test Page - 'test/pages/triplelift_banner.html'
Test Spec File - 'test/spec/e2e/triplelift_banner/basic_banner_ad.spec.js'

Ad Unit that generates given 'Request' - 'Response' pairs.

The new Triplelift adapter builds its request with the ortb converter, so `imp[].id` is
the Prebid `bidId`. The responder (`test/fake-server/responders/triplelift.js`) strips 
`imp[].id` and `tid` before matching this request, and resolves `imp_id` in `response.json` 
- written there as the *index* of the imp being bid on - to that imp's real id before replying.

```(javascript)
[{
			code: 'div-gpt-ad-1460505748561-0',
			mediaTypes: {
				banner: {
					sizes: [[300, 250], [300, 600]],
				}
			},
			bids: [{
				bidder: 'triplelift',
				params: {
					inventoryCode: "test_inventory_code",
					parentId: "test_parent_id"
				}
			}]
		 }
		,{
			code: 'div-gpt-ad-1460505748561-1',
			mediaTypes: {
				banner: {
					sizes: [[300, 250], [300, 600]],
				}
			},
			bids: [{
				bidder: "triplelift",
				params: {
					inventoryCode: "test_inventory_code",
					parentId: "test_parent_id"
				}
			}]
		}
	];
```
