# pubmaticAutoRefresh
- This module will work with GPT only.
- The module will refresh the GPT ad-slots as per the given config.
- Before refreshing GPT ad-slot, respective PBJS AdUnit is found by the module and new bids are fetched by PBJS and then the GPT ads-lot is refreshed, with a failsafe.


# Config
| Param               | Data type | Default value | Usage |
|---------------------|-----------|----------------|------------------------------------------|
| enabled             | boolean   | false | must be set to true to enable the module |
| maximumRefreshCount | int       | 999 | how many times the slot must be refreshed after it is rendered for the first time |
| countdownDuration   | int       | 30000 | time in milliseconds|
| startCountdownWithMinimumViewabilityPercentage | int (0-100) | 50 | the countDown will start when ad-slot will have viewability percenatge more than this. When set to 0 the count-down will start after rendering the creative, even when ad slot is not viewable. |
| refreshAdSlotWithMinimumViewabilityPercentage | int (0-100) | 50 | the ad slot will be refreshed only if it has viewability percenathge more than this value. When set to 0 the ad-slot will be refreshed even if it is not viewable|
| kvKeyForRefresh | string | 'pm-auto-refresh' | this key will be added on gptSlot with kvValueForRefresh value; set it to null to not set it |
| kvValueForRefresh | string | '1' | this value will be added for the key kvKeyForRefresh on the gptSlot |
| kvKeyForRefreshCount | string | 'pm-auto-refresh-count' | this key will be added on the gptSlot and its value will be the refresh count; set it to null to not set it |
| slotIdFunctionForCustomConfig | function | `(gpttSlot) => gptSlot.getSlotElementId()` | a function; if you are using customConfig for some gptSlots then we need a way to find name of the gptSlot in customConfig |
| callbackFunction | function | `(gptSlotName, gptSlot, pbjsAdUnit, KeyValuePairs) => { performs pbjs auction, sets kvs, refreshes GPT slot}` | the default callback function, if you set own callback function then you will need to take care of initiating Prebid auction, setting KVs and refresing GPT slot |
| gptSlotToPbjsAdUnitMapFunction | function | `(gptSlot) => (gptSlot.getAdUnitPath() === pbjsAU.code || gptSlot.getSlotElementId() === pbjsAU.code)` | this function will help find the GPT gptSlots matching PBJS AdUnit |
| excludeCallbackFunction | function | `(gptSlotName, gptSlot, event) => { return true if gptSlotName is found in config.excludeSlotIds else return true if gptSlot size is found in config.excludeSizes else return false }` | if this function returns true then we will ignore the gptSlot and not try to refresh it. the lats argument, event, is the GPT's `slotRenderEnded` related data as mentioned at https://developers.google.com/publisher-tag/reference#googletag.events.slotrenderendedevent |
| excludeSlotIds | array of strings | undefined | in excludeCallbackFunction we will look into this array for gptSlotId if found then the gptSlot will be ignored |
| excludeSizes | array of strings | undefined | in excludeCallbackFunction we will look into the array of supported sizes for gptSlot size WxH (300x250) if found then the gptSlot will be ignored |
| customConfig | Object | undefined | if you want to have seperate value for any of the following supported configs for any gptAdSlot then you can enter it here. Supported custom configs ` maximumRefreshCount, countdownDuration, startCountdownWithMinimumViewabilityPercentage, refreshAdSlotWithMinimumViewabilityPercentage, kvKeyForRefresh, kvValueForRefresh, kvKeyForRefreshCount, callbackFunction, gptSlotToPbjsAdUnitMapFunction, excludeCallbackFunction ` Example: `{ 'Div-1' : { maximumRefreshCount: 5 }, 'Div-Top-1': { countdownDuration: 50000 } }` |


# Use Cases

- Simply enable the module with default config
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true
    }
});

```

- Refresh all GPT ad-slots after every 20 seconds
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        countdownDuration: 20000
    }
});

```

- Refresh all GPT ad-slots after 20 seconds, maximum 2 times
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        countdownDuration: 20000,
        maximumRefreshCount: 2
    }
});

