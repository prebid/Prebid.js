# Overview

```
Module Name:  media.net Bid Adapter
Module Type:  Bidder Adapter
Maintainer: prebid-support@media.net
```

# Description

Connects to Media.net's exchange for bids.
This adapter currently only supports Banner Ads.

# Sample Ad Unit: For Publishers
```javascript
var adUnits = [{
	code: 'media.net-hb-ad-123456-1',
	mediaTypes: {
		banner: {
			sizes: [
				[728, 90],
				[300, 600],
				[300, 250]
			],
		}
	},
	bids: [{
		bidder: 'medianet',
		params: {
			cid: '<required-customerid-provided-by-media.net>',
			bidfloor: '<optional-float>',
			crid: '<required-pleacementid-provided-by-media.net>'
		}
	}]
}];
```

# Ad Unit and Setup: For Testing (Banner)

```html
 <!-- Prebid Config section -->
 <script>
var adUnits = [{
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizes: [
        [728, 90],
        [300, 600],
        [300, 250]
      ],
    }
  },
  bids: [{
    bidder: 'medianet',
    params: {
      cid: '8CUX0H51C',
      crid: '451466393',
      // Site member is to be used only for testing
      site: {
        page: 'http://smoketesting.net/prebidtest/',
        domain: 'smoketesting.net',
        ref: 'http://smoketesting.net/prebidtest/'
      }
    }
  }]
}];
</script>
<!-- End Prebid Config section -->
```

# Ad Unit and Setup: For Testing (Video Instream)

```html
<!-- Prebid Config section -->
 <script>
var videoAdUnit = {
  code: 'video1',
  mediaTypes: {
    video: {
      context: "instream",
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      placement: 1
    }
  },
  bids: [{
    bidder: 'medianet',
    params: {
      cid: '8CUX0H51C',
      crid: '776755783', 
      // Site member is to be used only for testing
      site: {
        page: 'http://smoketesting.net/prebidtest/',
        domain: 'smoketesting.net',
        ref: 'http://smoketesting.net/prebidtest/'
      }
    }
  }]
};
</script>
<!-- End Prebid Config section -->
```
# Ad Unit and Setup: For Testing (Video Outstream)

```html
 <!-- Prebid Config section -->
 <script>
var videoAdUnit = {
    code: 'video1',
    mediaTypes: {
        video: {
             context: "outstream",
             playerSize: [640, 480],
             mimes: ['video/mp4'],
             placement: 1
        }
    },
    /**
     *  At this time, since not all demand partners return a renderer with their video bid responses,
     *  we recommend that publishers associate a renderer with their Prebid video adUnits, if possible.
     *  By doing so, any Prebid adapter that supports video will be able to provide demand for a given outstream slot.
     */
    renderer: {
        url: '<Points to a URL containing the renderer script>',
        render: '<A function that tells Prebid.js how to invoke the renderer script>'
    },
    bids: [{
        bidder: 'medianet',
        params: {
            cid: '8CUX0H51C',
            crid: '776755783', 
            // Site member is to be used only for testing
            site: {
                page: 'http://smoketesting.net/prebidtest/',
                domain: 'smoketesting.net',
                ref: 'http://smoketesting.net/prebidtest/'
            }
        }
    }]
};
</script>
<!-- End Prebid Config section -->
```

# Ad Unit and Setup: For Testing (Native)

```html
 <!-- Prebid Config section -->
 <script>
var PREBID_TIMEOUT = 2000;
var adUnits = [{
  code: 'div-gpt-ad-1544091247692-0',
  mediaTypes: {
    native: {
      image: {
        required: true,
        sizes: [300, 250],
        wmin: 50,
      },
      title: {
        required: true,
        len: 80
      }
    }
  },
  bids: [{
    bidder: 'medianet',
    params: {
      cid: '8CUX0H51C',
      crid: '776755783',
      // Site member is to be used only for testing
      site: {
        page: 'http://smoketesting.net/prebidtest/',
        domain: 'smoketesting.net',
        ref: 'http://smoketesting.net/prebidtest/'
      }
    }
  }]
}];    
</script>
<!-- End Prebid Config section -->
```

# Protected Audience API (FLEDGE)

In order to enable PAAPI auctions follow the instructions below:

1. Add the fledgeForGpt and paapi modules to your prebid bundle.
2. Add the following configuration for the module
```
pbjs.que.push(function() {
  pbjs.setConfig({
    fledgeForGpt: {
      enabled: true,
      bidders: ['medianet'],
      defaultForSlots: 1
    }
  });
});
```

For a detailed guide to enabling PAAPI auctions follow Prebid's documentation on [fledgeForGpt](https://docs.prebid.org/dev-docs/modules/fledgeForGpt.html)
