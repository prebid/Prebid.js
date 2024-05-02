# Overview

```
Module Name:  Datawrkz Bid Adapter
Module Type:  Bidder Adapter
Maintainer:  pubops@datawrkz.com
```

# Description

Module that connects to Datawrkz's demand sources. 
Datawrkz bid adapter supports Banner, Video (instream and outstream) and Native ad units.

# Bid Parameters

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `site_id` | required | String | Site id  | "test_site_id"
| `deals` | optional | Array<Deal> | Array of deal objects | `[{id: "deal_1"},{id: "deal_2"}]`
| `bidfloor` | optional | Float | Minimum bid for this impression expressed in CPM | `0.5`
| `outstreamType` | optional | String | Type of outstream video to the played. Available options: inline, slider_top_left, slider_top_right, slider_bottom_left, slider_bottom_right, interstitial_close, and listicle | "inline"
| `outstreamConfig` | optional | Object | Configuration settings for outstream ad unit | `{ad_unit_audio: 1, show_player_close_button_after: 5, hide_player_control: 0}`

# Deal Object
| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `id` | required | String | Deal id  | "test_deal_id"

# outstreamConfig
| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `ad_unit_audio` | optional | Integer | Set default audio option for the player. 0 to play audio on hover and 2 to mute | `0` or `2`
| `show_player_close_button_after` | optional | Integer | Show player close button after specified seconds | `5`
| `hide_player_control` | optional | Integer | Show/hide player controls. 0 to show player controls and 1 to hide | `1`

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: 'datawrkz',
         params: {
           site_id: 'site_id',
           bidfloor: 0.5
         }
       }]
   },
   // Native adUnit
   {
      code: 'native-div',
      sizes: [[1, 1]],
      mediaTypes: {
        native: {
          title: {
            required: true,
            len: 80
          },
          image: {
            required: true,
            sizes: [300, 250]
          },
          icon: {
            required: true,
            sizes: [50, 50]
          },
          body: {
            required: true,
            len: 800
          },
          sponsoredBy: {
            required: true
          },
          cta: {
            required: true
          }
        }
      },
      bids: [{
        bidder: 'datawrkz',
        params: {
          site_id: 'site_id',
           bidfloor: 0.5
        }
      }]
   },
   // Video instream adUnit
   {
      code: 'video-instream',
      sizes: [[640, 480]],
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          context: 'instream',
          api: [1, 2],
          mimes: ["video/x-ms-wmv", "video/mp4"],
          protocols: [1, 2, 3],
          playbackmethod: [1, 2],
          minduration: 20,
          maxduration: 30,
          startdelay: 5,
          minbitrate: 300,
          maxbitrate: 1500,
          delivery: [2],
          linearity: 1
        },
      },
      bids: [{
        bidder: 'datawrkz',
        params: {
          site_id: 'site_id',
          bidfloor: 0.5
        }
      }]
   },
   // Video outstream adUnit
   {
     code: 'video-outstream',
     sizes: [[300, 250]],
     mediaTypes: {
       video: {
         playerSize: [[300, 250]],
         context: 'outstream',
         api: [1, 2],
         mimes: ["video/mp4"],
         protocols: [1, 2, 3],
         playbackmethod: [1, 2],
         minduration: 20,
         maxduration: 30,
         startdelay: 5,
         minbitrate: 300,
         maxbitrate: 1500,
         delivery: [2],
         linearity: 1
       }
     },
     bids: [
       {
         bidder: 'datawrkz',
         params: {
           site_id: 'site_id',
           bidfloor: 0.5,
           outstreamType: 'slider_top_left',          //Supported types : inline, slider_top_left, slider_top_right, slider_bottom_left, slider_bottom_right, interstitial_close, listicle
           outstreamConfig: {
            ad_unit_audio: 1,                       // 0: audio on hover, 2: always muted
            show_player_close_button_after: 5,     // show close button after 5 seconds
            hide_player_control: 0                // 0 to show/ 1 to hide
           }
         }
       }
     ]
   }
];
```
