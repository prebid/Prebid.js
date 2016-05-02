[![Build Status](https://travis-ci.org/prebid/Prebid.js.svg?branch=master)](https://travis-ci.org/prebid/Prebid.js)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Percentage of issues still open")
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Average time to resolve an issue")

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

**Include the prebid.js library**
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
By default console errors are suppressed. To enabled add `?pbjs_debug=true` to the end of the URL
 for testing.

API
----------
Full Developer API reference:

[Click here to access the API](http://prebid.org/dev-docs/publisher-api-reference.html)

Contribute
----------
**Note:** You need to have at least `node.js 4.x` or greater installed to be able to run the gulp build commands.

### Add a Bidder Adapter ###
Follow the [guide outlined here](http://prebid.org/dev-docs/bidder-adaptor.html) to add an adapter.

### Install ###
    $ npm install

If you experience errors, after a version update, try a fresh install:

    $ rm -rf ./node_modules && npm cache clean && npm install

### Build ###
    $ gulp build

Runs code quality checks, generates prebid.js files and creates zip archive distributable:

   `./build/dev/prebid.js` Full source code for dev and debug
    `./build/dev/prebid.js.map` Source map for dev and debug
    `./build/dist/prebid.js` Minified production code
    `./prebid.js_<version>.zip` Distributable

Code quality is defined by `./.jscs` and `./.jshint` files and errors are reported in the
terminal. The build will continue with quality errors, however. If you are contributing code
you can configure your editor with the provided .jscs and .jshint settings.

### Configure ###
Edit example file `./integrationExamples/gpt/pbjs_example_gpt.html`:

1. Change `{id}` values appropriately to set up ad units and bidders.

1. Set path for prebid.js in your example file:
   #####Development `pbs.src = './build/dev/prebid.js';` #####
    ```javascript
    (function() {
            var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
            pbs.type = 'text/javascript';
            pbs.src = ((pro === 'https:') ? 'https' : 'http') + ':./build/dev/prebid.js';
            var target = document.getElementsByTagName('head')[0];
            target.insertBefore(pbs, target.firstChild);
    })();
    ```
   #####Test/Deploy (default) `pbs.src = './build/dist/prebid.js';`#####
    ```javascript
    (function() {
            var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
            pbs.type = 'text/javascript';
            pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dist/prebid.js';
            var target = document.getElementsByTagName('head')[0];
            target.insertBefore(pbs, target.firstChild);
    })();
    ```
1. (optional optimization) Edit `./package.json` to set the adapters you want to build with:

    ```json
        "adapters": [
            "adform",
            "aol",
            "appnexus",
            "indexExchange",
            "openx",
            "pubmatic",
            "pulsepoint",
            "rubicon",
            "rubiconLegacy",
            "sovrn",
            "springserve",
            "yieldbot"
  ]
    ```

### Run ###

    $ gulp serve

This runs code quality checks, generates prebid files and starts a webserver at
`http://localhost:9999` serving from project root. Navigate to your example implementation to test,
and if your prebid.js file is sourced from the `./build/dev` directory you will have sourcemaps
available in browser developer tools.

Navigate to `http://localhost:9999/integrationExamples/gpt/pbjs_example_gpt.html` to run the
example file.

Navigate to `http://localhost:9999/build/coverage/karma_html/report` to view a test coverage report.

A watch is also in place that will run continuous tests in the terminal as you edit code and
tests.

### Unit Test In the Browser ###
    $ gulp test --watch

This will run tests and keep the Karma test browser open. If your prebid.js file is sourced from
the build/dev directory you will also have sourcemaps available when viewing browser developer
tools. Access the Karma debug page at:
`http://localhost:9876/debug.html`
View console for test results and developer tools to set breakpoints in source code.

Detailed code coverage reporting can be generated explicitly with `$ gulp test --coverage` and
results found in `./build/coverage`.

### Supported Browsers ###
Prebid.js is supported on IE9+ and modern browsers.
