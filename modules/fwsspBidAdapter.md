# Overview

Module Name: Freewheel MRM Bidder Adapter
Module Type: Bidder Adapter
Maintainer:  vis@freewheel.com

# Description

Module that connects to Freewheel MRM's demand sources

# Basic Test Request
```
const adUnits = [{
    code: 'adunit-code',
    mediaTypes: {
        video: {
            playerSize: [640, 480],
            minduration: 30,
            maxduration: 60
        }
    },
    bids: [{
        bidder: 'fwssp',  // or use alias 'freewheel-mrm'
        params: {
            serverUrl: 'https://example.com/ad/g/1',
            networkId: '42015',
            profile: '42015:js_allinone_profile',
            siteSectionId: 'js_allinone_demo_site_section',
            videoAssetId: '1',  // optional: default value of 0 will used if not included
            flags: '+play-uapl'  // optional: users may include capability if needed
            mode: 'live',
            adRequestKeyValues: {  // optional: users may include adRequestKeyValues if needed
                _fw_player_width: '1920',
                _fw_player_height: '1080'
            },
            format: 'inbanner'
        }
    }]
}];
```

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
        schain: {
            ver: '1.0',
            complete: 1,
            nodes: [{
                asi: 'example.com',
                sid: '0',
                hp: 1,
                rid: 'bidrequestid',
                domain: 'example.com'
            }]
        },
        params: {
            bidfloor: 2.00,
            serverUrl: 'https://example.com/ad/g/1',
            networkId: '42015',
            profile: '42015:js_allinone_profile',
            siteSectionId: 'js_allinone_demo_site_section',
            flags: '+play',
            videoAssetId: '1`,  // optional: default value of 0 will used if not included
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
        schain: {
            ver: '1.0',
            complete: 1,
            nodes: [{
                asi: 'example.com',
                sid: '0',
                hp: 1,
                rid: 'bidrequestid',
                domain: 'example.com'
            }]
        },
        params: {
            bidfloor: 2.00,
            serverUrl: 'https://example.com/ad/g/1',
            networkId: '42015',
            profile: '42015:js_allinone_profile',
            siteSectionId: 'js_allinone_demo_site_section',
            flags: '+play',
            videoAssetId: '1',  // optional: default value of 0 will used if not included
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