```

- Refresh all GPT ad-slots after 20 seconds but only if GPT ad-slot is in view 100%
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        countdownDuration: 20000,
        refreshAdSlotWithMinimumViewabilityPercentage: 100 // or set to 50 for partially visible        
    }
});
```


- Refresh all GPT ad-slots but only after the slot is 100% viewed by the user, refresh after 20 seconds
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        countdownDuration: 20000,
        startCountdownWithMinimumViewabilityPercentage: 100 // or set to 50 for partially visible        
    }
});
```

- Refresh all GPT ad-slots but only after the slot is 100% viewed by user, refresh after 20 seconds but when GPT ad-slot is 100% in view
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        countdownDuration: 20000,
        startCountdownWithMinimumViewabilityPercentage: 100, // or set to 50 for partially visible  
        refreshAdSlotWithMinimumViewabilityPercentage: 100 // or set to 50 for partially visible              
    }
});
```

- Refresh the GPT ad-slots after rendering (even if not viewed) and even when the ad-slot is not in the view
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        startCountdownWithMinimumViewabilityPercentage: 0, // or set to 50 for partially visible  
        refreshAdSlotWithMinimumViewabilityPercentage: 0 // or set to 50 for partially visible              
    }
});
```

- Do not refresh GPT slot rendering in Div `DIV-100`
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        excludeSlotIds: [ 'Div-100']
    }
});
```

- Do not refresh GPT ad slot with given sizes (if any one size matches then slot will not be refreshed)
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        excludeSizes: [ '300x250', '300x300']
    }
});
```

- Do not refresh GPT ad slot that matches my custom logic
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        excludeCallbackFunction: function(gptSlotName, gptSlot, event){
        	// gptSlotName is derived as per slotIdFunctionForCustomConfig
        	// custom logic goes here
        	// return true to exclude
        	// return false to not exclude
        }
    }
});
```

- Do not refresh GPT ad slot if GPT creativeId = 1234, refer https://developers.google.com/publisher-tag/reference#googletag.events.slotrenderendedevent for `event` specification

```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        excludeCallbackFunction: function(gptSlotName, gptSlot, event){
            if(event.creativeId === 1234){
                console.log('excludeCallbackFunction, returning true as creativeId is 1234');
                return true;
            }
            return false;
        }
    }
});

```

- Change key value pairs to be used
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        kvKeyForRefresh: 'autorefresh',
        kvValueForRefresh: 'true',
        kvKeyForRefreshCount: 'autorefreshcnt'
    }
});
```


- Refresh all ad-slots with default countdownDuration, but for Div-1 and Div-2 use countdownDuration = 10000
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        customConfig: {
        	'Div-1': {
        		countdownDuration: 10000
        	},
        	'Div-2': {
        		countdownDuration: 10000
        	}
        }
    }
});
```

- Change logic to generate gptSlotName, default is SlotElementId, change it to AdUnitPath. Before making any change please check the current implementation in the module.
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        slotIdFunctionForCustomConfig: function(gptSlot){ 
            return gptSlot.getAdUnitPath() 
        }
    }
});
```

- Change logic to find respective PBJS adUnit for my GPT ad-slot, this helps to find relation between gptSlot and pbjsAdUnit. Before making any change please check the current implementation in the module.
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        gptSlotToPbjsAdUnitMapFunction: function(gptSlotName, gptSlot, pbjsAU) {
            return ( ("PBJS_" + gptSlot.getAdUnitPath()) === pbjsAU.code)
        }
    }
});
```

- Change Callback function to take control of refreshing GPT ad-slot. Before making any change please check the current implementation in the module.
```
pbjs.setConfig({
    'pubmaticAutoRefresh': {
        enabled: true,
        callbackFunction: function(gptSlotName, gptSlot, pbjsAdUnit, KeyValuePairs) {
            // set KeyValuePairs on gptSlot
            // init pbjs auction for pbjsAdUnit
            // after pbjs auction ends call the GAM for gptSlot
            // you may want to failsafe as well
        }
    }
});
```

# Drwaback
- only onle slot is handled at a time
-  if GAM slot is not filled by any creative (including GAM in-house cratives) then GPT does not trigger the required event hence our module will not be able to refresh such slot