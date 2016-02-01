Prebid.js
========

> Setup and manage header bidding advertising partners without writing code or confusing line items. Prebid.js is open source and free.

Many SSPs, bidders, and publishers have all contributed to this project. 

Check out the overview and documentation at http://prebid.org. 

No more week-long development. Header bidding is made easy by prebid.js :)

**Table of Contents** 

- [Prebid.js](#)
    - [Usage](#usage)
        - [Download the latest released code](#download-the-latest-released-code)
        - [Example code](#example-code)
    - [API](#api)
    - [Contribute](#contribute)
        - [Add an Bidder Adapter](#add-an-bidder-adapter)
        - [install](#install)
        - [Build](#build)
        - [Configure](#configure)
        - [Run](#run)

    
Usage
----------
Download the integration example [here](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/pbjs_example_gpt.html). 

### Download the latest released code ###
[See the releases page here](https://github.com/prebid/Prebid.js/releases) and download a copy.

### Example code ###

**Include the prebid.js libraray**
Note that you need to host `prebid.js` locally or on a CDN and update the reference in the code snippet below for `cdn.host.com/prebid.min.js
```javascript
(function() {
        var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
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
                bidder: 'appnexus',
                params: {
                    placementId: '{id}'
                }
            }
        ]
    }];
    //add the adUnits
    pbjs.addAdUnits(adUnits);
});
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

**See Console Debug Errors during testing**
By default console errors are supressed. To enabled add `?pbjs_debug=true` to the end of the URL for testing. 

API
----------
Full Developer API reference:

[Click here to access the API](http://prebid.org/dev-docs/publisher-api-reference.html)

Contribute
----------

### Add an Bidder Adapter ###
Follow the [guide outlined here](http://prebid.org/dev-docs/bidder-adaptor.html) to add an adapter. 

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

### Unit Test In the Browser ###

Navigate to http://localhost:9999/build/coverage/karma_html/report to view test results.

### Supported Browsers ###
Prebid.js is supported on IE9+ and modern browsers.