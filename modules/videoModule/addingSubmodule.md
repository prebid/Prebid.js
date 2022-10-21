# How to Add a Video Submodule

Video submodules interact with the Video Module to integrate Prebid with Video Players, allowing Prebid to automatically:
- render bids in the desired video player
- mark used bids as won
- trigger player and media events
- populate the oRTB Video Impression and Content params in the bid request

## Overview

The Prebid Video Module simplifies the way Prebid integrates with video players by acting as a single point of contact for everything video.
In order for the Video Module to connect to a video player, a submodule must be implemented. The submodule acts as a bridge between the Video Module and the video player.
The Video Module will route commands and tasks to the appropriate submodule instance.
A submodule is expected to work for a specific video player. i.e. the JW Player submodule is used to integrate Prebid with JW Player. The video.js submdule connects to video.js.
Publishers who use players from different vendors on the same page can use multiple video submodules.

## Requirements

The Video Module only supports integration with Video Players that meet the following requirements:
- Must support parsing and reproduction of VAST ads
    - Input can be an ad tag URL or the actual Vast XML.
- Must expose an API that allows the procurement of [Open RTB params](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf) for Video (section 3.2.7) and Content (section 3.2.16).
- Must emit javascript events for Ads and Media
    - see [Event Registration](#event-registration)

## Creating a Submodule

### Step 1: Add a markdown file describing the submodule

Create a markdown file under `modules` with the name of the module suffixed with 'VideoProvider', i.e. `exampleVideoProvider.md`.

Example markdown file:
```markdown
# Overview

Module Name: Example Video Provider
Module Type: Video Submodule
Video Player: Example player
Player website: example-player.com
Maintainer: someone@example.com

# Description

Video provider for Example Player. Contact someone@example.com for information.

# Requirements

Your page must link the Example Player build from our CDN. Alternatively yu can use npm to load the build.
```

### Step 2: Add a Vendor Code

Vendor codes are required to indicate which submodule type to instantiate. Add your vendor code constant to an export const in `vendorCodes.js` in Prebid.js under `libraries/video/constants/vendorCodes.js`.
i.e. in `vendorCodes.js`:

```javascript
export const EXAMPLE_PLAYER_VENDOR = 3;
```

### Step 2: Build the Module

Now create a javascript file under `modules` with the name of the module suffixed with 'VideoProvider', e.g., `exampleVideoProvider.js`.

#### The Submodule factory

The Video Module will need a submodule instance for every player instance registered with Prebid. You will therefore need to implement a submodule factory which is called with a `videoProviderConfig` argument and returns a Video Provider instance.
Your submodule should import your vendor code constant and set it to a `vendorCode` property on your submodule factory.
Your submodule should also import the `submodule` function from `src/hook.js` and should use it to register as a submodule of `'video'`.

**Code Example**

```javascript
import { submodule } from '../src/hook.js';

function exampleSubmoduleFactory(videoProviderConfig) {
    const videoProvider = {
      // implementation
    };

  return videoProvider;
}

exampleSubmoduleFactory.vendorCode = EXAMPLE_VENDOR;
submodule('video', exampleSubmoduleFactory);
```

#### The Submodule object

The submodule object must adhere to the `VideoProvider` interface defined in the `coreVideo.js` inline documentation.

#### Event registration

Submodules must support attaching and detaching event listeners on the video player. The list of events are defined in the Events file in the Video Library: `libraries/video/constants/events.js`.
All events and their params must be supported.

##### Event params

All Video Module events include a `divId` and `type` param in the payload by default.
The `divId` is the div id string of the player emitting the event; it can be used as an identifier. The `type` is the string name of the event.
The remaining Payload params are listed in the following:

###### SETUP_COMPLETE

| argument name | type | description |
| ------------- | ---- | ----------- |
| playerVersion | string | The version of the player on the page |
| viewable | boolean | Is the player currently viewable? |
| viewabilityPercentage | number | The percentage of the video that is currently viewable on the user's screen. |
| mute | boolean | Whether or not the player is currently muted. |
| volumePercentage | number | The volume of the player, as a percentage |

###### SETUP_FAILED

| argument name | type | description |
| ------------- | ---- | ----------- |
| playerVersion | string | The version of the player on the page |
| errorCode | number | The identifier of the error preventing the media from rendering |
| errorMessage | string | Developer friendly description of the reason the error occurred. |
| sourceError | object | The underlying root Error which prevented the playback. |

###### DESTROYED
No additional params.

###### AD_REQUEST

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |

###### AD_BREAK_START

| argument name | type | description |
| ------------- | ---- | ----------- |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |

###### AD_LOADED

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |
| loadTime | number | Time the ad took to load in milliseconds |
| vastAdId | string | The ID given to the ad within the ad tag's XML. Nullable when absent from the VAST xml. |
| adDescription | string | Description of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| adServer | string | Ad server used (e.g. dart or mediamind) from the vast tag. Nullable when absent from the VAST xml. |
| adTitle | string | Title of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| advertiserId | string | Optional identifier for the advertiser, provided by the ad server. Nullable when absent from the VAST xml. |
| advertiserName | string | Name of the advertiser as defined by the ad serving party, from the vast XML. Nullable when absent from the VAST xml. |
| dealId | string | The ID of the Ads deal. Generally relates to Direct Sold Ad Campaigns. Nullable when absent from the VAST xml. |
| linear | boolean | Is the ad linear or not? |
| vastVersion | string | Version of VAST being reported from the tag |
| creativeUrl | string | The URL representing the VPAID or MP4 ad that is run |
| adId | string | Unique Ad ID - refers to the 'attribute' of the <Ad> node within the VAST. Nullable when absent from the VAST xml. |
| universalAdId | string | Unique identifier for an ad in VAST4. Nullable when absent from the VAST xml. |
| creativeId | string | Ad server's unique ID for the creative pulled from the ad tag's XML. Should be used to specify the ad server’s unique identifier as opposed to  the Universal Ad Id which is used for maintaining a creative id for the ad across multiple systems. Nullable when absent from the VAST xml. |
| creativeType | string | The MIME type of the ad creative currently being displayed |
| redirectUrl | string | the url to which the viewer is being redirected after clicking the ad. Nullable when absent from the VAST xml. |
| adPlacementType | number | The video placements per IAB guidelines. Enum list: In-Stream: 1, In-Banner: 2, In-Article: 3, In-Feed: 4, Interstitial/Slider/Floating: 5 |
| waterfallIndex | number | Index of the current item in the ad waterfall |
| waterfallCount | number |  The count of items in a given ad waterfall |
| adPodCount | number | the total number of ads in the pod |
| adPodIndex | number | The index of the currently playing ad within an ad pod |
| wrapperAdIds | array[string] | Ad IDs of the VAST Wrappers that were loaded while loading the Ad tag. The list returned starts at the inline ad (innermost) and traverses to the outermost wrapper ad. An empty array is returned if there are no wrapper ads. |

###### AD_STARTED

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |
| loadTime | number | Time the ad took to load in milliseconds |
| vastAdId | string | The ID given to the ad within the ad tag's XML. Nullable when absent from the VAST xml. |
| adDescription | string | Description of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| adServer | string | Ad server used (e.g. dart or mediamind) from the vast tag. Nullable when absent from the VAST xml. |
| adTitle | string | Title of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| advertiserId | string | Optional identifier for the advertiser, provided by the ad server. Nullable when absent from the VAST xml. |
| advertiserName | string | Name of the advertiser as defined by the ad serving party, from the vast XML. Nullable when absent from the VAST xml. |
| dealId | string | The ID of the Ads deal. Generally relates to Direct Sold Ad Campaigns. Nullable when absent from the VAST xml. |
| linear | boolean | Is the ad linear or not? |
| vastVersion | string | Version of VAST being reported from the tag |
| creativeUrl | string | The URL representing the VPAID or MP4 ad that is run |
| adId | string | Unique Ad ID - refers to the 'attribute' of the <Ad> node within the VAST. Nullable when absent from the VAST xml. |
| universalAdId | string | Unique identifier for an ad in VAST4. Nullable when absent from the VAST xml. |
| creativeId | string | Ad server's unique ID for the creative pulled from the ad tag's XML. Should be used to specify the ad server’s unique identifier as opposed to  the Universal Ad Id which is used for maintaining a creative id for the ad across multiple systems. Nullable when absent from the VAST xml. |
| creativeType | string | The MIME type of the ad creative currently being displayed |
| redirectUrl | string | the url to which the viewer is being redirected after clicking the ad. Nullable when absent from the VAST xml. |
| adPlacementType | number | The video placements per IAB guidelines. Enum list: In-Stream: 1, In-Banner: 2, In-Article: 3, In-Feed: 4, Interstitial/Slider/Floating: 5 |
| waterfallIndex | number | Index of the current item in the ad waterfall |
| waterfallCount | number |  The count of items in a given ad waterfall |
| adPodCount | number | the total number of ads in the pod |
| adPodIndex | number | The index of the currently playing ad within an ad pod |
| wrapperAdIds | array[string] | Ad IDs of the VAST Wrappers that were loaded while loading the Ad tag. The list returned starts at the inline ad (innermost) and traverses to the outermost wrapper ad. An empty array is returned if there are no wrapper ads. |

<a name="ad-impression-params" />

###### AD_IMPRESSION

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |
| loadTime | number | Time the ad took to load in milliseconds |
| vastAdId | string | The ID given to the ad within the ad tag's XML. Nullable when absent from the VAST xml. |
| adDescription | string | Description of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| adServer | string | Ad server used (e.g. dart or mediamind) from the vast tag. Nullable when absent from the VAST xml. |
| adTitle | string | Title of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| advertiserId | string | Optional identifier for the advertiser, provided by the ad server. Nullable when absent from the VAST xml. |
| advertiserName | string | Name of the advertiser as defined by the ad serving party, from the vast XML. Nullable when absent from the VAST xml. |
| dealId | string | The ID of the Ads deal. Generally relates to Direct Sold Ad Campaigns. Nullable when absent from the VAST xml. |
| linear | boolean | Is the ad linear or not? |
| vastVersion | string | Version of VAST being reported from the tag |
| creativeUrl | string | The URL representing the VPAID or MP4 ad that is run |
| adId | string | Unique Ad ID - refers to the 'attribute' of the <Ad> node within the VAST. Nullable when absent from the VAST xml. |
| universalAdId | string | Unique identifier for an ad in VAST4. Nullable when absent from the VAST xml. |
| creativeId | string | Ad server's unique ID for the creative pulled from the ad tag's XML. Should be used to specify the ad server’s unique identifier as opposed to  the Universal Ad Id which is used for maintaining a creative id for the ad across multiple systems. Nullable when absent from the VAST xml. |
| creativeType | string | The MIME type of the ad creative currently being displayed |
| redirectUrl | string | the url to which the viewer is being redirected after clicking the ad. Nullable when absent from the VAST xml. |
| adPlacementType | number | The video placements per IAB guidelines. Enum list: In-Stream: 1, In-Banner: 2, In-Article: 3, In-Feed: 4, Interstitial/Slider/Floating: 5 |
| waterfallIndex | number | Index of the current item in the ad waterfall |
| waterfallCount | number |  The count of items in a given ad waterfall |
| adPodCount | number | the total number of ads in the pod |
| adPodIndex | number | The index of the currently playing ad within an ad pod |
| wrapperAdIds | array[string] | Ad IDs of the VAST Wrappers that were loaded while loading the Ad tag. The list returned starts at the inline ad (innermost) and traverses to the outermost wrapper ad. An empty array is returned if there are no wrapper ads. |
| time | number | The playback time in the ad when the event occurs, in seconds. |
| duration | number | Total duration of an ad in seconds |

###### AD_PLAY

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |

###### AD_TIME

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| time | number | The current poisition in the ad timeline |
| duration | number | Total duration of an ad in seconds |

###### AD_PAUSE

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |

###### AD_CLICK

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |
| loadTime | number | Time the ad took to load in milliseconds |
| vastAdId | string | The ID given to the ad within the ad tag's XML. Nullable when absent from the VAST xml. |
| adDescription | string | Description of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| adServer | string | Ad server used (e.g. dart or mediamind) from the vast tag. Nullable when absent from the VAST xml. |
| adTitle | string | Title of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| advertiserId | string | Optional identifier for the advertiser, provided by the ad server. Nullable when absent from the VAST xml. |
| advertiserName | string | Name of the advertiser as defined by the ad serving party, from the vast XML. Nullable when absent from the VAST xml. |
| dealId | string | The ID of the Ads deal. Generally relates to Direct Sold Ad Campaigns. Nullable when absent from the VAST xml. |
| linear | boolean | Is the ad linear or not? |
| vastVersion | string | Version of VAST being reported from the tag |
| creativeUrl | string | The URL representing the VPAID or MP4 ad that is run |
| adId | string | Unique Ad ID - refers to the 'attribute' of the <Ad> node within the VAST. Nullable when absent from the VAST xml. |
| universalAdId | string | Unique identifier for an ad in VAST4. Nullable when absent from the VAST xml. |
| creativeId | string | Ad server's unique ID for the creative pulled from the ad tag's XML. Should be used to specify the ad server’s unique identifier as opposed to  the Universal Ad Id which is used for maintaining a creative id for the ad across multiple systems. Nullable when absent from the VAST xml. |
| creativeType | string | The MIME type of the ad creative currently being displayed |
| redirectUrl | string | the url to which the viewer is being redirected after clicking the ad. Nullable when absent from the VAST xml. |
| adPlacementType | number | The video placements per IAB guidelines. Enum list: In-Stream: 1, In-Banner: 2, In-Article: 3, In-Feed: 4, Interstitial/Slider/Floating: 5 |
| waterfallIndex | number | Index of the current item in the ad waterfall |
| waterfallCount | number |  The count of items in a given ad waterfall |
| adPodCount | number | the total number of ads in the pod |
| adPodIndex | number | The index of the currently playing ad within an ad pod |
| wrapperAdIds | array[string] | Ad IDs of the VAST Wrappers that were loaded while loading the Ad tag. The list returned starts at the inline ad (innermost) and traverses to the outermost wrapper ad. An empty array is returned if there are no wrapper ads. |
| time | number | The playback time in the ad when the event occurs, in seconds. |
| duration | number | Total duration of an ad in seconds |

###### AD_SKIPPED

| argument name | type | description |
| ------------- | ---- | ----------- |
| time | number | The playback time in the ad when the event occurs, in seconds. |
| duration | number | Total duration of an ad in seconds |

<a name="ad-error-params" />

###### AD_ERROR

| argument name | type | description |
| ------------- | ---- | ----------- |
| playerErrorCode | number | The ad error code from the Player’s internal spec. |
| vastErrorCode | number | The error code for the VAST response that is returned from the request, as defined in the VAST spec. |
| errorMessage | string | Developer friendly description of the reason the error occurred. |
| sourceError | object | The underlying root Error which prevented the playback. |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |
| loadTime | number | Time the ad took to load in milliseconds |
| vastAdId | string | The ID given to the ad within the ad tag's XML. Nullable when absent from the VAST xml. |
| adDescription | string | Description of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| adServer | string | Ad server used (e.g. dart or mediamind) from the vast tag. Nullable when absent from the VAST xml. |
| adTitle | string | Title of the ad pulled from the ad tag's XML. Nullable when absent from the VAST xml. |
| advertiserId | string | Optional identifier for the advertiser, provided by the ad server. Nullable when absent from the VAST xml. |
| advertiserName | string | Name of the advertiser as defined by the ad serving party, from the vast XML. Nullable when absent from the VAST xml. |
| dealId | string | The ID of the Ads deal. Generally relates to Direct Sold Ad Campaigns. Nullable when absent from the VAST xml. |
| linear | boolean | Is the ad linear or not? |
| vastVersion | string | Version of VAST being reported from the tag |
| creativeUrl | string | The URL representing the VPAID or MP4 ad that is run |
| adId | string | Unique Ad ID - refers to the 'attribute' of the <Ad> node within the VAST. Nullable when absent from the VAST xml. |
| universalAdId | string | Unique identifier for an ad in VAST4. Nullable when absent from the VAST xml. |
| creativeId | string | Ad server's unique ID for the creative pulled from the ad tag's XML. Should be used to specify the ad server’s unique identifier as opposed to  the Universal Ad Id which is used for maintaining a creative id for the ad across multiple systems. Nullable when absent from the VAST xml. |
| creativeType | string | The MIME type of the ad creative currently being displayed |
| redirectUrl | string | the url to which the viewer is being redirected after clicking the ad. Nullable when absent from the VAST xml. |
| adPlacementType | number | The video placements per IAB guidelines. Enum list: In-Stream: 1, In-Banner: 2, In-Article: 3, In-Feed: 4, Interstitial/Slider/Floating: 5 |
| waterfallIndex | number | Index of the current item in the ad waterfall |
| waterfallCount | number |  The count of items in a given ad waterfall |
| adPodCount | number | the total number of ads in the pod |
| adPodIndex | number | The index of the currently playing ad within an ad pod |
| wrapperAdIds | array[string] | Ad IDs of the VAST Wrappers that were loaded while loading the Ad tag. The list returned starts at the inline ad (innermost) and traverses to the outermost wrapper ad. An empty array is returned if there are no wrapper ads. |
| time | number | The playback time in the ad when the event occurs, in seconds. |
| duration | number | Total duration of an ad in seconds |

###### AD_COMPLETE

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |

###### AD_BREAK_END

| argument name | type | description |
| ------------- | ---- | ----------- |
| offset | string | Scheduled position in the video for the ad to play. For mid-rolls, will be the position in seconds as string. Other options: 'pre' (pre-roll), 'post' (post-roll), 'api' (ad was not scheduled) |

###### PLAYLIST

| argument name | type | description |
| ------------- | ---- | ----------- |
| playlistItemCount | number | The number of items in the current playlist |
| autostart | boolean | Whether or not the player is set to begin playing automatically. |

###### PLAYBACK_REQUEST

| argument name | type | description |
| ------------- | ---- | ----------- |
| playReason | string | wWy the play attempt originated. Options: ‘Unknown’ (Unknown reason:we cannot tell), ‘Interaction’ (A viewer interacts with the UI), ‘Auto’ (Autoplay based on the configuration of the player - autoStart), ‘autoOnViewable’ (autoStart when viewable), ‘autoRepeat’ (media automatically restarted after completion, without any user interaction), ‘Api’ (caused by a call on the player’s API), ‘Internal’ (started because of an internal mechanism i.e. playlist progressed to a recommended item) |

###### AUTOSTART_BLOCKED

| argument name | type | description |
| ------------- | ---- | ----------- |
| errorCode | number | The identifier of error preventing the media from rendering |
| errorMessage | string | Developer friendly description of the reason the error occurred. |
| sourceError | object | The underlying root Error which prevented the playback. |

###### PLAY_ATTEMPT_FAILED

| argument name | type | description |
| ------------- | ---- | ----------- |
| playReason | string | Why the play attempt originated. Options: ‘Unknown’ (Unknown reason:we cannot tell), ‘Interaction’ (A viewer interacts with the UI), ‘Auto’ (Autoplay based on the configuration of the player - autoStart), ‘autoOnViewable’ (autoStart when viewable), ‘autoRepeat’ (media automatically restarted after completion, without any user interaction), ‘Api’ (caused by a call on the player’s API), ‘Internal’ (started because of an internal mechanism i.e. playlist progressed to a recommended item) |
| errorCode | number | The identifier of error preventing the media from rendering |
| errorMessage | string | Developer friendly description of the reason the error occurred. |
| sourceError | object | The underlying root Error which prevented the playback. |

###### CONTENT_LOADED

| argument name | type | description |
| ------------- | ---- | ----------- |
| contentId | string | The unique identifier of the media item being rendered by the video player. Nullable when not provided by Publisher, or unknown. |
| contentUrl | string | The URL of the media source of the playlist item |
| title | string | The title of the content; not meant to be used as a unique identifier. Nullable when not provided by Publisher, or unknown. |
| description | string | The description of the content. Nullable when not provided by Publisher, or unknown. |
| playlistIndex | number | The currently playing media item's index in the playlist. |
| contentTags | array[string] | Customer media level tags describing the content. Nullable when not provided by Publisher, or unknown. |

###### PLAY

No additional params.

###### PAUSE

No additional params.

###### BUFFER

| argument name | type | description |
| ------------- | ---- | ----------- |
| time | number | Playback position of the media in seconds |
| duration | number | Current media’s length in seconds |
| playbackMode | number | The current playback mode used by a given player. Enum list: vod: 0, live: 1, dvr: 2 |

###### TIME

| argument name | type | description |
| ------------- | ---- | ----------- |
| position | number | Playback position of the media in seconds |
| duration | number | Current media’s length in seconds |

###### SEEK_START

| argument name | type | description |
| ------------- | ---- | ----------- |
| position | number | Playback position of the media in seconds, when the seek begins |
| destination | number | Desired playback position of a seek action, in seconds |
| duration | number | Current media’s length in seconds |

###### SEEK_END

| argument name | type | description |
| ------------- | ---- | ----------- |
| position | number | Playback position of the media in seconds, when the seek has ended |
| duration | number | Current media’s length in seconds |

###### MUTE

| argument name | type | description |
| ------------- | ---- | ----------- |
| mute | boolean | Whether or not the player is currently muted. |

###### VOLUME

| argument name | type | description |
| ------------- | ---- | ----------- |
| volumePercentage | number | The volume of the player, as a percentage |

###### RENDITION_UPDATE

| argument name | type | description |
| ------------- | ---- | ----------- |
| videoReportedBitrate | number | The bitrate of the currently playing video in kbps as reported by the Adaptive Manifest. |
| audioReportedBitrate | number | The bitrate of the currently playing audio in kbps as reported by the Adaptive Manifest. |
| encodedVideoWidth | number | The encoded width in pixels of the currently playing video rendition. |
| encodedVideoHeight | number | The encoded height in pixels of the currently playing video rendition. |
| videoFramerate | number | The current rate of playback. For a video that is playing twice as fast as the default playback, the playbackRate value should be 2.00 |

###### ERROR

| argument name | type | description |
| ------------- | ---- | ----------- |
| errorCode | number | The identifier of the error preventing the media from rendering |
| errorMessage | string | Developer friendly description of the reason the error occurred. |
| sourceError | object | The underlying root Error which prevented the playback. |

###### COMPLETE

No additional params.

###### PLAYLIST_COMPLETE

No additional params.

###### FULLSCREEN

| argument name | type | description |
| ------------- | ---- | ----------- |
| fullscreen | boolean | Whether or not the player is currently in fullscreen |

###### PLAYER_RESIZE

| argument name | type | description |
| ------------- | ---- | ----------- |
| height | number | The height of the player in pixels |
| width | number | The width of the player in pixels |

###### VIEWABLE

| argument name | type | description |
| ------------- | ---- | ----------- |
| viewable | boolean | Is the player currently viewable? |
| viewabilityPercentage | number | The percentage of the video that is currently viewable on the user's screen. |

###### CAST

| argument name | type | description |
| ------------- | ---- | ----------- |
| casting | boolean | Whether or not the current user is casting to a device |

###### AUCTION_AD_LOAD_ATTEMPT

| argument name | type | description |
| ------------- | ---- | ----------- |
| adTagUrl | string | The URL for the ad tag associated with the given ad event |
| adUnitCode | string | Unique identifier that was used when creating the ad unit. |

###### AUCTION_AD_LOAD_ABORT

| argument name | type | description |
| ------------- | ---- | ----------- |
| adUnitCode | string | Unique identifier that was used when creating the ad unit. |

###### BID_IMPRESSION

| argument name | type | description |
| ------------- | ---- | ----------- |
| bid | object |  Information about the Bid which resulted in the Ad Impression |
| adEvent | object | Event payload from the [Ad Impression](#ad-impression-params) |

###### BID_ERROR

| argument name | type | description |
| ------------- | ---- | ----------- |
| bid | object | Information about the Bid which resulted in the Ad Error |
| adEvent | object | Event payload from the [Ad Error](#ad-error-params) |

#### Update .submodules.json

In prebid.js, add your new submodule to `.submodules.json` under the `videoModule` as such:
{% highlight text %}
```
{
  "parentModules": {
    "videoModule": [
      "exampleVideoProvider"
    ]
  }
}
```

### Shared resources for developers

A video library containing reusable code and constants has been added to Prebid.js for your convenience. We encourage you to import from this library.
Constants such as event names can be found in the `libraries/video/constants/` folder.
