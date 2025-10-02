# Overview

Module Name: Freewheel MRM Bidder Adapter
Module Type: Bidder Adapter
Maintainer:  vis@freewheel.com

# Description

Module that connects to Freewheel MRM's demand sources

# Example Inbanner Ad Request
```
{
    code: 'adunit-code',
    mediaTypes: {
        banner: {
            'sizes': [[300, 250], [300, 600]]
        }
    },
    bids: [{
        bidder: 'fwssp',
        params: {
            bidfloor: 2.00,
            serverUrl: 'https://example.com/ad/g/1',
            networkId: '42015',
            profile: '42015:js_allinone_profile',
            siteSectionId: 'js_allinone_demo_site_section',
            flags: '+play',
            videoAssetId: '0',
            timePosition: 120,
            adRequestKeyValues: {
                _fw_player_width: '1920',
                _fw_player_height: '1080',
                _fw_content_programmer_brand: 'NEEDS_TO_REPLACE_BY_BRAND_NAME',
                _fw_content_programmer_brand_channel: 'NEEDS_TO_REPLACE_BY_CHANNEL_NAME',
                _fw_content_genre: 'NEEDS_TO_REPLACE_BY_CONTENT_GENRE'
            }
        }
    }]
}
```

# Example Instream Ad Request
```
{
    code: 'adunit-code',
    mediaTypes: {
        video: {
            playerSize: [300, 600],
        }
    },
    bids: [{
        bidder: 'fwssp',
        params: {
            bidfloor: 2.00,
            serverUrl: 'https://example.com/ad/g/1',
            networkId: '42015',
            profile: '42015:js_allinone_profile',
            siteSectionId: 'js_allinone_demo_site_section',
            flags: '+play',
            videoAssetId: '0',
            mode: 'live',
            timePosition: 120,
            tpos: 300,
            slid: 'Midroll',
            slau: 'midroll',
            minD: 30,
            maxD: 60,
            adRequestKeyValues: {
                _fw_player_width: '1920',
                _fw_player_height: '1080',
                _fw_content_progrmmer_brand: 'NEEDS_TO_REPLACE_BY_BRAND_NAME',
                _fw_content_programmer_brand_channel: 'NEEDS_TO_REPLACE_BY_CHANNEL_NAME',
                _fw_content_genre: 'NEEDS_TO_REPLACE_BY_CONTENT_GENRE'
            },
            gdpr_consented_providers: 'test_providers'
        }
    }]
}
```
