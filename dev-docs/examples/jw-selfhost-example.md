---
layout: player_example
title: JW Self-Hosted Player Integration
description: Show a prebid ad in a self-hosted JW Player

top_nav_section: dev_docs
nav_section: quick-start

hide: true
beta: true

about:
- Setting up JW Player to dynamically play ads.
- Using a self-hosted player.
- Create a masterVideoTag and pass it to invokeVideoPlayer.
- Use invokeVideoPlayer to set up and access the JW Player instance.
- Dynamically insert a preroll ad into JW Player.

player_notes:
- You must have the correct JW Player license that allows you to play advertising.
- The different methods of embedding JW Player on your site can be found <a href="https://support.jwplayer.com/customer/portal/articles/1406723-mp4-video-embed">here</a>. 
- For this example we will be using method 3, a self-hosted player and JW Platform hosted content. To see an example using the cloud-hosted player, click <a href="#">here</a>.
- No matter what embedding method you choose to use, you must follow the <b>custom embed</b> instructions. You cannot use the single-line embed.

jsfiddle_link: jsfiddle.net/shirleylberry/357yaqgc/embedded/html/
demo_link: http://video-demo.appnexus.com/pbjs/JWPlayerDemo/jwPlayerPrebid.html

code_lines: 141
code_height: 3050

pid: 31
---
<div markdown="1" style="top:175px" class="pl-doc-entry">
#### Line 9 to 12: Include your self-hosted JW Player code and license key
Load the JW Player script. Open another script tag and define your license key. Replace `abcdefghijkl` with your own license key for an account that has advertising enabled. You can find your license key in your dashboard by going to Tools (found under the Players section) and scrolling to Downloads to find JW Player 7 (Self-Hosted).
</div>

<div markdown="1" style="top:350px" class="pl-doc-entry">
#### Line 15 to 18: Pre-define `invokeVideoPlayer`
Because we have no way of knowing when all the bids will be returned from prebid we can't be sure that the browser will reach the point where `invokeVideoPlayer` is defined before bidsBackHandler fires and tries to call it. To prevent a `invokeVideoPlayer not defined` error, we pre-define it before we make the call to prebid, and redefine it later on with the code to create the player and play the ad. In this first version it simply stores the winning vast to use later.
</div>

<div markdown="1" style="top:575px" class="pl-doc-entry">
#### Line 20 to 36: Create a video ad unit
Create a video ad unit to request bids for. The `code` is the name we'll use to refer to this ad unit throughout the prebid code. Make sure you include the `mediaType: 'video'` and replace the `placementId` with your own valid placement ID.
</div>

<div markdown="1" style="top:1000px" class="pl-doc-entry">
#### Line 38 to 54: Log the bids for debugging
Log information about the bids to the console, including whether any bids were returned. This isn't strictly necessary, but is useful for debugging.
</div>

<div markdown="1" style="top:1325px" class="pl-doc-entry">
#### Line 57 to 75: Add the ad units and request bids
Add the ad units you want to request bids for to prebid, and then call `requestBids()`, passing in a json object. In the json object, define the `bidsBackHandler` callback which will run once all the bids are returned.
</div>

<div markdown="1" style="top:1500px" class="pl-doc-entry">
#### Line 62 to 69: Build masterVideoTag and call invokeVideoPlayer
Once we have the bids back, `bidsBackHandler` will be called. Inside this callback, we create the masterVideoTag and pass it to the video player by calling `invokeVideoPlayer()`.
</div>

<div markdown="1" style="top:2475px" class="pl-doc-entry">
#### Line 119: Get a reference to the player instance
Get a reference to the player by calling `jwplayer()` and passing in the id of the div you want to load the player into.
</div>

<div markdown="1" style="top:2565px" class="pl-doc-entry">
#### Line 122 to 131: Call setup on the player instance
Call `setup()` on the player instance with the settings you want. We need to pass in a media file and an advertising block with a `client` defined.
</div>

<div markdown="1" style="top:2660px" class="pl-doc-entry">
#### Line 124 to 126: Pass in Advertising
We must pass in an `"advertising"` block with a `client` in our settings in order to enable advertising for this player. We can also specify the tag or an ad schedule here but for this demo we'll insert the tag dynamically before the content plays.
</div>

<div markdown="1" style="top:2770px" class="pl-doc-entry">
#### Line 129 to 131: Play the prebid ad as a preroll
Listen for the `beforePlay()` event from the player and play the ad returned from prebid.
</div>

<div markdown="1" style="top:2850px" class="pl-doc-entry">
#### Line 134 to 137: Account for page speed
If prebid returned bids before the browser reached the end of the page, the first version of `invokeVideoPlayer` will have been called from `bidsBackHandler` so the winning vast tag will be stored in tempTag. If that's the case, we want to call the 'real' version of `invokeVideoPlayer` with the stored url to create the player and play the ad. If `tempTag` is not defined, that means the browser reached the end of the page before the bids came back from prebid, meaning the 'real' version of `invokeVideoPlayer` was already called.
</div>

