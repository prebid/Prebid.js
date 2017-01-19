---
layout: player_example
title: VideoJS Player Integration
description: Show a prebid ad in a VideoJS player

top_nav_section: dev_docs
nav_section: quick-start

hide: true
beta: true

about:
- Using invokeVideoPlayer to set up and access the VideoJS player instance.
- Using a plugin to play ads in the player.
- Configuring the ad plugin options.

player_notes:
- Make sure to incude at least one advertising plugin you want to use on the page. For this demo, we're using the <a href="https://github.com/MailOnline/videojs-vast-vpaid">Mail Online vast/vpaid plugin</a>.
- A guide to the options the vastClient accepts can be found <a href="https://github.com/MailOnline/videojs-vast-vpaid#options">here</a>.

jsfiddle_link: jsfiddle.net/shirleylberry/vfzo8ofu/embedded/html/
demo_link: video-demo.appnexus.com/pbjs/mjacobson/video_testing/prebid_video_videojs_new.html

code_lines: 159
code_height: 3450

pid: 34
---
<div markdown="1" style="top:200px" class="pl-doc-entry">
#### Line 20 to 36: Include VideoJS assets
Add the VideoJS script and css file to your page, along with the script and css files for any plugins you want, which should include an advertising plugin. For this demo we'll be using the vast-vpaid plugin.
</div>

<div markdown="1" style="top:500px" class="pl-doc-entry">
#### Line 11 to 14: Pre-define `invokeVideoPlayer`
Because we have no way of knowing when all the bids will be returned from prebid we can't be sure that the browser will reach the point where `invokeVideoPlayer` is defined before bidsBackHandler fires and tries to call it. To prevent a `invokeVideoPlayer not defined` error, we pre-define it before we make the call to prebid, and redefine it later on with the code to create the player and play the ad. In this first version it simply stores the winning vast to use later.
</div>

<div markdown="1" style="top:800px" class="pl-doc-entry">
#### Line 20 to 36: Create a video ad unit
Create a video ad unit to request bids for. The `code` is the name we'll use to refer to this ad unit throughout the prebid code. Make sure you include the `mediaType: 'video'` and replace the `placementId` with your own valid placement ID.
</div>

<div markdown="1" style="top:1100px" class="pl-doc-entry">
#### Line 36 to 52: Log the bids for debugging
Log information about the bids to the console, including whether any bids were returned. This isn't strictly necessary, but is useful for debugging.
</div>

<div markdown="1" style="top:1500px" class="pl-doc-entry">
#### Line 54 to 73: Add the ad units and request bids
Add the ad units you want to request bids for to prebid, and then call `requestBids()`, passing in a json object. In the json object, define the `bidsBackHandler` callback which will run once all the bids are returned.
</div>

<div markdown="1" style="top:1650px" class="pl-doc-entry">
#### Line 60 to 70: Build masterVideoTag and call invokeVideoPlayer
Once we have the bids back, `bidsBackHandler` will be called. Inside this callback, we create the masterVideoTag and pass it to the video player by calling `invokeVideoPlayer()`.
</div>

<div markdown="1" style="top:2625px" class="pl-doc-entry">
#### Line 124 to 129: Create video element
Create an html5 video element and give it an ID. We'll use this id to reference the player later. 
</div>

<div markdown="1" style="top:2850px" class="pl-doc-entry">
#### Line 136 to 148: Initialize video element
Access the player instance by calling `videojs()` and passing in the player's id. Add a `ready` listener to make sure the player is ready before interacting with it. 
</div>

<div markdown="1" style="top:2975px" class="pl-doc-entry">
#### Line 136 to 148: Pass settings to vast plugin
Pass in a json object to the player's vastClient (defined by the vast / vpaid plugin we're using). The requires an `adTagUrl`, which will be the url returned by prebid. You can view all the options available for the vastClient [here](https://github.com/MailOnline/videojs-vast-vpaid#options).
</div>

<div markdown="1" style="top:3175px" class="pl-doc-entry">
#### Line 131 to 134: Account for page speed
If prebid returned bids before the browser reached the end of the page, the first version of `invokeVideoPlayer` will have been called from `bidsBackHandler` so the winning vast tag will be stored in tempTag. If that's the case, we want to call the 'real' version of `invokeVideoPlayer` with the stored url to create the player and play the ad. If `tempTag` is not defined, that means the browser reached the end of the page before the bids came back from prebid, meaning the 'real' version of `invokeVideoPlayer` was already called.
</div>

