# schain module

Aggregators who manage Prebid wrappers on behalf of multiple publishers and handle payment on behalf of the publishers
need to declare their intermediary status in the Supply Chain Object.  As the Supply Chain Object spec prohibits SSPs from adding
upstream intermediaries, Prebid requests in this case need to come with the schain information.  In this use case, it's cumbersome
to have every bidder in the wrapper separately configured the same schain information.

Refer:
- https://iabtechlab.com/sellers-json/
- https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md

## Sample code for passing the schain object
```
pbjs.setConfig( {
    "schain": {
    	"validation": "strict",
    	"config": {
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
				   "hp":1
			    }
			]
		}
	}
});
```

## Workflow
The schain module is not enabled by default as it may not be necessary for all publishers.
If required, schain module can be included as following
```
    $ gulp build --modules=schain,pubmaticBidAdapter,openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter
```
The schain module will validate the schain object passed using pbjs.setConfig API.
If the schain object is valid then it will be passed on to bidders/adapters in ```validBidRequests[].schain```
You may refer pubmaticBidAdapter implementaion for the same.

## Validation modes
- ```strict```: It is the default validation mode. In this mode, schain object will not be passed to adapters if it is invalid. Errors are thrown for invalid schain object.
- ```relaxed```: In this mode, errors are thrown for an invalid schain object but the invalid schain object is still passed to adapters.
- ```off```: In this mode, no validations are performed and schain object is passed as is to adapters.
