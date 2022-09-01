# Overview

```
Module Name: Video Heroes Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@videoheroes.tv
```

# Description

Module which connects to VideoHeroes SSP demand sources

# Test Parameters

250x300 banner test
```
var adUnits = [{
  code: 'videoheroes-prebid',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'videoheroes',
    params : {
      placementId : "1a8d9c22db19906cb8a5fd4518d05f62" // test placementId, please replace after test
    }
  }]
}];
```

native test
```
var adUnits = [{
  code: 'videoheroes-native-prebid',
  mediaTypes: {
    native: {
      title: {
        required: true,
        len: 800
      },
      image: {
        required: true,
        len: 80
      },
      sponsoredBy: {
          required: true
      },
      clickUrl: {
          required: true
      },
      privacyLink: {
          required: false
      },
      body: {
          required: true
      },
      icon: {
          required: true,
          sizes: [50, 50]
      }
    }
  },
  bids: [{
      bidder: 'videoheroes',
      params: {
        placementId : "1a8d9c22db19906cb8a5fd4518d05f62" // test placementId, please replace after test
      }
  }]
}];
```

video test
```
var adUnits = [{
  code: 'videoheroes-video-prebid',
  mediaTypes: {
    video: {
      minduration:1,
      maxduration:999,
      boxingallowed:1,
      skip:0,
      mimes:[
          'application/javascript',
          'video/mp4'
      ],
      playerSize: [[768, 1024]],
      protocols:[
          2,3
      ],
      linearity:1,
      api:[
          1,
          2
      ]
    }
  },
  bids: [{
      bidder: 'videoheroes',
      params: {
        placementId : "1a8d9c22db19906cb8a5fd4518d05f62" // test placementId, please replace after test
      }
  }]
}];
```

# Bid Parameters
## Banner

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `placementId` | required | String | The placement ID from Video Heroes  | "1a8d9c22db19906cb8a5fd4518d05f62"


# Ad Unit and page Setup:

```html
 <!-- Prebid Config section -->
 <script>
     var PREBID_TIMEOUT = 700;
     var adUnits = [{
         code: 'videoheroes-prebid',
         sizes: [[300, 250]],
         bids: [{
            bidder: 'videoheroes'
            placementId : "PUT_YOUR_videoheroes_placementId",
         }]
     }];
    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];
</script>
<!-- End Prebid Config section -->
```
