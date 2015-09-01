Prebid.js
========

> Setup and manage header bidding advertising partners without writing code or confusing line items. Prebid.js is open source and free.

Many SSPs, bidders, and publishers have all contributed to this project. 

Check out the overview and documentation at http://prebid.org. 

No more week-long development. Header bidding is made easy by prebid.js :)

**Table of Contents** 

- [Prebid.js](#)
	- [Usage](#usage)
		- [Example code](#example-code)
	- [Contribute](#contribute)
		- [Add an Bidder Adapter](#add-an-bidder-adapter)
		- [install](#install)
		- [Build](#build)
		- [Configure](#configure)
		- [Run](#run)

	
Usage
----------
Download the integration example [here](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/pbjs_example_gpt.html). 

### Example code ###

**Include the prebid.js libraray**
```javascript
(function() {
        var d = document, pbs = d.createElement('script'), pro = d.location.protocal;
        pbs.type = 'text/javascript';
        pbs.src = ((pro === 'https:') ? 'https' : 'http') + '://cdn.host.com/prebid.min.js';
        var target = document.getElementsByTagName('head')[0];
        target.insertBefore(pbs, target.firstChild);
})();
```

**Setup ad units**
```javascript
pbjs.que.push(function(){
	var adUnits = [{
        code: '{id}',
        sizes: [[300, 250], [300, 600]],
        bids: [
            {
                bidder: 'amazon',
                params: {
                    aid: '{id}'
                }
            },
            {
                bidder: 'appnexus',
                params: {
                    placementId: '{id}'
                }
            }
        ]
    }];
	//add the adUnits
    pbjs.addAdUnits(adUnits);
    }];
```

**Request Bids**
```javascript
pbjs.que.push(function(){
    pbjs.requestBids({
        bidsBackHandler: function(bidResponses) {
            //do stuff when the bids are back
        }
    })
});
```
Contribute
----------

### Add an Bidder Adapter ###
Follow the [guide outlined here](http://prebid.org/bidder-adaptor.html) to add an adapter. 

### install ###
	$ sudo npm install

### Build ###
	$ gulp build

### Configure ###
Edit `./integrationExamples/gpt/pbjs_example_gpt.html`

Change `{id}` values appropriately 
	
### Run ###

	$ gulp serve

Navigate to http://localhost:9999/integrationExamples/gpt/pbjs_example_gpt.html to run the example file
