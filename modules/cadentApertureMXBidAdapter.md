# Overview

```
Module Name:  Cadent Aperture MX Adapter
Module Type:  Bidder Adapter
Maintainer: contactaperturemx@cadent.tv
```

# Description

The Cadent Aperture MX adapter provides publishers with access to the Cadent Aperture MX SSP. The adapter is GDPR compliant. Please note that the adapter supports Banner and Video (Instream & Outstream) media types.

Note: The Cadent Aperture MX adapter requires approval and implementation guidelines from the Cadent team, including existing publishers that work with Cadent. Please reach out to your account manager or contactaperturemx@cadent.tv for more information.

The bidder code should be ```cadent_aperture_mx```
The params used by the bidder are :
```tagid``` - string (mandatory)
```bidfloor``` - string (optional)

# Test Parameters
```
var adUnits = [{
    code: 'banner-div',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250], [300, 600]
        }
    },
    bids: [
    {
        bidder: 'cadent_aperture_mx',
        params: {
           tagid: '25251',
        }
    }]
}];
```

# Video Example
```
var adUnits = [{
    code: 'video-div',
    mediaTypes: {
        video: {
            context: 'instream', // also applicable for 'outstream'
            playerSize: [640, 480]
        }
    },
    bids: [
    {
        bidder: 'cadent_aperture_mx',
        params: {
           tagid: '25251',
           video: {
               skippable: true,
               playback_methods: ['auto_play_sound_off']
           }
        }
    }]
}];
```
