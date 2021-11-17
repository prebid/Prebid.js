---
layout: bidder
title: ventes
description: Prebid ventes Bidder Adapter
pbjs: false
biddercode: ventes
gdpr_supported: false
usp_supported: false
media_types: banner
coppa_supported: false
schain_supported: false
dchain_supported: false
prebid_member: false
---

### BidParams
{: .table .table-bordered .table-striped }
| Name            | Scope    | Description                                		 | Example                      		| Type          |
|-----------------|----------|-----------------------------------------------------------|----------------------------------------------|---------------|
| `placementId`   | required | Placement ID from Ventes Avenues 			 | `'VA-062-0013-0183'` 			| `string`	|
| `publisherId`   | required | Publisher ID from Ventes Avenues 			 | `'VA-062'` 					| `string`	|
| `user`          | optional | Object that specifies information about an external user. | `user: { age: 25, gender: 0, dnt: true}` 	| `object`	|
| `app`           | optional | Object containing mobile app parameters.  		 | `app : { id: 'app-id'}`			| `object`	|

#### User Object

{: .table .table-bordered .table-striped }
| Name              | Description 										| Example		| Type             	|
|-------------------|-------------------------------------------------------------------------------------------|-----------------------|-----------------------|
| `age`             | The age of the user.									| `35`			| `integer`		|
| `externalUid`     | Specifies a string that corresponds to an external user ID for this user. 		| `'1234567890abcdefg'`	| `string` 		|
| `segments`        | Specifies the segments to which the user belongs.						| `[1, 2]` 		| `Array<integer>`	|
| `gender`          | Specifies the gender of the user.  Allowed values: Unknown: `0`; Male: `1`; Female: `2`	| `1` 			| `integer`		|
| `dnt`             | Do not track flag.  Indicates if tracking cookies should be disabled for this auction	| `true`  	 	| `boolean`		|
| `language`        | Two-letter ANSI code for this user's language.						| `EN`			| `string`		|


### Ad Unit Setup for Banner
```javascript
var adUnits = [
{
  code: 'test-hb-ad-11111-1',
  mediaTypes: {
    banner: {  
      sizes: [
          [300, 250]
      ]
    }   
  }, 
  bids: [{
    bidder: 'ventes',
    params: {
        placementId: 'VA-062-0013-0183',
        publisherId: '5cebea3c9eea646c7b623d5e',
        IABCategories: "['IAB1', 'IAB5']",
        device:{
          ip: '123.145.167.189',
          ifa:"AEBE52E7-03EE-455A-B3C4-E57283966239",
        },
        app: {
          id: "agltb3B1Yi1pbmNyDAsSA0FwcBiJkfIUDA",
          name: "Yahoo Weather",
          bundle: 'com.kiloo.subwaysurf',
          storeurl: 'https://play.google.com/store/apps/details?id=com.kiloo.subwaysurf&hl=en',
          domain: 'somoaudience.com',
        } 
    }
  }]
 }
]
```
