## userIdTargeting Module
- This module works with userId module.
- This module is used to pass userIds to GAM in targeting so that user ids can be used to pass in Google Exchange Bidding or can be used for targeting in GAM.

## Sample config
```
pbjs.setConfig({

	// your existing userIds config

	usersync: {
		userIds: [{...}, ...]
	},

	// new userIdTargeting config

	userIdTargeting: {
		"GAM": true,
		"GAM_KEYS": {
			"tdid": "TTD_ID" // send tdid as TTD_ID
		}
	}
});
```

## Config options
- GAM: is required to be set to true if a publisher wants to send UserIds as targeting in GAM call. This module uses ``` googletag.pubads().setTargeting('key-name', ['value']) ``` API to set GAM targeting.
- GAM_KEYS: is an optional config object to be used with ``` "GAM": true ```. If not passed then all UserIds are passed with respective key-name used in UserIds object.
If a publisher wants to pass ```UserId.tdid``` as TTD_ID in targeting then set  ``` GAM_KEYS: { "tdid": "TTD_ID" }```
If a publisher does not wants to pass ```UserId.tdid``` but wants to pass other Ids in UserId tthen set ``` GAM_KEYS: { "tdid": "" }```

## Including this module in Prebid
``` $ gulp build --modules=userId,userIdTargeting,pubmaticBidAdapter ```

## Notes
- We can add support for other external systems like GAM in future
- We have not added support for A9/APSTag as it is called in parallel with Prebid. This module executes when ```pbjs.requestBids``` is called, in practice, call to A9 is expected to execute in paralle to Prebid thus we have not covered A9 here. For sending Uids in A9, one will need to set those Ids in params key in the object passed to ```apstag.init```, ```pbjs.getUserIds``` can be used for the same.
