# Overview

```
Module Name:  LoopMe Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@loopme.com
```

# Description

Connect to LoopMe's exchange for bids.

# Test Parameters (Banner)
```
var adUnits = [{
    code: 'banner1',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300,600]],
        }
    },
    bids: [{
        bidder: 'loopme',
        params: {
            bundleId: "bundleId",
            placementId: "placementId",
            publisherId: "publisherId"
        }
    }]
}];
```

# Test Parameters (Video)
```
var adUnits = [{
    code: 'video1',
    mediaTypes: {
        video: {
            playerSize: [640, 480],
            context: 'outstream'
        }
    },
    bids: [{
        bidder: 'loopme',
        params: {
            bundleId: "bundleId",
            placementId: "placementId",
            publisherId: "publisherId"
        }
    }]
}];
```

# Test Parameters (Native)
```
var adUnits = [{
    code: 'native1',
    mediaTypes: {
        native: {
            adTemplate: `<div class="sponsored-post" style="position: relative; width: 320px; height: 250px;">
                <div class="thumbnail" style="width: 320px; height: 250px; position: absolute; background-repeat: no-repeat; background-size: contain; background-image: url(##hb_native_asset_id_1##);"></div>
                <div class="content" style="position: absolute; bottom: 0; background-color: rgba(0,0,0,0.8); padding: 10px;">
                    <h4>
                        <a href="%%CLICK_URL_UNESC%%##hb_native_linkurl##" target="_blank" class="pb-click" style="color: yellow;" hb_native_asset_id="2">##hb_native_asset_id_2##</a>
                    </h4>
                    <p style="color: white;">##hb_native_asset_id_4##</p>
                    <div style="color: white;" class="attribution">##hb_native_asset_id_3##</div>
                </div>
            </div>`,
            image: {
                sendId: true,
                required: true
            },
            title: {
                required: true
            },
            body: {
                required: true
            }
        }
    },
    bids: [{
        bidder: 'loopme',
        params: {
            bundleId: "bundleId",
            placementId: "placementId",
            publisherId: "publisherId"
        }
    }]
}];
```

# Bid params
| Name          | Scope    | Description                            | Example                              |
|:--------------| :------- |:---------------------------------------|:-------------------------------------|
| `publisherId` | required | Manually set up publisher ID | `publisherId`|
| `bundleId` | required | Manually set up bundle ID | `bundleId`|
| `placementId` | optional | Manually set up placement ID | `placementId`|
