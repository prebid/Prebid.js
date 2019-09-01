## shareUserIds Module
- This module works with userId module.
- This module is used to pass userIds to DFP in targeting so that user ids can be used to pass in EB or can be used for targeting in DFP.

## Sample config
```
pbjs.setConfig({

	// your existing userIds config

	usersync: {
		userIds: [{...}, ...]
	},

	// new shareUserIds config

	shareUserIds: {
		"DFP": true,
		"DFP_KEYS": {
			"tdid": "TTD_ID" // send tdid as TTD_ID
		}
	}
});
```

## Config options
- DFP: is required to be set to true if a publisher wants to send UserIds as targeting in DFP call. This module uses ``` googletag.pubads().setTargeting('key-name', ['value']) ``` API to set DFP targeting.
- DFP_KEYS: is an optional config object to be used with ``` "DFP": true ```. If not passed then all UserIds are passed with key-name used in UserIds object.
If a publisher wants to pass ```UserId.tdid``` as TTD_ID in targeting then set  ``` DFP_KEYS: { "tdid": "TTD_ID" }```
If a publisher does not wants to pass ```UserId.tdid``` but wants to pass other Ids in UserId tthen set ``` DFP_KEYS: { "tdid": "" }```

## Including this module in Prebid
``` $ gulp build --modules=userId,shareUserIds ```

## Notes
- We can add support for other external systems like DFP in future
- We have not added support for A9/APSTag as it is call in parallel with Prebid. This module executes when ```pbjs.requestBids``` is called, in practice call to A9 is expected to execute in paralle to Prebid thus we have not covered A9 here. For sending Uids in A9 one will need to set those in params key in object passed to ```apstag.init```, ```pbjs.getUserIds``` can be used for the same. 