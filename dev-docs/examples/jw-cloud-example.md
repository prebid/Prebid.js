---
layout: player_example
title: JW Cloud Player Integration
description: Show a prebid ad in a cloud hosted JW Player

top_nav_section: dev_docs
nav_section: quick-start

hide: true
beta: true

about:
- Setting up JW Player to dynamically play ads.
- Using a cloud-hosted JW player.
- Using invokeVideoPlayer to set up and access the JW Player instance.
- Dynamically inserting a preroll ad into JW Player.

player_notes:
- You must have the correct JW Player license that allows you to play advertising.
- The different methods of embedding JW Player on your site can be found <a href="https://support.jwplayer.com/customer/portal/articles/1406723-mp4-video-embed">here</a>. 
- For this example we will be using method 1, a cloud-hosted player and JW Platform hosted content. To see an example using the self-hosted player, click <a href="#">here</a>.
- No matter what embedding method you choose to use, you must follow the <b>custom embed</b> instructions. You cannot use the single-line embed.
- If you're using a cloud-hosted player, <b>do not enable advertising in the platform</b>. We'll do it on page so that we can use the vast url from prebid.
- You can set up most of your player's settings in the platform. The platform settings will be used unless overridden on the page in the setup call.

jsfiddle_link: jsfiddle.net/shirleylberry/zt70zj9z/embedded/html/
demo_link: video-demo.appnexus.com/pbjs/JWPlayerDemo/jwPlatformPrebidDemo.html

code_lines: 137
code_height: 2950

pid: 30
---
<div markdown="1" style="top:200px" class="pl-doc-entry">
#### Line 15 to 18: Pre-define `invokeVideoPlayer`
Because we have no way of knowing when all the bids will be returned from prebid we can't be sure that the browser will reach the point where `invokeVideoPlayer` is defined before bidsBackHandler fires and tries to call it. To prevent a `invokeVideoPlayer not defined` error, we pre-define it before we make the call to prebid, and redefine it later on with the code to create the player and play the ad. In this first version it simply stores the winning vast to use later.
</div>

<div markdown="1" style="top:550px" class="pl-doc-entry">
#### Line 20 to 34: Create a video ad unit
Create a video ad unit to request bids for. The `code` is the name we'll use to refer to this ad unit throughout the prebid code. Make sure you include the `mediaType: 'video'` and replace the `placementId` with your own valid placement ID.
</div>

<div markdown="1" style="top:950px" class="pl-doc-entry">
#### Line 36 to 52: Log the bids for debugging
Log information about the bids to the console, including whether any bids were returned. This isn't strictly necessary, but is useful for debugging.
</div>

<div markdown="1" style="top:1275px" class="pl-doc-entry">
#### Line 54 to 73: Add the ad units and request bids
Add the ad units you want to request bids for to prebid, and then call `requestBids()`, passing in a json object. In the json object, define the `bidsBackHandler` callback which will run once all the bids are returned.
</div>

<div markdown="1" style="top:1400px" class="pl-doc-entry">
#### Line 60 to 71: Build masterVideoTag and call invokeVideoPlayer
Once we have the bids back, `bidsBackHandler` will be called. Inside this callback, we create the masterVideoTag and pass it to the video player by calling `invokeVideoPlayer()`.
</div>

<div markdown="1" style="top:2300px" class="pl-doc-entry">
#### Line 112: Include the player library
The script tag for your cloud-hosted video player can be found in your JW Platform account on the player's page, under 'Cloud Player Library URL'. The player will use the settings you define in JW Platform unless you override them on the page in the setup call.
</div>

<div markdown="1" style="top:2415px" class="pl-doc-entry">
#### Line 114: Get a reference to the player instance
Get a reference to the player by calling `jwplayer()` and passing in the id of the div you want to load the player into.
</div>

<div markdown="1" style="top:2500px" class="pl-doc-entry">
#### Line 117 to 122: Call setup on the player instance
Call `setup()` on the player instance with the settings you want. We need to pass in a media file and an advertising block with a `client` defined.
</div>

<div markdown="1" style="top:2575px" class="pl-doc-entry">
#### Line 119 to 121: Pass in Advertising
We must pass in an `"advertising"` block in our settings in order to enable advertising for this player. We can also specify the tag or an ad schedule here but for this demo we'll insert the tag dynamically before the content plays.
</div>

<div markdown="1" style="top:2675px" class="pl-doc-entry">
#### Line 124 to 126: Play a prebid ad as a preroll
Before the player begins to play the content video, play an ad.
</div>

<div markdown="1" style="top:2750px" class="pl-doc-entry">
#### Line 129 to 132: Account for page speed
If prebid returned bids before the browser reached the end of the page, the first version of `invokeVideoPlayer` will have been called from `bidsBackHandler` so the winning vast tag will be stored in tempTag. If that's the case, we want to call the 'real' version of `invokeVideoPlayer` with the stored url to create the player and play the ad. If `tempTag` is not defined, that means the browser reached the end of the page before the bids came back from prebid, meaning the 'real' version of `invokeVideoPlayer` was already called.
</div>


