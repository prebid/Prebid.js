---
layout: player_example
title: Ooyala Player Integration
description: Show a prebid ad in an Ooyala player

top_nav_section: dev_docs
nav_section: quick-start

hide: true
beta: true

about:
- Including the correct scripts on the page. A guide can be found <a href="http://help.ooyala.com/video-platform/documentation/concepts/pbv4_plugins.html">here</a>.
- Using the Ooyala v4 player API.
- Using Ooyala's Google IMA plugin.
- Passing a vast tag to the Ooyala player.

player_notes:
- This guide uses the V4 Ooyala player. To get the embed code for the V4 player, select <b>New Ooyala Player (V4) Embed Code</b> in the embed options instead of HTML Embed Code. 
- Do not select an ad set in the 'Monetize' tab. We'll control that setting on the page.

jsfiddle_link: jsfiddle.net/shirleylberry/hxzue5eu/embedded/html/
demo_link: video-demo.appnexus.com/pbjs/ooyala-prebid/ooyala-demo.html

code_lines: 154
code_height: 3300

pid: 34
---

<div markdown="1" style="top:200px" class="pl-doc-entry">
#### Line 7 to 22: Load Player Scripts
Load the Ooyla player scripts you plan to use. You must load the core player script, the scripts for whatever video formats you want to support, and the scripts for the ad manager you want to use. The scripts themselves and a guide for choosing which ones you need can be found [here](http://help.ooyala.com/video-platform/documentation/concepts/pbv4_plugins.html).
</div>

<div markdown="1" style="top:550px" class="pl-doc-entry">
#### Line 27 to 30: Pre-define `invokeVideoPlayer`
Because we have no way of knowing when all the bids will be returned from prebid we can't be sure that the browser will reach the point where `invokeVideoPlayer` is defined before bidsBackHandler fires and tries to call it. To prevent a `invokeVideoPlayer not defined` error, we pre-define it before we make the call to prebid, and redefine it later on with the code to create the player and play the ad. In this first version it simply stores the winning vast to use later.
</div>

<div markdown="1" style="top:900px" class="pl-doc-entry">
#### Line 36 to 50: Create a video ad unit
Create a video ad unit to request bids for. The `code` is the name we'll use to refer to this ad unit throughout the prebid code. Make sure you include the `mediaType: 'video'` and replace the `placementId` with your own valid placement ID.
</div>

<div markdown="1" style="top:1200px" class="pl-doc-entry">
#### Line 52 to 68: Log the bids for debugging
Log information about the bids to the console, including whether any bids were returned. This isn't strictly necessary, but is useful for debugging.
</div>

<div markdown="1" style="top:1550px" class="pl-doc-entry">
#### Line 70 to 89: Add the ad units and request bids
Add the ad units you want to request bids for to prebid, and then call `requestBids()`, passing in a json object. In the json object, define the `bidsBackHandler` callback which will run once all the bids are returned.
</div>

<div markdown="1" style="top:1725px" class="pl-doc-entry">
#### Line 76 to 86: Build masterVideoTag and call invokeVideoPlayer
Once we have the bids back, `bidsBackHandler` will be called. Inside this callback, we create the masterVideoTag and pass it to the video player by calling `invokeVideoPlayer()`.
</div>

<div markdown="1" style="top:2675px" class="pl-doc-entry">
#### Line 126 to 140: Define player settings
Define the settings you want for your player in a JSON object. These lines will be part of the embed code you copy paste from Ooyala Backlot, we just need to add the ad parameters.
</div>

<div markdown="1" style="top:2800px" class="pl-doc-entry">
#### Line 132 to 137: Add the ad parameters to the player settings
Create a new JSON object in the player parameters. The key should be the ad manager you're using (in our case we're using the [Google ima ads manager](http://help.ooyala.com/video-platform/concepts/pbv4_ads_dev_google_ima.html), so the key is `"google-ima-ads-manager"`). The ima ads manager requires an ad set (which we've named `"all_ads"`. 
Make sure you follow proper [JSON formatting](http://www.w3schools.com/js/js_json_syntax.asp) as you add the ad parameters.
</div>

<div markdown="1" style="top:2950px" class="pl-doc-entry">
#### Line 141 to 143: Initialize the player
Use the `OO.ready()` event to make sure that all the necessary Ooyala plugins have loaded before attempting to create the player. Once it has, call `create()` and pass in the div you're creating the player in, the ID of the content video, and the player settings we created above.
</div>

<div markdown="1" style="top:3075px" class="pl-doc-entry">
#### Line 134 to 137: Account for page speed
If prebid returned bids before the browser reached the end of the page, the first version of `invokeVideoPlayer` will have been called from `bidsBackHandler` so the winning vast tag will be stored in tempTag. If that's the case, we want to call the 'real' version of `invokeVideoPlayer` with the stored url to create the player and play the ad. If `tempTag` is not defined, that means the browser reached the end of the page before the bids came back from prebid, meaning the 'real' version of `invokeVideoPlayer` was already called.
</div>


