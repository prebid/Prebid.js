# Overview

Module Name: bidViewabilityIO

Purpose: Emit a BID_VIEWABLE event when a bid becomes viewable using the browsers IntersectionObserver API

Maintainer: adam.prime@alum.utoronto.ca

# Description
- This module will trigger a BID_VIEWABLE event which other modules, adapters or publisher code can use to get a sense of viewability
- You can check if this module is part of the final build and whether it is enabled or not by accessing ```pbjs.getConfig('bidViewabilityIO')```
- Viewability, as measured by this module is not perfect, nor should it be expected to be. 
- The module does not require any specific ad server, or an adserver at all.

# Limitations

- Currently only supports the banner mediaType
- Assumes that the adUnitCode of the ad is also the id attribute of the element that the ad is rendered into.
- Does not make any attempt to ensure that the ad inside that element is itself visible. It assumes that the publisher is operating in good faith.

# Params
- enabled [required] [type: boolean, default: false], when set to true, the module will emit BID_VIEWABLE when applicable

# Example of consuming BID_VIEWABLE event
```
	pbjs.onEvent('bidViewable', function(bid){
		console.log('got bid details in bidViewable event', bid);
	});

```

# Example of using config
```
	pbjs.setConfig({
        bidViewabilityIO: {
            enabled: true,
        }
    });
```

An example implmentation without an ad server can be found in integrationExamples/postbid/bidViewabilityIO_example.html
