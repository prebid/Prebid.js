# schain module

Aggregators who manage Prebid wrappers on behalf of multiple publishers need to declare their intermediary status in the Supply Chain Object.  
As the spec prohibits us from adding upstream intermediaries, Prebid requests in this case need to come with the schain information.
In this use case, it's seems cumbersome to have every bidder in the wrapper separately configured the same schain information.

Refer:
- https://iabtechlab.com/sellers-json/
- https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md 
 
## Sample code for passing the schain object
```
pbjs.setConfig( {
    "schain": {
		"ver":"1.0",
		"complete": 1,
		"nodes": [
		    {
			   "asi":"indirectseller.com",
			   "sid":"00001",
			   "hp":1
		    },

            {
			   "asi":"indirectseller-2.com",
			   "sid":"00002",
			   "hp":2
		    },
		]     
	}
});
```

## Workflow
The schain module is not enabled by default as it may not be neccessary for all publishers.
If required, schain module can be included as following
```
    $ gulp build --modules=schain,pubmaticBidAdapter,openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter
```
The schian module will validate the schain object passed using pbjs.setConfig API.
If the schain object is valid then it will be passed on to bidders/adapters in ```validBidRequests[].schain```
You may refer pubmaticBidAdapter implementaion for the same.