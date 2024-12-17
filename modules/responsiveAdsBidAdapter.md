# Overview

```markdown
Module Name: responsiveAdsBidAdapter
Module Type: Bidder Adapter
Maintainer: support@responsiveads.com
```


# Description
Module that connects to ResponsiveAds Programmatic Fluid demand.


## Running the code
To view an example of the on page setup required:

```bash
gulp serve-and-test --file test/spec/modules/responsiveAdsBidAdapter_spec.js
```

# Test Parameters
```
var adUnits = [{
    code: 'div-gpt-ad-1460505748561-0',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    },

    // Replace this object to test a new Adapter!
    bids: [{
        bidder: 'responsiveads',
        params: {}
    }]

}];
```
