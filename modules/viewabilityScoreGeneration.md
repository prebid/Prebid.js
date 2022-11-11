# Overview

Module Name: viewabilityScoreGeneration

Purpose: Track when an ad unit has been rendered, viewed and also measure how long it was visible in the viewport.

Maintainer: jason.quaccia@pubmatic.com

# Description
- When included and enabled on a publisher page, this module will initialize and wait for the Prebid.js `AUCTION_INIT` event to occur, once it does an integration with the GPT API will be made by setting up event listeners for the following GPT events: `slotRenderEnded`, `impressionViewable`, and `slotVisibilityChanged`
	- Additionally, a hook to the Prebid.js `makeBidRequests` function will be created and get invoked immediately after the Prebid `makeBidRequests` function gets invoked
- As the web page loads, the `slotRenderEnded` event will be emitted as an ad slot is rendered regardless of if it is viewable within the browser viewport or not
- `localStorage` is then referenced to see if an entry for the newly rendered ad slot exists yet or not
	- if it doesn't an entry gets added and data is collected stating the ad was rendered
	- if it does, the existing entry is updated and the render count is incremented
- The same process occurs when the `impressionViewable` event is emitted (when an ad slot was visible within the browser viewport), except the view count is recorded
- The `slotVisibilityChanged` event is triggered on scroll when an ad slot becomes at least 50% visible within the viewport
	- If this occurs `localStorage` is referenced to find the ad slot's entry and determine if the ad slot was viewed already or not
		- if not, the time the slot was viewed is noted
		- if viewed already, the ad slot's total view time is calculated by `totalViewTime = totalViewTime + (currentTime - lastViewedTime)`
- As the 3 GPT events mentioned above occur, the relative ad slot entries in `localStorage` will continually be updated
- The `makeBidRequests` hook mentioned above will have access to all created bid requests and will add a `bidViewability` object to every request based on the relative ad slot entry from `localStorage`
	- This `bidViewability` data will now be available to all bidders allowing freedom to do what they want with it

# localStorage

All viewability data is stored and persisted in browser via `localStorage`.

