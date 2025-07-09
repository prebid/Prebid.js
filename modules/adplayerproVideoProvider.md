# Overview

Module Name: AdPlayer.Pro Video Provider
Module Type: Video Submodule
Video Player: AdPlayer.Pro
Player website: https://adplayer.pro
Maintainer: support@adplayer.pro

# Description

Video provider to connect the Prebid Video Module to AdPlayer.Pro.

# Requirements

Your page must embed a build of AdPlayer.Pro. 
i.e.
```html
<head> 
    <script  src="https://serving.stat-rock.com/player/prebidAdPlayerPro.js"></script>
</head>
```

# Configuration

The AdPlayer.Pro Video Provider requires the following configuration:

```javascript
pbjs.setConfig({
  video: {
    providers: [{
      divId: 'player', // required, this is the id of the div element where the player will be placed
      vendorCode: 3, // AdPlayer.Pro vendorCode
      playerConfig: {
        placementId: 'c9gebfehcqjE', // required, this placementId is only for demo purposes
        params: {
          'type': 'inView',
          'muted': true,
          'autoStart': true,
          'advertising': {
            'controls': true,
            'closeButton': true,
          },
          'width': '600',
          'height': '300'
        }
      },
    }]
  }
});
```

[Additional embed instructions](https://docs.adplayer.pro)

[Obtaining a license](https://adplayer.pro/contacts) 
