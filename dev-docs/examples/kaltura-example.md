---
layout: player_example
title: Kaltura Player Integration
description: Show a prebid ad in a Kaltura player

top_nav_section: dev_docs
nav_section: quick-start

hide: true
beta: true

about:
- Using invokeVideoPlayer to set up and access the Kaltura player instance.
- Using the dynamic embed integration method with the Kaltura player.

player_notes:
- In Kaltura studio, enable the advertising plugin you want to use. For this demo we'll be using the VAST 3.0 plugin.
- We'll be using the <b>Dynamic Embed</b> method to add the player to the page. We need to customize the player on the page, so the auto embed method will not work.
- To find the Dynamic Embed code for your player, go to the content tab and select the 'Preview and Embed' action. Click 'Show Advanced Options' to see more embedding options, and select 'Dynamic Embed' from the dropdown menu.

jsfiddle_link: jsfiddle.net/shirleylberry/17vap1ro/embedded/html/
demo_link: video-demo.appnexus.com/pbjs/kaltura-prebid/klt-demo.html

code_lines: 139
code_height: 3000

pid: 34
---
<div markdown="1" style="top:150px" class="pl-doc-entry">
#### Line 11 to 14: Pre-define `invokeVideoPlayer`
Because we have no way of knowing when all the bids will be returned from prebid we can't be sure that the browser will reach the point where `invokeVideoPlayer` is defined before bidsBackHandler fires and tries to call it. To prevent a `invokeVideoPlayer not defined` error, we pre-define it before we make the call to prebid, and redefine it later on with the code to create the player and play the ad. In this first version it simply stores the winning vast to use later.
</div>

<div markdown="1" style="top:550px" class="pl-doc-entry">
#### Line 20 to 36: Create a video ad unit
Create a video ad unit to request bids for. The `code` is the name we'll use to refer to this ad unit throughout the prebid code. Make sure you include the `mediaType: 'video'` and replace the `placementId` with your own valid placement ID.
</div>

<div markdown="1" style="top:900px" class="pl-doc-entry">
#### Line 36 to 52: Log the bids for debugging
Log information about the bids to the console, including whether any bids were returned. This isn't strictly necessary, but is useful for debugging.
</div>

<div markdown="1" style="top:1200px" class="pl-doc-entry">
#### Line 54 to 73: Add the ad units and request bids
Add the ad units you want to request bids for to prebid, and then call `requestBids()`, passing in a json object. In the json object, define the `bidsBackHandler` callback which will run once all the bids are returned.
</div>

<div markdown="1" style="top:1400px" class="pl-doc-entry">
#### Line 60 to 70: Build masterVideoTag and call invokeVideoPlayer
Once we have the bids back, `bidsBackHandler` will be called. Inside this callback, we create the masterVideoTag and pass it to the video player by calling `invokeVideoPlayer()`.
</div>

<div markdown="1" style="top:2250px" class="pl-doc-entry">
#### Line 112 to 128: Include Kaltura player script
Add the script for your Kaltura player. This will be part of the code you will copy paste from Kaltura.
</div>

<div markdown="1" style="top:2375px" class="pl-doc-entry">
#### Line 112 to 128: Embed the Kaltura Player
Call `kWidget.embed()` and pass in a JSON object of your player settings. Most of this JSON object will be part of the code you will copy paste from Kaltura.
</div>

<div markdown="1" style="top:2475px" class="pl-doc-entry">
#### Line 118 to 121: Add vast settings to the player settings
Inside the `flashVars`, add another key called `"vast"` and pass in a JSON object with the position you want to play your ad, and the url of the ad, which in this case will be the `url` we got back from prebid.
</div>

<div markdown="1" style="top:2625px" class="pl-doc-entry">
#### Line 124 to 127: Add a ready callback and get a reference to the player
Add a ready callback to the player settings. This allows us to get a reference to the player, stored in the variable `kdp` in order to interact with it later.
</div>

<div markdown="1" style="top:2750px" class="pl-doc-entry">
#### Line 131 to 134: Account for page speed
If prebid returned bids before the browser reached the end of the page, the first version of `invokeVideoPlayer` will have been called from `bidsBackHandler` so the winning vast tag will be stored in tempTag. If that's the case, we want to call the 'real' version of `invokeVideoPlayer` with the stored url to create the player and play the ad. If `tempTag` is not defined, that means the browser reached the end of the page before the bids came back from prebid, meaning the 'real' version of `invokeVideoPlayer` was already called.
</div>