#### Viewability Data Object
|Parameter|Type|Description|
| - | - | - |
|adSlotElementId|string|HTML id attribute value of the element an ad slot is rendered in
|rendered|number|Keeps track of how many times an ad slot was rendered on an HTML page regardless of if it is visible in the viewport or not
|viewed|number|Keeps track of how many times an ad slot was viewed within the viewport
|lastViewed|number|Measures the amount of time in milliseconds since a webpage has loaded (utilizes the Performance.now method native to the browser).  This value is used as a reference for the last time an ad slot was at least 50% visible within the viewport.
|totalViewTime|number|Measures the total dwell time of an ad slot in seconds (totalViewTime = totalViewTime + (currentTime - lastViewed)
|createdAt|number|Numeric timestamp indicating the time when the ad slot entry was initially created in `localStorage`
|updatedAt|number|Numeric timestamp indicating the time when the ad slot entry was last updated

#### Example
```
'viewability-data': {
	"/43743431/DMDemo": {
		createdAt: 1666155076240
		lastViewed: 3171.100000023842
		rendered: 131
		totalViewTime: 15468
		updatedAt: 1666296333802
		viewed: 80
	}
}
```

# Setup
```
pbjs.setConfig({
	viewabilityScoreGeneration: {
		enabled:  true,
		targeting: {
			enabled:  true,
			score: false,
			scoreKey:  'viewScore',
			bucket: true,
			bucketKey:  'bucketScore',
			bucketCategories: ['VERY LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY HIGH']
		}
	},
});
```
|Parameter|Type|Description|Default|
| - | - | - | - |
|enabled|boolean|Determine whether the entire viewabilityScoreGeneration module is on or off.|false|
|targeting.enabled|boolean|Turns on/off feature support to add additional targeting key/value pairings to be sent to GAM.  When enabled the `bidViewabilityScore` and `bidViewabilityBucket` K/V's will be sent (providing custom key names weren't designated via the `targeting.scoreKey` or `targeting.bucketKey` config options.|false|
|targeting.score|boolean|Ability to optionally pass/not pass the viewability score key/value pairing to GAM.|true|
|targeting.scoreKey|string|Optional custom key name to be used when sending the viewabiilty score to GAM.|`bidViewabilityScore`|
|targeting.bucket|string|Ability to optionally pass/not pass the viewability bucket key/value pairing to GAM.|true|
|targeting.bucketKey|string|Optional custom key name to be used when sending the viewabiilty bucket to GAM.|`bidViewabilityBucket`|
|targeting.bucketCategories|string[]|Select the bucket category names you would like to map viewability scores to (must be in ascending order).|`['LOW', 'MEDIUM', 'HIGH']`|

# Targeting:
When enabled, the Prebid JS `AUCTION_END` event is listened for and once emitted, the following Key/Value pairings will be configured and passed with selected bids with GAM requests:

#### Bid Viewability Score
- Calculates the following for an ad slot: `viewCount / renderCount` (rounded to one decimal place)
- Example: `bidViewabilityScore=0.7`

#### Bid Viewability Bucket
- Determines what viewability bucket an ad slot fits in to based on it's viewability score and the bucketCategories designated in the config. Bucket category ranges will automatically be calculated based upon the number of categories specified in the config (everything will be rounded to 1 decimal place).
- Example: If bucketCategories is set to ['VERY LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY HIGH'] and an ad slot has a viewability score of 0.3, the logic would be as follows:
    - 'VERY LOW' = 0 - 0.2
    - 'LOW' = 0.21 - 0.4
    - 'MEDIUM' = 0.41 - 0.6
    - 'HIGH' = 0.61 - 0.8
    - 'VERY HIGH' = 0.81 - 1
- Result `bidViewabilityScore=LOW`

# Dynamic Floors:
Set dynamic floors based on viewability buckets with custom matchers.
```
pbjs.setConfig({
	viewabilityScoreGeneration: {
		enabled:  true,
		targeting: {
			enabled:  true,
			score: false,
			scoreKey:  'viewScore',
			bucket: true,
			bucketKey:  'bucketScore',
			bucketCategories: ['VERY LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY HIGH']
		}
	},
	floors: {
		enforcement: {
			floorDeals:  false
		},
		floorMin:  0.01,
		data: {
			floorProvider :  'pubmatic',
			skipRate :  0,
			currency:  'USD',
			schema: {
				fields: ['mediaType', 'bidViewabilityBucketing']
			},
			modelVersion :  'testAddtionalFields',
			values : {
				'banner|HIGH' :  0.16,
				'banner|MEDIUM' :  0.10,
				'banner|LOW' :  0.03,
				'banner|*' :  0.02,
				'*|*' :  0.01
			}
		},
		additionalSchemaFields : {
			bidViewabilityBucketing :  getBidViewabilityBucketsPerBidRequest
		}
	}
});

function  getBidViewabilityBucketsPerBidRequest (bidRequest, bidResponse) {
	let  visibilityObj  =  JSON.parse(localStorage.getItem('viewability-data'));
	let  result  =  false;

	if (visibilityObj  &&  visibilityObj[bidRequest.adUnitCode]) {
		const  bidViewabilityScore  =  Math.round((visibilityObj[bidRequest.adUnitCode].viewed  / visibilityObj[bidRequest.adUnitCode].rendered) *  10) /  10;
		const  bidViewabilityBucket  =  bidViewabilityScore  >  0.7  ?  'HIGH'  :  bidViewabilityScore  <  0.5  ?  'LOW'  :  'MEDIUM';

		result  =  bidViewabilityBucket;
	}

	return  result;
}
```

# Please Note:
- This module enables availability of viewability data on all Prebid JS bid requests to SSP's.  Further integration to do what you want with that data is required.
- Doesn't seems to work with Instream Video, https://docs.prebid.org/dev-docs/examples/instream-banner-mix.html as GPT's impressionViewable event is not triggered for instream-video-creative
- Works with Banner, Outsteam, Native creatives

# Open Questions:
- Should there be a limit to the amount of bucket categories that a publisher can configure?
