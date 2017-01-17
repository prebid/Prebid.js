---
layout: player_example
title: Brightcove Player Integration
description: Show a prebid ad in a Brightcove player

top_nav_section: dev_docs
nav_section: quick-start

hide: true
beta: true

about:
- Using invokeVideoPlayer to set up and access the Brightcove player instance.
- Using bc() to make sure all the necessary scripts are loaded before playing an ad.
- Playing an ad using Brightcove's ima3 plugin.
- Configuring the player's ima3 settings on page.

player_notes:
- For this demo we'll be configuring the player's ima3 settings on the page instead of in video cloud. Make sure you load the ima3 script and css file in addition to your player script.
- On the publish page for the video or player, choose the <b>Advanced</b> embed code (not Standard).

jsfiddle_link: jsfiddle.net/shirleylberry/dd4wd8z7/embedded/html/
demo_link: video-demo.appnexus.com/pbjs/brightcove-prebid/bc-demo.html

code_lines: 154
code_height: 3325

pid: 32
---
<div markdown="1" style="top:110px" class="pl-doc-entry">
#### Line 4: Load the ima3 css file
Load the ima3 css file to ensure the ad displays correctly in the player.
</div>

<div markdown="1" style="top:300px" class="pl-doc-entry">
#### Line 15 to 18: Pre-define `invokeVideoPlayer`
Because we have no way of knowing when all the bids will be returned from prebid we can't be sure that the browser will reach the point where `invokeVideoPlayer` is defined before bidsBackHandler fires and tries to call it. To prevent a `invokeVideoPlayer not defined` error, we pre-define it before we make the call to prebid, and redefine it later on with the code to create the player and play the ad. In this first version it simply stores the winning vast to use later.
</div>

<div markdown="1" style="top:550px" class="pl-doc-entry">
#### Line 20 to 36: Create a video ad unit
Create a video ad unit to request bids for. The `code` is the name we'll use to refer to this ad unit throughout the prebid code. Make sure you include the `mediaType: 'video'` and replace the `placementId` with your own valid placement ID.
</div>

<div markdown="1" style="top:1000px" class="pl-doc-entry">
#### Line 38 to 54: Log the bids for debugging
Log information about the bids to the console, including whether any bids were returned. This isn't strictly necessary, but is useful for debugging.
</div>

<div markdown="1" style="top:1225px" class="pl-doc-entry">
#### Line 57 to 75: Add the ad units and request bids
Add the ad units you want to request bids for to prebid, and then call `requestBids()`, passing in a json object. In the json object, define the `bidsBackHandler` callback which will run once all the bids are returned.
</div>

<div markdown="1" style="top:1400px" class="pl-doc-entry">
#### Line 62 to 69: Build masterVideoTag and call invokeVideoPlayer
Once we have the bids back, `bidsBackHandler` will be called. Inside this callback, we create the masterVideoTag and pass it to the video player by calling `invokeVideoPlayer()`.
</div>

<div markdown="1" style="top:2475px" class="pl-doc-entry">
#### Line 113 to 122: Create video element
Create your video element. You can copy paste this from the embed code in Video Cloud. Add an id tag to the player element - this is what we'll use to reference the player later.
</div>

<div markdown="1" style="top:2600px" class="pl-doc-entry">
#### Line 125 and 126: Include player and ima3 plugin scripts
First, include the player script from Brightcove. This will also be part of the embed code provided by Video Cloud. Then include the ima3 plugin script. Since we are not configuring the plugin in Video Cloud, we need to include this script on the page. 
</div>

<div markdown="1" style="top:2700px" class="pl-doc-entry">
#### Line 129 to 146: Redefine invokeVideoPlayer
Redefine `invokeVideoPlayer` to replace the temporary one we defined above. Now, `invokeVideoPlayer` will take in the winning url, create the player, and play the ad.
</div>

<div markdown="1" style="top:2775px" class="pl-doc-entry">
#### Line 130: Use bc to reference the video player
The first time we reference the player, we use the `bc()` method to ensure that all the player scripts have loaded before we add the video element to the dom or interact with it.
</div>

<div markdown="1" style="top:2850px" class="pl-doc-entry">
#### Line 130 to 137: Pass options into the ima3 plugin
Next pass in a json object of options to the player's ima3 plugin. The `url` we passed into `invokeVideoPlayer` will be the `serverUrl` we pass into the plugin.
</div>

<div markdown="1" style="top:2975px" class="pl-doc-entry">
#### Line 139 to 145: Add a `ready` listener and interact with the player
Call `videojs()` and pass in the id of the video element to get a reference to the player. Call `.ready` on the player to set up the event listener, and place any code that will interact with the player inside the callback (such as logging events for the player or ads).
</div>

<div markdown="1" style="top:3125px" class="pl-doc-entry">
#### Line 148 to 151: Account for page speed
If prebid returned bids before the browser reached the end of the page, the first version of `invokeVideoPlayer` will have been called from `bidsBackHandler` so the winning vast tag will be stored in tempTag. If that's the case, we want to call the 'real' version of `invokeVideoPlayer` with the stored url to create the player and play the ad. If `tempTag` is not defined, that means the browser reached the end of the page before the bids came back from prebid, meaning the 'real' version of `invokeVideoPlayer` was already called.
</div>
